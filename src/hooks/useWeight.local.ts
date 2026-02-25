import { useState, useCallback, useEffect } from 'react';
import { Database } from '../types/database';

type WeightRecord = Database['public']['Tables']['weight_records']['Row'];

export function useWeight(userId?: string) {
    const [weights, setWeights] = useState<WeightRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const STORAGE_KEY = 'weight_records';

    const loadWeights = useCallback(() => {
        if (!userId) {
            setWeights([]);
            return;
        }

        try {
            setLoading(true);
            const data = localStorage.getItem(STORAGE_KEY);
            const allWeights: WeightRecord[] = data ? JSON.parse(data) : [];
            setWeights(allWeights.filter(w => w.user_id === userId).sort((a, b) => new Date(a.record_date).getTime() - new Date(b.record_date).getTime()));
        } catch (err) {
            setError('Failed to load weight records');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadWeights();
    }, [loadWeights]);

    const addWeight = async (weight_kg: number, record_date: string, notes?: string) => {
        if (!userId) return null;

        try {
            const data = localStorage.getItem(STORAGE_KEY);
            const allWeights: WeightRecord[] = data ? JSON.parse(data) : [];

            const newWeight: WeightRecord = {
                id: Date.now(),
                user_id: userId,
                weight_kg,
                record_date,
                notes: notes || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            allWeights.push(newWeight);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(allWeights));
            loadWeights();
            return newWeight;
        } catch (err) {
            setError('Failed to add weight');
            console.error(err);
            return null;
        }
    };

    const deleteWeight = async (id: number) => {
        if (!userId) return false;

        try {
            const data = localStorage.getItem(STORAGE_KEY);
            const allWeights: WeightRecord[] = data ? JSON.parse(data) : [];
            const updatedWeights = allWeights.filter(w => w.id !== id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedWeights));
            loadWeights();
            return true;
        } catch (err) {
            setError('Failed to delete weight');
            console.error(err);
            return false;
        }
    };

    return {
        weights,
        loading,
        error,
        refreshWeights: loadWeights,
        addWeight,
        deleteWeight
    };
}
