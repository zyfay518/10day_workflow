import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type WeightRecord = Database['public']['Tables']['weight_records']['Row'];

export function useWeight(userId?: string) {
    const [weights, setWeights] = useState<WeightRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadWeights = useCallback(async () => {
        if (!userId) {
            setWeights([]);
            return;
        }

        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('weight_records')
                .select('*')
                .eq('user_id', userId)
                .order('record_date', { ascending: true });

            if (fetchError) throw fetchError;
            setWeights(data || []);
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
            const { data, error: insertError } = await supabase
                .from('weight_records')
                .insert([{
                    user_id: userId,
                    weight_kg,
                    record_date,
                    notes: notes || null
                }])
                .select()
                .single();

            if (insertError) throw insertError;

            setWeights(prev => [...prev, data]);
            return data;
        } catch (err) {
            setError('Failed to add weight');
            console.error(err);
            return null;
        }
    };

    const deleteWeight = async (id: number) => {
        if (!userId) return false;

        try {
            const { error: deleteError } = await supabase
                .from('weight_records')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            setWeights(prev => prev.filter(w => w.id !== id));
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
