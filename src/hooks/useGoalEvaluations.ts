import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type GoalEvaluation = Database['public']['Tables']['goal_evaluations']['Row'];
type GoalEvaluationInsert = Database['public']['Tables']['goal_evaluations']['Insert'];

export function useGoalEvaluations(userId: string | undefined, cycleId: number | undefined) {
    const [evaluations, setEvaluations] = useState<GoalEvaluation[]>([]);
    const [loading, setLoading] = useState(true);

    const loadEvaluations = useCallback(async () => {
        if (!userId || !cycleId) {
            setEvaluations([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('goal_evaluations')
                .select('*')
                .eq('user_id', userId)
                .eq('cycle_id', cycleId);

            if (error) throw error;
            setEvaluations(data || []);
        } catch (err) {
            console.error('Failed to load goal evaluations:', err);
        } finally {
            setLoading(false);
        }
    }, [userId, cycleId]);

    const loadAllEvaluations = useCallback(async () => {
        if (!userId) {
            setEvaluations([]);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('goal_evaluations')
                .select('*')
                .eq('user_id', userId);

            if (error) throw error;
            setEvaluations(data || []);
        } catch (err) {
            console.error('Failed to load all goal evaluations:', err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadEvaluations();
    }, [loadEvaluations]);

    const addEvaluation = async (evaluationData: Omit<GoalEvaluationInsert, 'id' | 'created_at' | 'updated_at'>) => {
        if (!userId || !cycleId) return null;
        try {
            const { data, error } = await supabase
                .from('goal_evaluations')
                .insert([{ ...evaluationData, user_id: userId, cycle_id: cycleId }])
                .select()
                .single();

            if (error) throw error;
            setEvaluations(prev => [...prev, data]);
            return data;
        } catch (err) {
            console.error('Failed to add goal evaluation:', err);
            return null;
        }
    };

    const updateEvaluation = async (id: number, updates: Partial<Omit<GoalEvaluation, 'id' | 'user_id' | 'created_at'>>) => {
        try {
            const { data, error } = await supabase
                .from('goal_evaluations')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            setEvaluations(prev => prev.map(e => (e.id === id ? data : e)));
            return data;
        } catch (err) {
            console.error('Failed to update goal evaluation:', err);
            return null;
        }
    };

    const getEvaluationByGoal = useCallback(
        (goalId: number, goalType: 'cycle' | 'daily') => {
            return evaluations.find(e => e.goal_id === goalId && e.goal_type === goalType) || null;
        },
        [evaluations]
    );

    return {
        evaluations,
        loading,
        addEvaluation,
        updateEvaluation,
        getEvaluationByGoal,
        refreshEvaluations: loadEvaluations,
        loadAllEvaluations,
    };
}
