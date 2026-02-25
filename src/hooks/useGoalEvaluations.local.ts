import { useState, useEffect, useCallback } from 'react';
import { localGoalEvaluations } from '../lib/localStorage';
import { Database } from '../types/database';

type GoalEvaluation = Database['public']['Tables']['goal_evaluations']['Row'];

export function useGoalEvaluations(userId: string | undefined, cycleId: number | undefined) {
  const [evaluations, setEvaluations] = useState<GoalEvaluation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEvaluations = useCallback(() => {
    if (!userId || !cycleId) {
      setEvaluations([]);
      setLoading(false);
      return;
    }

    const loadedEvaluations = localGoalEvaluations.getByCycle(userId, cycleId);
    setEvaluations(loadedEvaluations);
    setLoading(false);
  }, [userId, cycleId]);

  const loadAllEvaluations = useCallback(() => {
    if (!userId) {
      setEvaluations([]);
      setLoading(false);
      return;
    }
    const allEvals = localGoalEvaluations.getAll(userId);
    setEvaluations(allEvals);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadEvaluations();
  }, [loadEvaluations]);

  const addEvaluation = useCallback(
    (evaluationData: Omit<GoalEvaluation, 'id' | 'created_at' | 'updated_at'>) => {
      if (!userId || !cycleId) return null;
      const newEvaluation = localGoalEvaluations.save(evaluationData);
      setEvaluations(prev => [...prev, newEvaluation]);
      return newEvaluation;
    },
    [userId, cycleId]
  );

  const updateEvaluation = useCallback(
    (id: number, updates: Partial<Omit<GoalEvaluation, 'id' | 'user_id' | 'created_at'>>) => {
      const updated = localGoalEvaluations.update(id, updates);
      if (updated) {
        setEvaluations(prev => prev.map(e => (e.id === id ? updated : e)));
      }
      return updated;
    },
    []
  );

  const getEvaluationByGoal = useCallback(
    (goalId: number, goalType: 'cycle' | 'daily') => {
      return evaluations.find(e => e.goal_id === goalId && e.goal_type === goalType) || null;
    },
    [evaluations]
  );

  const refreshEvaluations = useCallback(() => {
    loadEvaluations();
  }, [loadEvaluations]);

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
