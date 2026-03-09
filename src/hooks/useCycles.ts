/**
 * useCycles Hook - 周期管理
 *
 * 功能:
 * - 查询用户所有 37 个周期
 * - 获取当前周期
 * - 实时订阅完成度变化
 *
 * 参考: DATA_FLOW.md "3.1 Home 页面" 和 "5.2 订阅实现示例"
 */

import { useEffect, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';
import { getLocalDateString, getCycleDisplayStatus, isDateInCycle } from '../lib/utils';

type Cycle = Database['public']['Tables']['cycles']['Row'];

type CyclesCacheEntry = {
  cycles: Cycle[];
  currentCycle: Cycle | null;
  ts: number;
};

const cyclesCache = new Map<string, CyclesCacheEntry>();
const CACHE_TTL_MS = 60_000;

interface UseCyclesReturn {
  cycles: Cycle[];
  currentCycle: Cycle | null;
  loading: boolean;
  error: string | null;
  refreshCycles: () => Promise<void>;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function normalizeCycles(cycles: Cycle[]): Cycle[] {
  const byNumber = new Map<number, Cycle>();

  for (const cycle of cycles) {
    const prev = byNumber.get(cycle.cycle_number);
    if (!prev) {
      byNumber.set(cycle.cycle_number, cycle);
      continue;
    }

    const prevTime = new Date(prev.updated_at || prev.created_at).getTime();
    const currTime = new Date(cycle.updated_at || cycle.created_at).getTime();
    if (currTime >= prevTime) {
      byNumber.set(cycle.cycle_number, cycle);
    }
  }

  return Array.from(byNumber.values()).sort((a, b) => a.cycle_number - b.cycle_number);
}

function buildExpectedCycles(userId: string, year: number, existingCycles: Cycle[]) {
  const today = getLocalDateString();
  const existingByNumber = new Map(existingCycles.map((c) => [c.cycle_number, c]));

  const expected: Array<{ cycleNumber: number; payload: Database['public']['Tables']['cycles']['Insert']; existing?: Cycle }> = [];

  let currentStart = new Date(year, 0, 1);
  for (let i = 1; i <= 37; i++) {
    const isLast = i === 37;
    const end = new Date(currentStart);

    const daysInCycle = isLast
      ? Math.round((new Date(year, 11, 31).getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
      : 10;

    end.setDate(currentStart.getDate() + daysInCycle - 1);

    const startDate = formatDate(currentStart);
    const endDate = formatDate(end);

    const status: 'not_started' | 'active' | 'completed' =
      today < startDate ? 'not_started' : today > endDate ? 'completed' : 'active';

    const existing = existingByNumber.get(i);

    const needsUpsert =
      !existing ||
      existing.start_date !== startDate ||
      existing.end_date !== endDate ||
      existing.total_days !== daysInCycle ||
      existing.status !== status;

    if (needsUpsert) {
      expected.push({
        cycleNumber: i,
        existing,
        payload: {
          user_id: userId,
          cycle_number: i,
          start_date: startDate,
          end_date: endDate,
          total_days: daysInCycle,
          completion_rate: existing?.completion_rate ?? 0,
          status,
        }
      });
    }

    currentStart = new Date(end);
    currentStart.setDate(end.getDate() + 1);
  }

  return expected;
}

async function syncCyclesIfNeeded(userId: string, cycles: Cycle[]): Promise<boolean> {
  const currentYear = new Date().getFullYear();
  const expected = buildExpectedCycles(userId, currentYear, cycles);

  if (expected.length === 0) return false;

  let changed = false;

  for (const item of expected) {
    if (item.existing?.id) {
      const { error } = await supabase
        .from('cycles')
        .update(item.payload)
        .eq('id', item.existing.id)
        .eq('user_id', userId);

      if (error) {
        console.error(`Failed to update cycle ${item.cycleNumber}:`, error);
      } else {
        changed = true;
      }
    } else {
      const { error } = await supabase
        .from('cycles')
        .insert(item.payload);

      if (error) {
        console.error(`Failed to insert cycle ${item.cycleNumber}:`, error);
      } else {
        changed = true;
      }
    }
  }

  return changed;
}

function resolveCurrentCycle(cycles: Cycle[]): Cycle | null {
  if (!cycles.length) return null;

  const today = getLocalDateString();

  // 1) Prefer date window to avoid stale backend status causing wrong cycle
  // If dirty data causes overlap, choose the latest cycle_number.
  const dateMatched = cycles
    .filter((c) => isDateInCycle(c, today))
    .sort((a, b) => b.cycle_number - a.cycle_number);
  if (dateMatched.length > 0) return dateMatched[0];

  // 2) Fallback to explicit active status
  const activeByStatus = cycles.find((c) => c.status === 'active');
  if (activeByStatus) return activeByStatus;

  // 3) Final fallback: latest started cycle or first cycle
  const started = cycles
    .filter((c) => getCycleDisplayStatus(c, today) !== 'not_started')
    .sort((a, b) => b.cycle_number - a.cycle_number);

  return started[0] || cycles[0] || null;
}

export function useCycles(userId?: string): UseCyclesReturn {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [currentCycle, setCurrentCycle] = useState<Cycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const cached = cyclesCache.get(userId);
    const isFresh = cached && Date.now() - cached.ts < CACHE_TTL_MS;

    if (cached) {
      setCycles(cached.cycles);
      setCurrentCycle(cached.currentCycle);
      setLoading(false);
      // Refresh in background only when stale
      if (!isFresh) {
        fetchCycles(false);
      }
    } else {
      fetchCycles(true);
    }

    // 设置实时订阅
    const channel = subscribeToCycleChanges(userId);

    return () => {
      channel.unsubscribe();
    };
  }, [userId]);

  /**
   * 查询用户所有周期
   */
  const fetchCycles = async (showLoading = true) => {
    if (!userId) return;

    try {
      if (showLoading) setLoading(true);

      const { data, error: fetchError } = await supabase
        .from('cycles')
        .select('*')
        .eq('user_id', userId)
        .order('cycle_number', { ascending: true });

      if (fetchError) throw fetchError;

      let nextCycles = normalizeCycles(data || []);

      // 底层修复：自动补齐/纠正 37 个周期和状态
      const synced = await syncCyclesIfNeeded(userId, nextCycles);
      if (synced) {
        const { data: refreshed, error: refreshError } = await supabase
          .from('cycles')
          .select('*')
          .eq('user_id', userId)
          .order('cycle_number', { ascending: true });

        if (!refreshError) {
          nextCycles = normalizeCycles(refreshed || []);
        }
      }

      const resolvedCurrent = resolveCurrentCycle(nextCycles);
      setCycles(nextCycles);

      // 查找当前周期（优先按日期）
      setCurrentCycle(resolvedCurrent);

      cyclesCache.set(userId, {
        cycles: nextCycles,
        currentCycle: resolvedCurrent,
        ts: Date.now(),
      });

      setError(null);
    } catch (err) {
      console.error('Failed to fetch cycles:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 实时订阅周期变化
   *
   * 监听:
   * - 周期完成度更新
   * - 周期状态变化
   */
  const subscribeToCycleChanges = (userId: string): RealtimeChannel => {
    const channel = supabase
      .channel('cycle-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cycles',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // 插入/更新/删除都直接全量刷新，避免周期数量变化导致本地状态错误
          fetchCycles(false);
        }
      )
      .subscribe();

    return channel;
  };

  /**
   * 手动刷新周期数据
   */
  const refreshCycles = async () => {
    await fetchCycles();
  };

  return {
    cycles,
    currentCycle,
    loading,
    error,
    refreshCycles,
  };
}
