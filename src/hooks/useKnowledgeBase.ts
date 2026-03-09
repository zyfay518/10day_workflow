import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type KnowledgeBase = Database['public']['Tables']['knowledge_base']['Row'];

type KBEntry = { items: KnowledgeBase[]; ts: number };
const kbCache = new Map<string, KBEntry>();
const kbInflight = new Map<string, Promise<void>>();
const KB_TTL_MS = 60_000;
const kbKey = (userId: string) => `kb_cache_${userId}`;

function readKB(userId: string): KBEntry | null {
    try {
        const raw = localStorage.getItem(kbKey(userId));
        return raw ? (JSON.parse(raw) as KBEntry) : null;
    } catch {
        return null;
    }
}

function writeKB(userId: string, entry: KBEntry) {
    try { localStorage.setItem(kbKey(userId), JSON.stringify(entry)); } catch {}
}

export function useKnowledgeBase(userId?: string) {
    const [entries, setEntries] = useState<KnowledgeBase[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchEntries = useCallback(async (showLoading = true) => {
        if (!userId) {
            setLoading(false);
            return;
        }

        const existing = kbInflight.get(userId);
        if (existing) {
            await existing;
            return;
        }

        const task = (async () => {
        try {
            if (showLoading) setLoading(true);
            const { data, error } = await supabase
                .from('knowledge_base')
                .select('*')
                .eq('user_id', userId)
                .order('record_date', { ascending: false });

            if (error) throw error;
            const rows = data || [];
            setEntries(rows);
            const entry = { items: rows, ts: Date.now() };
            kbCache.set(userId, entry);
            writeKB(userId, entry);
        } catch (err) {
            console.error('Failed to fetch knowledge base entries:', err);
        } finally {
            setLoading(false);
        }
        })();

        kbInflight.set(userId, task);
        try {
            await task;
        } finally {
            kbInflight.delete(userId);
        }
    }, [userId]);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }
        const cached = kbCache.get(userId) || readKB(userId);
        const isFresh = cached && Date.now() - cached.ts < KB_TTL_MS;
        if (cached) {
            setEntries(cached.items);
            setLoading(false);
            if (!isFresh) fetchEntries(false);
        } else {
            fetchEntries(true);
        }
    }, [userId, fetchEntries]);

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
