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

type Cycle = Database['public']['Tables']['cycles']['Row'];

interface UseCyclesReturn {
  cycles: Cycle[];
  currentCycle: Cycle | null;
  loading: boolean;
  error: string | null;
  refreshCycles: () => Promise<void>;
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

      setCycles(data || []);

      // 查找当前周期
      const current = data?.find((c) => c.status === 'active') || null;
      setCurrentCycle(current);

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

          // 更新本地周期列表
          setCycles((prev) =>
            prev.map((c) => (c.id === updatedCycle.id ? updatedCycle : c))
          );

          // 更新当前周期
          if (updatedCycle.status === 'active') {
            setCurrentCycle(updatedCycle);
          }
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
