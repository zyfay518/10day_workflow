import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Expense = Database['public']['Tables']['expenses']['Row'];
type ExpenseInsert = Database['public']['Tables']['expenses']['Insert'];

interface ParsedExpense {
  amount: number;
  category: string;
  merchant?: string;
  date?: string;
}

type CacheEntry = { items: Expense[]; ts: number };
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<void>>();
const TTL_MS = 60_000;
const key = (userId: string, start: string, end: string) => `expenses_cache_${userId}_${start}_${end}`;

function read(k: string): CacheEntry | null { try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : null; } catch { return null; } }
function write(k: string, entry: CacheEntry) { try { localStorage.setItem(k, JSON.stringify(entry)); } catch {} }

export function useExpenses(params?: {
  userId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadExpenses = useCallback(async (showLoading = true) => {
    if (!params?.userId || !params?.startDate || !params?.endDate) return;

    const cacheId = key(params.userId, params.startDate, params.endDate);
    const reqId = `${params.userId}:${params.startDate}:${params.endDate}`;

    const existing = inflight.get(reqId);
    if (existing) { await existing; return; }

    const task = (async () => {
      try {
        if (showLoading) setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('expenses')
          .select('*')
          .eq('user_id', params.userId)
          .gte('expense_date', params.startDate)
          .lte('expense_date', params.endDate)
          .order('expense_date', { ascending: false });

        if (fetchError) throw fetchError;
        const rows = data || [];
        setExpenses(rows);
        const entry = { items: rows, ts: Date.now() };
        cache.set(reqId, entry);
        write(cacheId, entry);
      } catch (err) {
        console.error('Failed to load expenses:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    })();

    inflight.set(reqId, task);
    try { await task; } finally { inflight.delete(reqId); }
  }, [params]);

  useEffect(() => {
    if (!params?.userId || !params?.startDate || !params?.endDate) return;

    const reqId = `${params.userId}:${params.startDate}:${params.endDate}`;
    const cached = cache.get(reqId) || read(key(params.userId, params.startDate, params.endDate));
    const fresh = cached && Date.now() - cached.ts < TTL_MS;

    if (cached) {
      setExpenses(cached.items);
      setLoading(false);
      if (!fresh) loadExpenses(false);
    } else {
      loadExpenses(true);
    }
  }, [params, loadExpenses]);

  const saveExpense = async (expense: ExpenseInsert): Promise<boolean> => {
    const userId = params?.userId || expense.user_id;
    if (!userId) {
      setError('User not authenticated');
      return false;
    }

    try {
      setSaving(true);
      setError(null);

      const { data, error: insertError } = await supabase
        .from('expenses')
        .insert({
          ...expense,
          user_id: userId,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setExpenses(prev => [(data as Expense), ...prev]);
      return true;
    } catch (err) {
      console.error('Failed to save expense:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveExpenses = async (items: ExpenseInsert[]): Promise<boolean> => {
    if (!items.length) return true;
    const userId = params?.userId || items[0].user_id;
    if (!userId) {
      setError('User not authenticated');
      return false;
    }

    try {
      setSaving(true);
      setError(null);

      const { data, error: insertError } = await supabase
        .from('expenses')
        .insert(items.map(item => ({ ...item, user_id: userId })))
        .select();

      if (insertError) throw insertError;

      setExpenses(prev => [...((data || []) as Expense[]), ...prev]);
      return true;
    } catch (err) {
      console.error('Failed to save expenses:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const getExpensesByDateRange = useCallback(async (start: string, end: string): Promise<Expense[]> => {
    if (!params?.userId) return [];
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', params.userId)
      .gte('expense_date', start)
      .lte('expense_date', end);
    return (data || []) as Expense[];
  }, [params?.userId]);

  const getTotalByCategory = useCallback((category: string): number => {
    return expenses.filter(e => e.category === category).reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const getTotalAmount = useCallback((): number => {
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  return {
    expenses,
    loading,
    parsing,
    saving,
    error,
    saveExpense,
    saveExpenses,
    getExpensesByDateRange,
    getTotalByCategory,
    getTotalAmount,
    loadExpenses,
  };
}
