import { useEffect, useState } from 'react';
import { localKnowledgeBase } from '../lib/localStorage';
import { Database } from '../types/database';

type KnowledgeBase = Database['public']['Tables']['knowledge_base']['Row'];

export function useKnowledgeBase(userId?: string) {
    const [entries, setEntries] = useState<KnowledgeBase[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchEntries = () => {
        if (!userId) {
            setLoading(false);
            return;
        }
        const data = localKnowledgeBase.getAll(userId);
        // Sort by date descending
        setEntries(data.sort((a, b) => new Date(b.record_date).getTime() - new Date(a.record_date).getTime()));
        setLoading(false);
    };

    useEffect(() => {
        fetchEntries();
    }, [userId]);

    const addEntry = (entry: Omit<KnowledgeBase, 'id' | 'created_at' | 'updated_at'>) => {
        if (!userId) return;
        localKnowledgeBase.add(entry);
        fetchEntries();
    };

    const removeEntry = (id: number) => {
        localKnowledgeBase.remove(id);
        fetchEntries();
    };

    return {
        entries,
        loading,
        addEntry,
        removeEntry,
        refreshEntries: fetchEntries,
    };
}
