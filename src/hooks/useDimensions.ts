/**
 * useDimensions Hook - 维度管理
 *
 * 功能:
 * - 查询用户的 5 个维度
 * - 更新维度配置 (名称、图标、颜色)
 *
 * 参考: DATA_FLOW.md "3.6.2 维度自定义"
 */

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Dimension = Database['public']['Tables']['dimensions']['Row'];

interface UseDimensionsReturn {
  dimensions: Dimension[];
  loading: boolean;
  error: string | null;
  updateDimension: (
    dimensionId: number,
    updates: Partial<Dimension>
  ) => Promise<boolean>;
}

export function useDimensions(userId?: string): UseDimensionsReturn {
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    fetchDimensions();
  }, [userId]);

  /**
   * 查询用户的维度
   */
  const fetchDimensions = async () => {
    if (!userId) return;

    try {
      setLoading(true);

      const { data, error: fetchError } = await supabase
        .from('dimensions')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true });

      if (fetchError) throw fetchError;

      setDimensions(data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch dimensions:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 更新维度配置
   *
   * @param dimensionId - 维度 ID
   * @param updates - 要更新的字段
   * @returns 是否成功
   */
  const updateDimension = async (
    dimensionId: number,
    updates: Partial<Dimension>
  ): Promise<boolean> => {
    if (!userId) return false;

    try {
      const { error: updateError } = await supabase
        .from('dimensions')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dimensionId)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      // 更新本地状态
      setDimensions((prev) =>
        prev.map((d) => (d.id === dimensionId ? { ...d, ...updates } : d))
      );

      setError(null);
      return true;
    } catch (err) {
      console.error('Failed to update dimension:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  return {
    dimensions,
    loading,
    error,
    updateDimension,
  };
}
