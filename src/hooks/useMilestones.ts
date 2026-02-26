import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Milestone = Database['public']['Tables']['milestones']['Row'];
type MilestoneInsert = Database['public']['Tables']['milestones']['Insert'];
type MilestoneUpdate = Database['public']['Tables']['milestones']['Update'];

export function useMilestones(userId?: string) {
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadMilestones = useCallback(async () => {
        if (!userId) {
            setMilestones([]);
            return;
        }

        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('milestones')
                .select('*')
                .eq('user_id', userId)
                .order('event_date', { ascending: false });

            if (fetchError) throw fetchError;
            setMilestones(data || []);
        } catch (err) {
            setError('Failed to load milestones');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadMilestones();
    }, [loadMilestones]);

    const addMilestone = async (milestone: Omit<MilestoneInsert, 'id' | 'created_at' | 'updated_at'>) => {
        if (!userId) return null;

        try {
            const { data, error: insertError } = await supabase
                .from('milestones')
                .insert([{ ...milestone, user_id: userId }])
                .select()
                .single();

            if (insertError) throw insertError;
            setMilestones(prev => [data, ...prev]);
            return data;
        } catch (err) {
            setError('Failed to add milestone');
            console.error(err);
            return null;
        }
    };

    const updateMilestone = async (id: number, updates: MilestoneUpdate) => {
        try {
            const { data, error: updateError } = await supabase
                .from('milestones')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (updateError) throw updateError;
            setMilestones(prev => prev.map(m => (m.id === id ? data : m)));
            return true;
        } catch (err) {
            setError('Failed to update milestone');
            console.error(err);
            return false;
        }
    };

    const deleteMilestone = async (id: number) => {
        try {
            const { error: deleteError } = await supabase
                .from('milestones')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;
            setMilestones(prev => prev.filter(m => m.id !== id));
            return true;
        } catch (err) {
            setError('Failed to delete milestone');
            console.error(err);
            return false;
        }
    };

    return {
        milestones,
        loading,
        error,
        refreshMilestones: loadMilestones,
        addMilestone,
        updateMilestone,
        deleteMilestone
    };
}
