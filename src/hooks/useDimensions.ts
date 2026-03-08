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
        .order('display_order', { ascending: true });

      if (fetchError) throw fetchError;

      let next = data || [];

      // Auto-provision defaults when user data was cleaned
      if (next.length === 0) {
        const defaults = [
          { user_id: userId, dimension_name: 'Health', color_code: '#d4b5b0', icon_name: 'health_and_safety', display_order: 0 },
          { user_id: userId, dimension_name: 'Work', color_code: '#849b87', icon_name: 'work', display_order: 1 },
          { user_id: userId, dimension_name: 'Study', color_code: '#a3b8a6', icon_name: 'auto_stories', display_order: 2 },
          { user_id: userId, dimension_name: 'Wealth', color_code: '#e8d5c4', icon_name: 'payments', display_order: 3 },
          { user_id: userId, dimension_name: 'Family', color_code: '#c49eb3', icon_name: 'diversity_3', display_order: 4 },
          { user_id: userId, dimension_name: 'Other', color_code: '#9ca3af', icon_name: 'lightbulb', display_order: 5 },
        ];

        const { data: created, error: createError } = await supabase
          .from('dimensions')
          .insert(defaults)
          .select('*')
          .order('display_order', { ascending: true });

        if (createError) throw createError;
        next = created || [];
      }

      setDimensions(next);
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
