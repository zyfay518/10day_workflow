import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type CycleGoal = Database['public']['Tables']['cycle_goals']['Row'];
type DailyGoal = Database['public']['Tables']['daily_goals']['Row'];

type CacheEntry<T> = { items: T[]; ts: number };
const TTL_MS = 60_000;

const cycleCache = new Map<string, CacheEntry<CycleGoal>>();
const cycleInflight = new Map<string, Promise<void>>();
const dailyCache = new Map<string, CacheEntry<DailyGoal>>();
const dailyInflight = new Map<string, Promise<void>>();

const cycleKey = (userId: string, cycleId: number) => `cycle_goals_cache_${userId}_${cycleId}`;
const dailyKey = (userId: string, date: string) => `daily_goals_cache_${userId}_${date}`;

function readCache<T>(key: string): CacheEntry<T> | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as CacheEntry<T>) : null;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, entry: CacheEntry<T>) {
  try { localStorage.setItem(key, JSON.stringify(entry)); } catch {}
}

export function useCycleGoals(userId: string | undefined, cycleId: number | undefined) {
  const [goals, setGoals] = useState<CycleGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGoals = useCallback(async (showLoading = true) => {
    if (!userId || !cycleId) {
      setGoals([]);
      setLoading(false);
      return;
    }

    const reqKey = `${userId}:${cycleId}`;
    const existing = cycleInflight.get(reqKey);
    if (existing) {
      await existing;
      return;
    }

    const task = (async () => {
      try {
        if (showLoading) setLoading(true);
        const { data, error } = await supabase
          .from('cycle_goals')
          .select('*')
          .eq('user_id', userId)
          .eq('cycle_id', cycleId);

        if (error) throw error;
        const rows = data || [];
        setGoals(rows);
        const entry = { items: rows, ts: Date.now() };
        cycleCache.set(reqKey, entry);
        writeCache(cycleKey(userId, cycleId), entry);
      } catch (err) {
        console.error('Failed to load cycle goals:', err);
      } finally {
        setLoading(false);
      }
    })();

    cycleInflight.set(reqKey, task);
    try { await task; } finally { cycleInflight.delete(reqKey); }
  }, [userId, cycleId]);

  useEffect(() => {
    if (!userId || !cycleId) {
      setGoals([]);
      setLoading(false);
      return;
    }

    const key = `${userId}:${cycleId}`;
    const cached = cycleCache.get(key) || readCache<CycleGoal>(cycleKey(userId, cycleId));
    const isFresh = cached && Date.now() - cached.ts < TTL_MS;

    if (cached) {
      setGoals(cached.items);
      setLoading(false);
      if (!isFresh) loadGoals(false);
    } else {
      loadGoals(true);
    }
  }, [userId, cycleId, loadGoals]);

  const addGoal = async (goalData: Omit<CycleGoal, 'id' | 'created_at' | 'updated_at'>) => {
    if (!userId || !cycleId) return null;
    try {
      const { data, error } = await supabase
        .from('cycle_goals')
        .insert([{ ...goalData, user_id: userId, cycle_id: cycleId }])
        .select()
        .single();

      if (error) throw error;
      setGoals(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('Failed to add cycle goal:', err);
      return null;
    }
  };

  const updateGoal = async (id: number, updates: Partial<Omit<CycleGoal, 'id' | 'user_id' | 'created_at'>>) => {
    try {
      const { data, error } = await supabase
        .from('cycle_goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setGoals(prev => prev.map(g => (g.id === id ? data : g)));
      return data;
    } catch (err) {
      console.error('Failed to update cycle goal:', err);
      return null;
    }
  };

  const deleteGoal = async (id: number) => {
    try {
      const { error } = await supabase
        .from('cycle_goals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setGoals(prev => prev.filter(g => g.id !== id));
      return true;
    } catch (err) {
      console.error('Failed to delete cycle goal:', err);
      return false;
    }
  };

  return {
    goals,
    loading,
    addGoal,
    updateGoal,
    deleteGoal,
    refreshGoals: () => loadGoals(true),
  };
}

export function useDailyGoals(userId: string | undefined, date: string | undefined) {
  const [goals, setGoals] = useState<DailyGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGoals = useCallback(async (showLoading = true) => {
    if (!userId || !date) {
      setGoals([]);
      setLoading(false);
      return;
    }

    const reqKey = `${userId}:${date}`;
    const existing = dailyInflight.get(reqKey);
    if (existing) {
      await existing;
      return;
    }

    const task = (async () => {
      try {
        if (showLoading) setLoading(true);
        const { data, error } = await supabase
          .from('daily_goals')
          .select('*')
          .eq('user_id', userId)
          .eq('goal_date', date);

        if (error) throw error;
        const rows = data || [];
        setGoals(rows);
        const entry = { items: rows, ts: Date.now() };
        dailyCache.set(reqKey, entry);
        writeCache(dailyKey(userId, date), entry);
      } catch (err) {
        console.error('Failed to load daily goals:', err);
      } finally {
        setLoading(false);
      }
    })();

    dailyInflight.set(reqKey, task);
    try { await task; } finally { dailyInflight.delete(reqKey); }
  }, [userId, date]);

  useEffect(() => {
    if (!userId || !date) {
      setGoals([]);
      setLoading(false);
      return;
    }

    const key = `${userId}:${date}`;
    const cached = dailyCache.get(key) || readCache<DailyGoal>(dailyKey(userId, date));
    const isFresh = cached && Date.now() - cached.ts < TTL_MS;

    if (cached) {
      setGoals(cached.items);
      setLoading(false);
      if (!isFresh) loadGoals(false);
    } else {
      loadGoals(true);
    }
  }, [userId, date, loadGoals]);

  const addGoal = async (goalData: Omit<DailyGoal, 'id' | 'created_at' | 'updated_at'>) => {
    if (!userId) return null;
    try {
      const { data, error } = await supabase
        .from('daily_goals')
        .insert([{ ...goalData, user_id: userId }])
        .select()
        .single();

      if (error) throw error;
      setGoals(prev => [...prev, data]);
      return data;
    } catch (err) {
      console.error('Failed to add daily goal:', err);
      return null;
    }
  };

  const updateGoal = async (id: number, updates: Partial<Omit<DailyGoal, 'id' | 'user_id' | 'created_at'>>) => {
    try {
      const { data, error } = await supabase
        .from('daily_goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setGoals(prev => prev.map(g => (g.id === id ? data : g)));
      return data;
    } catch (err) {
      console.error('Failed to update daily goal:', err);
      return null;
    }
  };

  const deleteGoal = async (id: number) => {
    try {
      const { error } = await supabase
        .from('daily_goals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setGoals(prev => prev.filter(g => g.id !== id));
      return true;
    } catch (err) {
      console.error('Failed to delete daily goal:', err);
      return false;
    }
  };

  return {
    goals,
    loading,
    addGoal,
    updateGoal,
    deleteGoal,
    refreshGoals: () => loadGoals(true),
  };
}
