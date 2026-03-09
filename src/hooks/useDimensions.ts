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

type DimensionsCacheEntry = { dimensions: Dimension[]; ts: number };
const dimensionsCache = new Map<string, DimensionsCacheEntry>();
const dimensionsInflight = new Map<string, Promise<void>>();
const DIM_CACHE_TTL_MS = 60_000;

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

    const cached = dimensionsCache.get(userId);
    const isFresh = cached && Date.now() - cached.ts < DIM_CACHE_TTL_MS;

    if (cached) {
      setDimensions(cached.dimensions);
      setLoading(false);
      if (!isFresh) fetchDimensions(false);
    } else {
      fetchDimensions(true);
    }
  }, [userId]);

  /**
   * 查询用户的维度
   */
  const fetchDimensions = async (showLoading = true) => {
    if (!userId) return;

    const existingReq = dimensionsInflight.get(userId);
    if (existingReq) {
      await existingReq;
      return;
    }

    const task = (async () => {
      try {
        if (showLoading) setLoading(true);

        const { data, error: fetchError } = await supabase
          .from('dimensions')
          .select('*')
          .eq('user_id', userId)
          .order('display_order', { ascending: true });

        if (fetchError) throw fetchError;

        let next = data || [];

      const defaults = [
        { dimension_name: 'Health', color_code: '#d4b5b0', icon_name: 'health_and_safety', display_order: 0 },
        { dimension_name: 'Work', color_code: '#849b87', icon_name: 'work', display_order: 1 },
        { dimension_name: 'Study', color_code: '#a3b8a6', icon_name: 'auto_stories', display_order: 2 },
        { dimension_name: 'Wealth', color_code: '#e8d5c4', icon_name: 'payments', display_order: 3 },
        { dimension_name: 'Family', color_code: '#c49eb3', icon_name: 'diversity_3', display_order: 4 },
        { dimension_name: 'Other', color_code: '#9ca3af', icon_name: 'lightbulb', display_order: 5 },
      ];

      // 1) Remove duplicate dimensions (same name) - keep earliest display_order/id
      const grouped = new Map<string, Dimension[]>();
      for (const d of next) {
        const key = d.dimension_name.trim().toLowerCase();
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(d);
      }

      const duplicateIds: number[] = [];
      for (const [, arr] of grouped) {
        if (arr.length > 1) {
          arr.sort((a, b) => (a.display_order - b.display_order) || (a.id - b.id));
          arr.slice(1).forEach((d) => duplicateIds.push(d.id));
        }
      }

      if (duplicateIds.length > 0) {
        const { error: deleteDupError } = await supabase
          .from('dimensions')
          .delete()
          .in('id', duplicateIds)
          .eq('user_id', userId);
        if (deleteDupError) throw deleteDupError;
      }

      // 2) Ensure missing defaults are created (only missing ones)
      const existingNames = new Set(next.map((d) => d.dimension_name.trim().toLowerCase()));
      const missing = defaults
        .filter((d) => !existingNames.has(d.dimension_name.toLowerCase()))
        .map((d) => ({ user_id: userId, ...d }));

      if (missing.length > 0) {
        const { error: createError } = await supabase
          .from('dimensions')
          .insert(missing);
        if (createError) throw createError;
      }

      // 3) Reload normalized dimensions for stable UI
      if (duplicateIds.length > 0 || missing.length > 0) {
        const { data: refreshed, error: refetchError } = await supabase
          .from('dimensions')
          .select('*')
          .eq('user_id', userId)
          .order('display_order', { ascending: true });
        if (refetchError) throw refetchError;
        next = refreshed || [];
      }

      setDimensions(next);
      dimensionsCache.set(userId, { dimensions: next, ts: Date.now() });
      setError(null);
      } catch (err) {
        console.error('Failed to fetch dimensions:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    })();

    dimensionsInflight.set(userId, task);
    try {
      await task;
    } finally {
      dimensionsInflight.delete(userId);
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
