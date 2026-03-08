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

export interface VoiceParsedResult {
    summary: string;
    dimension: string;
    records: { dimension: string; content: string; record_date?: string }[];
    cycle_goals: {
        dimension: string;
        content: string;
        evaluation_criteria: string;
        target_type: 'quantitative' | 'qualitative';
        target_value?: number | null;
        target_unit?: string | null;
    }[];
    daily_goals: {
        dimension: string;
        goal_date?: string;
        content: string;
        evaluation_criteria: string;
        target_type: 'quantitative' | 'qualitative';
        target_value?: number | null;
        target_unit?: string | null;
    }[];
    expenses: { category: string; item_name: string; amount: number; expense_date?: string }[];
    confidence?: number;
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

    const parseVoiceQuickEntry = useCallback(async (
        content: string,
        options?: { currentDate?: string; timezone?: string }
    ): Promise<VoiceParsedResult | null> => {
        const apiKey = profile?.ai_api_key || ENV_DEEPSEEK_API_KEY;
        if (!apiKey || !content.trim()) return null;

        setAnalyzing(true);
        setError(null);

        try {
            const currentDate = options?.currentDate || new Date().toISOString().slice(0, 10);
            const timezone = options?.timezone || 'Asia/Singapore';

            const prompt = `You are a strict JSON extractor for a life-tracking app.
Current date: ${currentDate}
Timezone: ${timezone}
Return ONLY valid JSON with this exact shape:
{
  "summary": "string",
  "dimension": "Health|Work|Study|Wealth|Family|Other",
  "records": [{"dimension":"Health|Work|Study|Wealth|Family|Other","content":"string","record_date":"YYYY-MM-DD"}],
  "cycle_goals": [{"dimension":"Health|Work|Study|Wealth|Family|Other","content":"string","evaluation_criteria":"string","target_type":"quantitative|qualitative","target_value":null,"target_unit":null}],
  "daily_goals": [{"dimension":"Health|Work|Study|Wealth|Family|Other","goal_date":"YYYY-MM-DD","content":"string","evaluation_criteria":"string","target_type":"quantitative|qualitative","target_value":null,"target_unit":null}],
  "expenses": [{"category":"string","item_name":"string","amount":0,"expense_date":"YYYY-MM-DD"}],
  "confidence": 0.0
}
Rules:
- If unsure, use dimension = Other.
- Distinguish goals carefully:
  - cycle_goals: cross-day objectives, no strict day deadline.
  - daily_goals: explicitly for today/this day/明天/后天/短期当天任务.
- Time parsing is STRICT:
  - "今天" => ${currentDate}
  - "明天" => current date + 1 day
  - "后天" => current date + 2 days
  - If user gave explicit date, use it.
  - If no date mentioned, default to CURRENT DATE for record_date / goal_date / expense_date.
  - NEVER output far-past hallucinated years (e.g. 2023) unless explicitly spoken by user.
- Do not invent money or exact dates if truly unclear.
- Empty arrays when not applicable.
- No markdown, no explanation.

User transcript:
${content}`;

            const response = await fetch(DEEPSEEK_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        { role: 'system', content: 'Return strict JSON only.' },
                        { role: 'user', content: prompt },
                    ],
                    temperature: 0.1,
                    max_tokens: 1400,
                }),
            });

            if (!response.ok) throw new Error(`API request failed: ${response.status}`);

            const data = await response.json();
            let aiText = data.choices[0]?.message?.content?.trim() || '{}';
            const jsonMatch = aiText.match(/\{[\s\S]*\}/);
            if (jsonMatch) aiText = jsonMatch[0];

            return JSON.parse(aiText) as VoiceParsedResult;
        } catch (err) {
            console.error('parseVoiceQuickEntry failed:', err);
            return null;
        } finally {
            setAnalyzing(false);
        }
    }, [profile?.ai_api_key]);

    const classifyVoiceDimension = useCallback(async (content: string): Promise<string> => {
        const apiKey = profile?.ai_api_key || ENV_DEEPSEEK_API_KEY;
        if (!apiKey || !content.trim()) return 'Other';

        try {
            const response = await fetch(DEEPSEEK_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        { role: 'system', content: 'Classify into one label only: Health, Work, Study, Wealth, Family, Other.' },
                        { role: 'user', content },
                    ],
                    temperature: 0,
                    max_tokens: 20,
                }),
            });

            if (!response.ok) return 'Other';
            const data = await response.json();
            const label = String(data.choices[0]?.message?.content || 'Other').trim();
            const normalized = ['Health', 'Work', 'Study', 'Wealth', 'Family', 'Other'].find(d => label.includes(d));
            return normalized || 'Other';
        } catch {
            return 'Other';
        }
    }, [profile?.ai_api_key]);

    return {
        analyzing,
        result,
        error,
        analyze,
        splitDimensions,
        generateQuote,
        parseExpenseResult,
        extractTags,
        parseVoiceQuickEntry,
        classifyVoiceDimension,
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
