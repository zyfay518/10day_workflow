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
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';
import { getLocalDateString } from '../lib/utils';

type Cycle = Database['public']['Tables']['cycles']['Row'];

interface UseCyclesReturn {
  cycles: Cycle[];
  currentCycle: Cycle | null;
  loading: boolean;
  error: string | null;
  refreshCycles: () => Promise<void>;
}

function resolveCurrentCycle(cycles: Cycle[]): Cycle | null {
  if (!cycles.length) return null;

  const today = getLocalDateString();

  // 1) Prefer date window to avoid stale backend status causing wrong cycle
  const byDate = cycles.find((c) => c.start_date <= today && c.end_date >= today);
  if (byDate) return byDate;

  // 2) Fallback to explicit active status
  const activeByStatus = cycles.find((c) => c.status === 'active');
  if (activeByStatus) return activeByStatus;

  // 3) Final fallback: latest started cycle or first cycle
  const started = cycles
    .filter((c) => c.start_date <= today)
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

    fetchCycles();

    // 设置实时订阅
    const channel = subscribeToCycleChanges(userId);

    return () => {
      channel.unsubscribe();
    };
  }, [userId]);

  /**
   * 查询用户所有周期
   */
  const fetchCycles = async () => {
    if (!userId) return;

    try {
      setLoading(true);

      const { data, error: fetchError } = await supabase
        .from('cycles')
        .select('*')
        .eq('user_id', userId)
        .order('cycle_number', { ascending: true });

      if (fetchError) throw fetchError;

      const nextCycles = data || [];
      setCycles(nextCycles);

      // 查找当前周期（优先 active，兜底按日期）
      setCurrentCycle(resolveCurrentCycle(nextCycles));

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
          event: 'UPDATE',
          schema: 'public',
          table: 'cycles',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updatedCycle = payload.new as Cycle;

          // 更新本地周期列表并重新推导当前周期
          setCycles((prev) => {
            const next = prev.map((c) => (c.id === updatedCycle.id ? updatedCycle : c));
            setCurrentCycle(resolveCurrentCycle(next));
            return next;
          });
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
