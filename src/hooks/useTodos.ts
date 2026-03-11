import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type TodoStatus = 'pending' | 'done' | 'dropped';

export interface TodoItem {
  id: number;
  user_id: string;
  cycle_id: number;
  content: string;
  status: TodoStatus;
  source: 'manual' | 'ai_parse';
  last_status_changed_at: string;
  created_at: string;
  updated_at: string;
}

export function useTodos(userId?: string, cycleId?: number) {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTodos = useCallback(async () => {
    if (!userId || !cycleId) {
      setTodos([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('todos' as any)
        .select('*')
        .eq('user_id', userId)
        .eq('cycle_id', cycleId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTodos((data || []) as TodoItem[]);
    } catch (e) {
      console.error('loadTodos failed', e);
      setTodos([]);
    } finally {
      setLoading(false);
    }
  }, [userId, cycleId]);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  const addTodo = useCallback(async (content: string, source: 'manual' | 'ai_parse' = 'manual') => {
    if (!userId || !cycleId || !content.trim()) return false;
    try {
      const payload = {
        user_id: userId,
        cycle_id: cycleId,
        content: content.trim(),
        status: 'pending',
        source,
        last_status_changed_at: new Date().toISOString(),
      };
      const { data, error } = await supabase.from('todos' as any).insert(payload).select('*').single();
      if (error) throw error;
      setTodos(prev => [data as TodoItem, ...prev]);
      return true;
    } catch (e) {
      console.error('addTodo failed', e);
      return false;
    }
  }, [userId, cycleId]);

  const setStatus = useCallback(async (id: number, status: TodoStatus) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('todos' as any)
        .update({ status, last_status_changed_at: now })
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
      setTodos(prev => prev.map(t => (t.id === id ? { ...t, status, last_status_changed_at: now } : t)));
      return true;
    } catch (e) {
      console.error('setStatus failed', e);
      return false;
    }
  }, [userId]);

  const deleteMany = useCallback(async (ids: number[]) => {
    if (!ids.length) return true;
    try {
      const { error } = await supabase.from('todos' as any).delete().in('id', ids).eq('user_id', userId);
      if (error) throw error;
      setTodos(prev => prev.filter(t => !ids.includes(t.id)));
      return true;
    } catch (e) {
      console.error('deleteMany failed', e);
      return false;
    }
  }, [userId]);

  const submitTodosToRecords = useCallback(async (params: {
    dimensionId: number;
    currentCycleId: number;
    submitType?: 'manual' | 'auto_cycle_rollover';
  }) => {
    if (!userId) return { ok: false, count: 0 };

    const target = todos.filter(t => t.status === 'done' || t.status === 'dropped');
    if (!target.length) return { ok: true, count: 0 };

    try {
      const { data: submission, error: subErr } = await supabase
        .from('todo_submissions' as any)
        .insert({
          user_id: userId,
          cycle_id: params.currentCycleId,
          submit_type: params.submitType || 'manual',
          submitted_at: new Date().toISOString(),
        })
        .select('*')
        .single();
      if (subErr) throw subErr;

      let count = 0;
      for (const item of target) {
        const text = item.status === 'dropped' ? `[已放弃] ${item.content}` : item.content;
        const recordDate = new Date(item.last_status_changed_at).toISOString().slice(0, 10);

        const { data: record, error: recordErr } = await supabase
          .from('records' as any)
          .insert({
            user_id: userId,
            cycle_id: item.cycle_id,
            dimension_id: params.dimensionId,
            record_date: recordDate,
            content: text,
            word_count: text.length,
            status: 'published',
          })
          .select('*')
          .single();
        if (recordErr) throw recordErr;

        const { error: mapErr } = await supabase
          .from('todo_submission_items' as any)
          .insert({
            submission_id: submission.id,
            todo_id: item.id,
            record_id: record.id,
            status_at_submit: item.status,
            event_time: item.last_status_changed_at,
          });
        if (mapErr) throw mapErr;
        count++;
      }

      return { ok: true, count };
    } catch (e) {
      console.error('submitTodosToRecords failed', e);
      return { ok: false, count: 0 };
    }
  }, [todos, userId]);

  return {
    todos,
    loading,
    loadTodos,
    addTodo,
    setStatus,
    deleteMany,
    submitTodosToRecords,
  };
}
