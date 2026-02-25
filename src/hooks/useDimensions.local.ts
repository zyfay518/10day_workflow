/**
 * useDimensions Hook - 本地存储版本
 */

import { useEffect, useState } from 'react';
import { localDimensions } from '../lib/localStorage';
import { Database } from '../types/database';

type Dimension = Database['public']['Tables']['dimensions']['Row'];

interface UseDimensionsReturn {
  dimensions: Dimension[];
  loading: boolean;
  updateDimension: (dimensionId: number, updates: Partial<Dimension>) => boolean;
}

export function useDimensions(userId?: string): UseDimensionsReturn {
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const allDimensions = localDimensions.getAll(userId);
    setDimensions(allDimensions);
    setLoading(false);
  }, [userId]);

  const updateDimension = (dimensionId: number, updates: Partial<Dimension>): boolean => {
    const success = localDimensions.update(dimensionId, updates);
    if (success && userId) {
      const updatedDimensions = localDimensions.getAll(userId);
      setDimensions(updatedDimensions);
    }
    return success;
  };

  return {
    dimensions,
    loading,
    updateDimension,
  };
}
