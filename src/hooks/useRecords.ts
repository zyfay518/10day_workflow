/**
 * useRecords Hook - 记录管理
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
  saveRecord: (content: string, status?: 'draft' | 'published') => Promise<Record | null>;
  deleteRecord: (id: number) => Promise<boolean>;
}

type CacheEntry = { item: Record | null; ts: number };
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<void>>();
const TTL_MS = 60_000;

function k(userId: string, cycleId: number, dimensionId: number, date: string) {
  return `record_cache_${userId}_${cycleId}_${dimensionId}_${date}`;
}

function read(key: string): CacheEntry | null {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function write(key: string, entry: CacheEntry) { try { localStorage.setItem(key, JSON.stringify(entry)); } catch {} }

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

    const key = k(userId, cycleId, dimensionId, date);
    const cached = cache.get(key) || read(key);
    const fresh = cached && Date.now() - cached.ts < TTL_MS;

    if (cached) {
      setRecord(cached.item);
      setLoading(false);
      if (!fresh) fetchRecord(false);
    } else {
      fetchRecord(true);
    }
  }, [userId, cycleId, dimensionId, date]);

  const fetchRecord = async (showLoading = true) => {
    if (!userId || !cycleId || !dimensionId || !date) return;

    const key = k(userId, cycleId, dimensionId, date);
    const existing = inflight.get(key);
    if (existing) { await existing; return; }

    const task = (async () => {
      try {
        if (showLoading) setLoading(true);

        const { data, error: fetchError } = await supabase
          .from('records')
          .select('*')
          .eq('user_id', userId)
          .eq('cycle_id', cycleId)
          .eq('dimension_id', dimensionId)
          .eq('record_date', date)
          .maybeSingle();

        if (fetchError) throw fetchError;

        setRecord(data);
        const entry = { item: data, ts: Date.now() };
        cache.set(key, entry);
        write(key, entry);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch record:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    })();

    inflight.set(key, task);
    try { await task; } finally { inflight.delete(key); }
  };

  const saveRecord = async (
    content: string,
    status: 'draft' | 'published' = 'published'
  ): Promise<Record | null> => {
    if (!userId || !cycleId || !dimensionId || !date) {
      setError('Missing required parameters');
      return null;
    }

    try {
      setSaving(true);
      const wordCount = content.length;
      let savedData;

      if (record) {
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
        savedData = data;
        setRecord(data);
      } else {
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
        savedData = data;
        setRecord(data);
      }

      setError(null);
      return savedData;
    } catch (err) {
      console.error('Failed to save record:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setSaving(false);
    }
  };

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
