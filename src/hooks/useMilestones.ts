import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Milestone = Database['public']['Tables']['milestones']['Row'];
type MilestoneInsert = Database['public']['Tables']['milestones']['Insert'];
type MilestoneUpdate = Database['public']['Tables']['milestones']['Update'];

type CacheEntry = { items: Milestone[]; ts: number };
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<void>>();
const TTL_MS = 60_000;
const key = (userId: string) => `milestones_cache_${userId}`;

function read(userId: string): CacheEntry | null { try { const raw = localStorage.getItem(key(userId)); return raw ? JSON.parse(raw) : null; } catch { return null; } }
function write(userId: string, entry: CacheEntry) { try { localStorage.setItem(key(userId), JSON.stringify(entry)); } catch {} }

export function useMilestones(userId?: string) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMilestones = useCallback(async (showLoading = true) => {
    if (!userId) {
      setMilestones([]);
      return;
    }

    const existing = inflight.get(userId);
    if (existing) { await existing; return; }

    const task = (async () => {
      try {
        if (showLoading) setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('milestones')
          .select('*')
          .eq('user_id', userId)
          .order('event_date', { ascending: false });

        if (fetchError) throw fetchError;
        const rows = data || [];
        setMilestones(rows);
        const entry = { items: rows, ts: Date.now() };
        cache.set(userId, entry);
        write(userId, entry);
      } catch (err) {
        setError('Failed to load milestones');
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();

    inflight.set(userId, task);
    try { await task; } finally { inflight.delete(userId); }
  }, [userId]);

  useEffect(() => {
    if (!userId) { setMilestones([]); return; }
    const cached = cache.get(userId) || read(userId);
    const fresh = cached && Date.now() - cached.ts < TTL_MS;
    if (cached) {
      setMilestones(cached.items);
      setLoading(false);
      if (!fresh) loadMilestones(false);
    } else {
      loadMilestones(true);
    }
  }, [userId, loadMilestones]);

  const addMilestone = async (milestone: Omit<MilestoneInsert, 'id' | 'created_at' | 'updated_at'>) => {
    if (!userId) return null;

    try {
      const { data, error: insertError } = await supabase
        .from('milestones')
        .insert([{ ...milestone, user_id: userId }])
        .select()
        .single();

      if (insertError) throw insertError;
      setMilestones(prev => [data, ...prev]);
      return data;
    } catch (err) {
      setError('Failed to add milestone');
      console.error(err);
      return null;
    }
  };

  const updateMilestone = async (id: number, updates: MilestoneUpdate) => {
    try {
      const { data, error: updateError } = await supabase
        .from('milestones')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      setMilestones(prev => prev.map(m => (m.id === id ? data : m)));
      return true;
    } catch (err) {
      setError('Failed to update milestone');
      console.error(err);
      return false;
    }
  };

  const deleteMilestone = async (id: number) => {
    try {
      const { error: deleteError } = await supabase
        .from('milestones')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      setMilestones(prev => prev.filter(m => m.id !== id));
      return true;
    } catch (err) {
      setError('Failed to delete milestone');
      console.error(err);
      return false;
    }
  };

  return {
    milestones,
    loading,
    error,
    refreshMilestones: () => loadMilestones(true),
    addMilestone,
    updateMilestone,
    deleteMilestone
  };
}
