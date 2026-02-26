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

  const loadExpenses = useCallback(async () => {
    if (!params?.userId || !params?.startDate || !params?.endDate) return;

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', params.userId)
        .gte('expense_date', params.startDate)
        .lte('expense_date', params.endDate)
        .order('expense_date', { ascending: false });

      if (fetchError) throw fetchError;
      setExpenses(data || []);
    } catch (err) {
      console.error('Failed to load expenses:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    if (params?.userId && params?.startDate && params?.endDate) {
      loadExpenses();
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
