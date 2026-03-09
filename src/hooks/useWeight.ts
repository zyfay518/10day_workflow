import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type WeightRecord = Database['public']['Tables']['weight_records']['Row'];

type CacheEntry = { items: WeightRecord[]; ts: number };
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<void>>();
const TTL_MS = 60_000;
const key = (userId: string) => `weights_cache_${userId}`;

function read(userId: string): CacheEntry | null { try { const raw = localStorage.getItem(key(userId)); return raw ? JSON.parse(raw) : null; } catch { return null; } }
function write(userId: string, entry: CacheEntry) { try { localStorage.setItem(key(userId), JSON.stringify(entry)); } catch {} }

export function useWeight(userId?: string) {
  const [weights, setWeights] = useState<WeightRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWeights = useCallback(async (showLoading = true) => {
    if (!userId) {
      setWeights([]);
      return;
    }

    const existing = inflight.get(userId);
    if (existing) { await existing; return; }

    const task = (async () => {
      try {
        if (showLoading) setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('weight_records')
          .select('*')
          .eq('user_id', userId)
          .order('record_date', { ascending: true });

        if (fetchError) throw fetchError;
        const rows = data || [];
        setWeights(rows);
        const entry = { items: rows, ts: Date.now() };
        cache.set(userId, entry);
        write(userId, entry);
      } catch (err) {
        setError('Failed to load weight records');
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();

    inflight.set(userId, task);
    try { await task; } finally { inflight.delete(userId); }
  }, [userId]);

  useEffect(() => {
    if (!userId) { setWeights([]); return; }
    const cached = cache.get(userId) || read(userId);
    const fresh = cached && Date.now() - cached.ts < TTL_MS;
    if (cached) {
      setWeights(cached.items);
      setLoading(false);
      if (!fresh) loadWeights(false);
    } else {
      loadWeights(true);
    }
  }, [userId, loadWeights]);

  const addWeight = async (weight_kg: number, record_date: string, notes?: string) => {
    if (!userId) return null;

    try {
      const { data, error: insertError } = await supabase
        .from('weight_records')
        .insert([{ user_id: userId, weight_kg, record_date, notes: notes || null }])
        .select()
        .single();

      if (insertError) throw insertError;

      setWeights(prev => [...prev, data]);
      return data;
    } catch (err) {
      setError('Failed to add weight');
      console.error(err);
      return null;
    }
  };

  const deleteWeight = async (id: number) => {
    if (!userId) return false;

    try {
      const { error: deleteError } = await supabase
        .from('weight_records')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setWeights(prev => prev.filter(w => w.id !== id));
      return true;
    } catch (err) {
      setError('Failed to delete weight');
      console.error(err);
      return false;
    }
  };

  return {
    weights,
    loading,
    error,
    refreshWeights: () => loadWeights(true),
    addWeight,
    deleteWeight
  };
}
