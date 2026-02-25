/**
 * useCycles Hook - 本地存储版本
 */

import { useEffect, useState } from 'react';
import { localCycles } from '../lib/localStorage';
import { Database } from '../types/database';

type Cycle = Database['public']['Tables']['cycles']['Row'];

interface UseCyclesReturn {
  cycles: Cycle[];
  currentCycle: Cycle | null;
  loading: boolean;
  refreshCycles: () => void;
}

export function useCycles(userId?: string): UseCyclesReturn {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [currentCycle, setCurrentCycle] = useState<Cycle | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCycles = () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const allCycles = localCycles.getAll(userId);
    const active = localCycles.getCurrent(userId);

    setCycles(allCycles);
    setCurrentCycle(active);
    setLoading(false);
  };

  useEffect(() => {
    fetchCycles();
  }, [userId]);

  return {
    cycles,
    currentCycle,
    loading,
    refreshCycles: fetchCycles,
  };
}
