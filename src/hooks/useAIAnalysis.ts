import { useState, useCallback } from 'react';
import { useAIPrompts } from './useAIPrompts';
import { useUserProfile } from './useUserProfile';

const ENV_DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = import.meta.env.VITE_DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';

interface ExpenseItem {
    category: string;
    name: string;
    amount: number;
    icon?: string;
}

export interface SplitDimensionItem {
    dimension: string;
    content: string;
}

export function useAIAnalysis(userId?: string) {
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const { getPrompt } = useAIPrompts(userId);
    const { profile } = useUserProfile(userId);

    const analyze = useCallback(
        async (content: string, dimension: string): Promise<string> => {
            const apiKey = profile?.ai_api_key || ENV_DEEPSEEK_API_KEY;
            if (!apiKey) {
                console.warn('AI Analysis skipped: No API key found in env or user profile.');
                return '';
            }

            if (!content.trim()) {
                throw new Error('Content cannot be empty');
            }

            setAnalyzing(true);
            setError(null);

            try {
                let prompt = '';
                let systemPrompt = '';

                if (dimension === 'Expense' || dimension === '费用') {
                    systemPrompt = 'You are a professional financial assistant expert at parsing expense information.';
                    prompt = getPrompt('record_parse_expense');
                    prompt = prompt.replace(/\{\{content\}\}/g, content);
                } else {
                    systemPrompt = 'You are a professional life assistant expert at summarizing and providing suggestions.';
                    prompt = getPrompt('record_parse_general');
                    prompt = prompt.replace(/\{\{dimension\}\}/g, dimension);
                    prompt = prompt.replace(/\{\{content\}\}/g, content);
                }

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);

                const response = await fetch(DEEPSEEK_API_URL, {
                    method: 'POST',
                    signal: controller.signal,
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                        model: 'deepseek-chat',
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: prompt },
                        ],
                        temperature: 0.7,
                        max_tokens: 500,
                    }),
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`API request failed: ${response.status}`);
                }

                const data = await response.json();
                const aiResult = data.choices[0]?.message?.content || '';

                setResult(aiResult);
                return aiResult;
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'AI analysis failed';
                setError(errorMessage);
                throw err;
            } finally {
                setAnalyzing(false);
            }
        },
        [getPrompt]
    );

    const parseExpenseResult = useCallback((aiResult: string): ExpenseItem[] => {
        try {
            const jsonMatch = aiResult.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return parsed.map((item: any) => ({
                    category: item.category || 'Other',
                    name: item.name || '',
                    amount: parseFloat(item.amount) || 0,
                    icon: getCategoryIcon(item.category),
                }));
            }
            return [];
        } catch (error) {
            console.error('Failed to parse expense result:', error);
            return [];
        }
    }, []);

    const generateQuote = useCallback(
        async (content: string): Promise<string> => {
            const apiKey = profile?.ai_api_key || ENV_DEEPSEEK_API_KEY;
            if (!apiKey) return '';

            if (!content.trim()) return '';

            try {
                let prompt = getPrompt('history_quote');
                prompt = prompt.replace(/\{\{content\}\}/g, content);

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);

                const response = await fetch(DEEPSEEK_API_URL, {
                    method: 'POST',
                    signal: controller.signal,
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                        model: 'deepseek-chat',
                        messages: [
                            { role: 'system', content: 'You are a literary and philosophical quote generator.' },
                            { role: 'user', content: prompt },
                        ],
                        temperature: 0.9,
                        max_tokens: 100,
                    }),
                });

                clearTimeout(timeoutId);

                if (!response.ok) return '';

                const data = await response.json();
                return data.choices[0]?.message?.content?.trim() || '';
            } catch (err) {
                console.error('Failed to generate quote:', err);
                return '';
            }
        },
        [getPrompt]
    );

    const extractTags = useCallback(
        async (content: string): Promise<string[]> => {
            const apiKey = profile?.ai_api_key || ENV_DEEPSEEK_API_KEY;
            if (!apiKey) return [];

            if (!content.trim()) return [];

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);

                const response = await fetch(DEEPSEEK_API_URL, {
                    method: 'POST',
                    signal: controller.signal,
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                        model: 'deepseek-chat',
                        messages: [
                            { role: 'system', content: 'You are an AI that extracts 1-3 behavioral growth tags from user journal entries. Return ONLY a JSON array of strings, like ["#深度思考", "#执行力"].' },
                            { role: 'user', content }
                        ],
                        temperature: 0.3,
                        max_tokens: 50,
                    }),
                });

                clearTimeout(timeoutId);

                if (!response.ok) return [];

                const data = await response.json();
                const aiText = data.choices[0]?.message?.content?.trim() || '[]';
                const jsonMatch = aiText.match(/\[.*\]/s);
                return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
            } catch (err) {
                console.error('Failed to extract tags:', err);
                return [];
            }
        },
        []
    );

    const splitDimensions = useCallback(
        async (content: string): Promise<SplitDimensionItem[]> => {
            const apiKey = profile?.ai_api_key || ENV_DEEPSEEK_API_KEY;
            if (!apiKey) {
                console.warn('AI splitDimensions skipped: No API key.');
                return [];
            }

            if (!content.trim()) return [];

            setAnalyzing(true);
            setError(null);

            try {
                console.log('splitDimensions: getting prompt...');
                let prompt = getPrompt('record_split_dimensions');
                console.log('splitDimensions: raw prompt:', prompt);
                prompt = prompt.replace(/\{\{content\}\}/g, content);
                console.log('splitDimensions: calling DeepSeek API...');

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);

                const response = await fetch(DEEPSEEK_API_URL, {
                    method: 'POST',
                    signal: controller.signal,
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                        model: 'deepseek-chat',
                        messages: [
                            { role: 'system', content: 'You are a data extraction assistant. Return ONLY a cleanly formatted JSON array.' },
                            { role: 'user', content: prompt }
                        ],
                        temperature: 0.1,
                        max_tokens: 1000,
                    }),
                });

                clearTimeout(timeoutId);
                console.log('splitDimensions: API returned', response.status);

                if (!response.ok) {
                    throw new Error(`API request failed: ${response.status}`);
                }

                const data = await response.json();
                console.log('splitDimensions: API data:', data);
                let aiText = data.choices[0]?.message?.content?.trim() || '[]';

                const jsonMatch = aiText.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    aiText = jsonMatch[0];
                }

                const parsed = JSON.parse(aiText);
                return Array.isArray(parsed) ? parsed : [];
            } catch (err) {
                console.error('Failed to split dimensions:', err);
                return [];
            } finally {
                setAnalyzing(false);
            }
        },
        [getPrompt]
    );

    return {
        analyzing,
        result,
        error,
        analyze,
        splitDimensions,
        generateQuote,
        parseExpenseResult,
        extractTags,
        clearResult: () => { setResult(null); setError(null); },
    };
}

function getCategoryIcon(category: string): string {
    const iconMap: Record<string, string> = {
        '餐饮': 'restaurant',
        '交通': 'directions_car',
        '购物': 'shopping_bag',
        '娱乐': 'movie',
        '教育': 'school',
        '医疗': 'local_hospital',
        '其他': 'receipt',
        'Food': 'restaurant',
        'Transport': 'directions_car',
        'Shopping': 'shopping_bag',
        'Entertainment': 'movie',
        'Education': 'school',
        'Health': 'local_hospital',
        'Other': 'receipt',
    };
    return iconMap[category] || 'receipt';
}
