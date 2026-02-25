/**
 * useRecords Hook - 本地存储版本
 */

import { useEffect, useState } from 'react';
import { localRecords } from '../lib/localStorage';
import { Database } from '../types/database';

type Record = Database['public']['Tables']['records']['Row'];

interface UseRecordsParams {
  userId?: string;
  cycleId?: number;
  dimensionId?: number;
  date?: string;
}

interface UseRecordsReturn {
  record: Record | null;
  loading: boolean;
  saving: boolean;
  saveRecord: (content: string, status?: 'draft' | 'published') => boolean;
}

export function useRecords(params: UseRecordsParams): UseRecordsReturn {
  const { userId, cycleId, dimensionId, date } = params;

  const [record, setRecord] = useState<Record | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId || !cycleId || !dimensionId || !date) {
      setLoading(false);
      return;
    }

    const existingRecord = localRecords.get({ userId, cycleId, dimensionId, date });
    setRecord(existingRecord);
    setLoading(false);
  }, [userId, cycleId, dimensionId, date]);

  const saveRecord = (content: string, status: 'draft' | 'published' = 'published'): boolean => {
    if (!userId || !cycleId || !dimensionId || !date) {
      return false;
    }

    setSaving(true);

    try {
      const savedRecord = localRecords.save(
        { userId, cycleId, dimensionId, date },
        content,
        status
      );
      setRecord(savedRecord);
      return true;
    } catch (error) {
      console.error('保存记录失败:', error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    record,
    loading,
    saving,
    saveRecord,
  };
}
