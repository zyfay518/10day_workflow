import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AI_PROMPTS, AIPromptConfig } from '../lib/aiPrompts';

type CustomPrompts = Record<string, string>;

export function useAIPrompts(userId?: string) {
    const [customPrompts, setCustomPrompts] = useState<CustomPrompts>({});
    const [loading, setLoading] = useState(false);

    // Load custom prompts from user profile
    useEffect(() => {
        if (!userId) return;

        const fetchPrompts = async () => {
            try {
                const { data, error } = await supabase
                    .from('user_profiles')
                    .select('ai_prompts')
                    .eq('user_id', userId)
                    .single();

                if (error) throw error;
                if (data?.ai_prompts) {
                    setCustomPrompts(data.ai_prompts as CustomPrompts);
                }
            } catch (err) {
                console.error('Failed to load user prompts:', err);
            }
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
        getAllPromptConfigs: () => Object.values(AI_PROMPTS),
        isCustomized: (key: string) => !!customPrompts[key],
    };
}
