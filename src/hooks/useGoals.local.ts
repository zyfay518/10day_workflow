import { useState, useEffect, useCallback } from 'react';
import { localCycleGoals, localDailyGoals } from '../lib/localStorage';
import { Database } from '../types/database';

type CycleGoal = Database['public']['Tables']['cycle_goals']['Row'];
type DailyGoal = Database['public']['Tables']['daily_goals']['Row'];

export function useCycleGoals(userId: string | undefined, cycleId: number | undefined) {
  const [goals, setGoals] = useState<CycleGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGoals = useCallback(() => {
    if (!userId || !cycleId) {
      setGoals([]);
      setLoading(false);
      return;
    }

    const loadedGoals = localCycleGoals.getByUserAndCycle(userId, cycleId);
    setGoals(loadedGoals);
    setLoading(false);
  }, [userId, cycleId]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const addGoal = useCallback(
    (goalData: Omit<CycleGoal, 'id' | 'created_at' | 'updated_at'>) => {
      if (!userId || !cycleId) return null;
      const newGoal = localCycleGoals.save(goalData);
      setGoals(prev => [...prev, newGoal]);
      return newGoal;
    },
    [userId, cycleId]
  );

  const updateGoal = useCallback(
    (id: number, updates: Partial<Omit<CycleGoal, 'id' | 'user_id' | 'created_at'>>) => {
      const updated = localCycleGoals.update(id, updates);
      if (updated) {
        setGoals(prev => prev.map(g => (g.id === id ? updated : g)));
      }
      return updated;
    },
    []
  );

  const deleteGoal = useCallback((id: number) => {
    const success = localCycleGoals.delete(id);
    if (success) {
      setGoals(prev => prev.filter(g => g.id !== id));
    }
    return success;
  }, []);

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

  const loadGoals = useCallback(() => {
    if (!userId || !date) {
      setGoals([]);
      setLoading(false);
      return;
    }

    const loadedGoals = localDailyGoals.getByDate(userId, date);
    setGoals(loadedGoals);
    setLoading(false);
  }, [userId, date]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const addGoal = useCallback(
    (goalData: Omit<DailyGoal, 'id' | 'created_at' | 'updated_at'>) => {
      if (!userId) return null;
      const newGoal = localDailyGoals.save(goalData);
      setGoals(prev => [...prev, newGoal]);
      return newGoal;
    },
    [userId]
  );

  const updateGoal = useCallback(
    (id: number, updates: Partial<Omit<DailyGoal, 'id' | 'user_id' | 'created_at'>>) => {
      const updated = localDailyGoals.update(id, updates);
      if (updated) {
        setGoals(prev => prev.map(g => (g.id === id ? updated : g)));
      }
      return updated;
    },
    []
  );

  const deleteGoal = useCallback((id: number) => {
    const success = localDailyGoals.delete(id);
    if (success) {
      setGoals(prev => prev.filter(g => g.id !== id));
    }
    return success;
  }, []);

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
