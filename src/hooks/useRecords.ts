/**
 * useRecords Hook - 记录管理
 *
 * 功能:
 * - 查询指定日期和维度的记录
 * - 保存/更新记录 (upsert 逻辑)
 * - 自动更新周期完成度 (通过数据库 Trigger)
 *
 * 参考: DATA_FLOW.md "3.2.3 保存记录流程"
 */

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Record = Database['public']['Tables']['records']['Row'];
type RecordInsert = Database['public']['Tables']['records']['Insert'];

interface UseRecordsParams {
  userId?: string;
  cycleId?: number;
  dimensionId?: number;
  date?: string; // YYYY-MM-DD
}

interface UseRecordsReturn {
  record: Record | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  saveRecord: (content: string, status?: 'draft' | 'published') => Promise<boolean>;
  deleteRecord: (id: number) => Promise<boolean>;
}

export function useRecords(params: UseRecordsParams): UseRecordsReturn {
  const { userId, cycleId, dimensionId, date } = params;

  const [record, setRecord] = useState<Record | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !cycleId || !dimensionId || !date) {
      setLoading(false);
      return;
    }

    fetchRecord();
  }, [userId, cycleId, dimensionId, date]);

  /**
   * 查询指定日期的记录
   */
  const fetchRecord = async () => {
    if (!userId || !cycleId || !dimensionId || !date) return;

    try {
      setLoading(true);

      const { data, error: fetchError } = await supabase
        .from('records')
        .select('*')
        .eq('user_id', userId)
        .eq('cycle_id', cycleId)
        .eq('dimension_id', dimensionId)
        .eq('record_date', date)
        .maybeSingle(); // 可能不存在

      if (fetchError) throw fetchError;

      setRecord(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch record:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 保存/更新记录
   *
   * 使用 upsert 逻辑:
   * - 如果记录存在,则更新
   * - 如果记录不存在,则插入
   *
   * @param content - 记录内容
   * @param status - 记录状态 (默认: published)
   * @returns 是否成功
   */
  const saveRecord = async (
    content: string,
    status: 'draft' | 'published' = 'published'
  ): Promise<boolean> => {
    if (!userId || !cycleId || !dimensionId || !date) {
      setError('Missing required parameters');
      return false;
    }

    try {
      setSaving(true);

      const wordCount = content.length;

      if (record) {
        // 更新现有记录
        const { data, error: updateError } = await supabase
          .from('records')
          .update({
            content,
            word_count: wordCount,
            status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', record.id)
          .select()
          .single();

        if (updateError) throw updateError;

        setRecord(data);
      } else {
        // 插入新记录
        const newRecord: RecordInsert = {
          user_id: userId,
          cycle_id: cycleId,
          dimension_id: dimensionId,
          record_date: date,
          content,
          word_count: wordCount,
          status,
        };

        const { data, error: insertError } = await supabase
          .from('records')
          .insert(newRecord)
          .select()
          .single();

        if (insertError) throw insertError;

        setRecord(data);
      }

      setError(null);
      return true;
    } catch (err) {
      console.error('Failed to save record:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  /**
   * 删除记录
   */
  const deleteRecord = async (id: number): Promise<boolean> => {
    try {
      setSaving(true);
      const { error: deleteError } = await supabase
        .from('records')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      if (record?.id === id) {
        setRecord(null);
      }
      return true;
    } catch (err) {
      console.error('Failed to delete record:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    record,
    loading,
    saving,
    error,
    saveRecord,
    deleteRecord,
  };
}
