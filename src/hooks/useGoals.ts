import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type CycleGoal = Database['public']['Tables']['cycle_goals']['Row'];
type DailyGoal = Database['public']['Tables']['daily_goals']['Row'];

export function useCycleGoals(userId: string | undefined, cycleId: number | undefined) {
    const [goals, setGoals] = useState<CycleGoal[]>([]);
    const [loading, setLoading] = useState(true);

    const loadGoals = useCallback(async () => {
        if (!userId || !cycleId) {
            setGoals([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('cycle_goals')
                .select('*')
                .eq('user_id', userId)
                .eq('cycle_id', cycleId);

            if (error) throw error;
            setGoals(data || []);
        } catch (err) {
            console.error('Failed to load cycle goals:', err);
        } finally {
            setLoading(false);
        }
    }, [userId, cycleId]);

    useEffect(() => {
        loadGoals();
    }, [loadGoals]);

    const addGoal = async (goalData: Omit<CycleGoal, 'id' | 'created_at' | 'updated_at'>) => {
        if (!userId || !cycleId) return null;
        try {
            const { data, error } = await supabase
                .from('cycle_goals')
                .insert([{ ...goalData, user_id: userId, cycle_id: cycleId }])
                .select()
                .single();

            if (error) throw error;
            setGoals(prev => [...prev, data]);
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

    const refreshGoals = useCallback(() => {
        loadGoals();
    }, [loadGoals]);

    return {
        goals,
        loading,
        addGoal,
        updateGoal,
        deleteGoal,
        refreshGoals,
    };
}

export function useDailyGoals(userId: string | undefined, date: string | undefined) {
    const [goals, setGoals] = useState<DailyGoal[]>([]);
    const [loading, setLoading] = useState(true);

    const loadGoals = useCallback(async () => {
        if (!userId || !date) {
            setGoals([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('daily_goals')
                .select('*')
                .eq('user_id', userId)
                .eq('goal_date', date);

            if (error) throw error;
            setGoals(data || []);
        } catch (err) {
            console.error('Failed to load daily goals:', err);
        } finally {
            setLoading(false);
        }
    }, [userId, date]);

    useEffect(() => {
        loadGoals();
    }, [loadGoals]);

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

    const refreshGoals = useCallback(() => {
        loadGoals();
    }, [loadGoals]);

    return {
        goals,
        loading,
        addGoal,
        updateGoal,
        deleteGoal,
        refreshGoals,
    };
}
