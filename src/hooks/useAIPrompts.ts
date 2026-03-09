import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AI_PROMPTS, AIPromptConfig } from '../lib/aiPrompts';

type CustomPrompts = Record<string, string>;

type CacheEntry = { prompts: CustomPrompts; ts: number };
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<void>>();
const TTL_MS = 60_000;
const key = (userId: string) => `ai_prompts_cache_${userId}`;

function read(userId: string): CacheEntry | null { try { const raw = localStorage.getItem(key(userId)); return raw ? JSON.parse(raw) : null; } catch { return null; } }
function write(userId: string, entry: CacheEntry) { try { localStorage.setItem(key(userId), JSON.stringify(entry)); } catch {} }

export function useAIPrompts(userId?: string) {
    const [customPrompts, setCustomPrompts] = useState<CustomPrompts>({});
    const [loading, setLoading] = useState(false);

    // Load custom prompts from user profile
    useEffect(() => {
        if (!userId) return;

        const cached = cache.get(userId) || read(userId);
        const fresh = cached && Date.now() - cached.ts < TTL_MS;
        if (cached) {
            setCustomPrompts(cached.prompts || {});
            if (fresh) return;
        }

        const fetchPrompts = async () => {
            const existing = inflight.get(userId);
            if (existing) {
                await existing;
                return;
            }

            const task = (async () => {
                try {
                    const { data, error } = await supabase
                        .from('user_profiles')
                        .select('ai_prompts')
                        .eq('user_id', userId)
                        .single();

                    if (error) throw error;
                    const prompts = (data?.ai_prompts as CustomPrompts) || {};
                    setCustomPrompts(prompts);
                    const entry = { prompts, ts: Date.now() };
                    cache.set(userId, entry);
                    write(userId, entry);
                } catch (err) {
                    console.error('Failed to load user prompts:', err);
                }
            })();

            inflight.set(userId, task);
            try { await task; } finally { inflight.delete(userId); }
        };

        fetchPrompts();
    }, [userId]);

    // Get prompt (customized first, then default)
    const getPrompt = useCallback(
        (key: string): string => {
            if (customPrompts[key]) {
                return customPrompts[key];
            }
            const config = Object.values(AI_PROMPTS).find(c => c.key === key);
            return config?.defaultPrompt || '';
        },
        [customPrompts]
    );

    // Save custom prompt
    const savePrompt = useCallback(
        async (key: string, prompt: string): Promise<boolean> => {
            if (!userId) return false;

            setLoading(true);
            try {
                const newPrompts = { ...customPrompts, [key]: prompt };

                const { error } = await supabase
                    .from('user_profiles')
                    .update({ ai_prompts: newPrompts })
                    .eq('user_id', userId);

                if (error) throw error;
                setCustomPrompts(newPrompts);
                const entry = { prompts: newPrompts, ts: Date.now() };
                cache.set(userId, entry);
                write(userId, entry);
                return true;
            } catch (err) {
                console.error('Failed to save custom prompt:', err);
                return false;
            } finally {
                setLoading(false);
            }
        },
        [userId, customPrompts]
    );

    // Reset prompt to default
    const resetPrompt = useCallback(
        async (key: string): Promise<boolean> => {
            if (!userId) return false;

            setLoading(true);
            try {
                const newPrompts = { ...customPrompts };
                delete newPrompts[key];

                const { error } = await supabase
                    .from('user_profiles')
                    .update({ ai_prompts: newPrompts })
                    .eq('user_id', userId);

                if (error) throw error;
                setCustomPrompts(newPrompts);
                const entry = { prompts: newPrompts, ts: Date.now() };
                cache.set(userId, entry);
                write(userId, entry);
                return true;
            } catch (err) {
                console.error('Failed to reset prompt:', err);
                return false;
            } finally {
                setLoading(false);
            }
        },
        [userId, customPrompts]
    );

    return {
        customPrompts,
        loading,
        getPrompt,
        savePrompt,
        resetPrompt,
        getAllPromptConfigs: () => Object.values(AI_PROMPTS).filter((p) => p.key !== 'history_quote'),
        isCustomized: (key: string) => !!customPrompts[key],
    };
}
