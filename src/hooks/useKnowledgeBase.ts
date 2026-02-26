import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type KnowledgeBase = Database['public']['Tables']['knowledge_base']['Row'];

export function useKnowledgeBase(userId?: string) {
    const [entries, setEntries] = useState<KnowledgeBase[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchEntries = useCallback(async () => {
        if (!userId) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('knowledge_base')
                .select('*')
                .eq('user_id', userId)
                .order('record_date', { ascending: false });

            if (error) throw error;
            setEntries(data || []);
        } catch (err) {
            console.error('Failed to fetch knowledge base entries:', err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchEntries();
    }, [fetchEntries]);

    const addEntry = async (entry: Omit<KnowledgeBase, 'id' | 'created_at' | 'updated_at'>) => {
        if (!userId) return;
        try {
            const { data, error } = await supabase
                .from('knowledge_base')
                .insert([{ ...entry, user_id: userId }])
                .select()
                .single();

            if (error) throw error;
            setEntries(prev => [data, ...prev]);
        } catch (err) {
            console.error('Failed to add knowledge base entry:', err);
        }
    };

    const removeEntry = async (id: number) => {
        try {
            const { error } = await supabase
                .from('knowledge_base')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setEntries(prev => prev.filter(e => e.id !== id));
        } catch (err) {
            console.error('Failed to remove knowledge base entry:', err);
        }
    };

    return {
        entries,
        loading,
        addEntry,
        removeEntry,
        refreshEntries: fetchEntries,
    };
}
