import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type GoalEvaluation = Database['public']['Tables']['goal_evaluations']['Row'];
type GoalEvaluationInsert = Database['public']['Tables']['goal_evaluations']['Insert'];

type EvalCacheEntry = { items: GoalEvaluation[]; ts: number };
const evalCache = new Map<string, EvalCacheEntry>();
const EVAL_TTL_MS = 60_000;
const evalKey = (userId: string, cycleId?: number) => `${userId}:${cycleId || 'all'}`;

function computeFinalScore(aiScore: number, userScore: number | null | undefined) {
    if (userScore === null || userScore === undefined) return aiScore;
    return userScore * 0.6 + aiScore * 0.4;
}

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
            const rows = data || [];
            setEvaluations(rows);
            evalCache.set(evalKey(userId, cycleId || undefined), { items: rows, ts: Date.now() });
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
            const rows = data || [];
            setEvaluations(rows);
            evalCache.set(evalKey(userId), { items: rows, ts: Date.now() });
        } catch (err) {
            console.error('Failed to load all goal evaluations:', err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        const key = evalKey(userId || '', cycleId || undefined);
        const cached = evalCache.get(key);
        const isFresh = cached && Date.now() - cached.ts < EVAL_TTL_MS;

        if (cached) {
            setEvaluations(cached.items);
            setLoading(false);
            if (!isFresh) {
                if (cycleId) loadEvaluations();
                else loadAllEvaluations();
            }
        } else {
            if (cycleId) loadEvaluations();
            else loadAllEvaluations();
        }
    }, [userId, cycleId, loadEvaluations, loadAllEvaluations]);

    const refreshCycleCompletion = useCallback(async (targetCycleId: number) => {
        if (!userId) return;
        try {
            const [{ data: evalRows, error: evalErr }, { count: cycleGoalCount, error: cycleErr }, { count: dailyGoalCount, error: dailyErr }] = await Promise.all([
                supabase
                    .from('goal_evaluations')
                    .select('goal_id,goal_type,ai_score,user_score,final_score')
                    .eq('user_id', userId)
                    .eq('cycle_id', targetCycleId),
                supabase
                    .from('cycle_goals')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', userId)
                    .eq('cycle_id', targetCycleId),
                supabase
                    .from('daily_goals')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', userId)
                    .eq('cycle_id', targetCycleId),
            ]);

            if (evalErr || cycleErr || dailyErr) throw evalErr || cycleErr || dailyErr;

            const rows = evalRows || [];
            const sumScores = rows.reduce((sum, row: any) => {
                const score = row.final_score ?? computeFinalScore(Number(row.ai_score || 0), row.user_score);
                return sum + Number(score || 0);
            }, 0);

            const totalGoals = Number(cycleGoalCount || 0) + Number(dailyGoalCount || 0);
            const completion = totalGoals > 0 ? Math.round(sumScores / totalGoals) : 0;

            await supabase
                .from('cycles')
                .update({ completion_rate: completion })
                .eq('user_id', userId)
                .eq('id', targetCycleId);
        } catch (err) {
            console.error('Failed to refresh cycle completion:', err);
        }
    }, [userId]);

    const addEvaluation = async (evaluationData: Omit<GoalEvaluationInsert, 'id' | 'created_at' | 'updated_at'>) => {
        if (!userId || !cycleId) return null;
        try {
            const payload = {
                ...evaluationData,
                user_id: userId,
                cycle_id: cycleId,
                final_score: computeFinalScore(Number(evaluationData.ai_score || 0), evaluationData.user_score),
            };

            const { data, error } = await supabase
                .from('goal_evaluations')
                .insert([payload])
                .select()
                .single();

            if (error) throw error;
            setEvaluations(prev => {
                const next = [...prev, data];
                evalCache.set(evalKey(userId, cycleId), { items: next, ts: Date.now() });
                evalCache.set(evalKey(userId), { items: next, ts: Date.now() });
                return next;
            });
            await refreshCycleCompletion(cycleId);
            return data;
        } catch (err) {
            console.error('Failed to add goal evaluation:', err);
            return null;
        }
    };

    const updateEvaluation = async (id: number, updates: Partial<Omit<GoalEvaluation, 'id' | 'user_id' | 'created_at'>>) => {
        try {
            const existing = evaluations.find(e => e.id === id);
            const aiScore = Number(updates.ai_score ?? existing?.ai_score ?? 0);
            const userScore = (updates.user_score ?? existing?.user_score ?? null) as number | null;
            const nextUpdates = {
                ...updates,
                final_score: computeFinalScore(aiScore, userScore),
            };

            const { data, error } = await supabase
                .from('goal_evaluations')
                .update(nextUpdates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            setEvaluations(prev => {
                const next = prev.map(e => (e.id === id ? data : e));
                if (userId) {
                    evalCache.set(evalKey(userId, Number(data?.cycle_id || existing?.cycle_id || cycleId || 0) || undefined), { items: next, ts: Date.now() });
                    evalCache.set(evalKey(userId), { items: next, ts: Date.now() });
                }
                return next;
            });
            const targetCycleId = Number(data?.cycle_id || existing?.cycle_id || cycleId || 0);
            if (targetCycleId) await refreshCycleCompletion(targetCycleId);
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
