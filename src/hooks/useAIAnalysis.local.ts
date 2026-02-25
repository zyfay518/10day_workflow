/**
 * AI分析 Hook
 *
 * 使用DeepSeek API进行内容分析和Quote生成
 */

import { useState, useCallback } from 'react';
import { getAIPrompt } from '../lib/aiPrompts';
import { useAIPrompts } from './useAIPrompts.local';

const DEEPSEEK_API_KEY = 'sk-9bec945e0faa4e08bc72f86816990e91';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

interface ExpenseItem {
  category: string;
  name: string;
  amount: number;
  icon?: string;
}

export function useAIAnalysis(userId?: string) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get custom prompts
  const { getPrompt } = useAIPrompts(userId);

  // AI分析函数
  const analyze = useCallback(
    async (content: string, dimension: string): Promise<string> => {
      if (!content.trim()) {
        throw new Error('内容不能为空');
      }

      setAnalyzing(true);
      setError(null);

      try {
        let prompt = '';
        let systemPrompt = '';

        if (dimension === '费用') {
          // Expense维度：解析结构化数据
          systemPrompt = '你是一个专业的财务助手，擅长解析开销信息。';
          prompt = getPrompt('record_parse_expense');
          // Replace variables
          prompt = prompt.replace(/\{\{content\}\}/g, content);
        } else {
          // 其他维度：总结和建议
          systemPrompt = '你是一个专业的生活助手，擅长总结和给出建议。';
          prompt = getPrompt('record_parse_general');
          // Replace variables
          prompt = prompt.replace(/\{\{dimension\}\}/g, dimension);
          prompt = prompt.replace(/\{\{content\}\}/g, content);
        }

        // 调用DeepSeek API
        const response = await fetch(DEEPSEEK_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
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

        if (!response.ok) {
          throw new Error(`API请求失败: ${response.status}`);
        }

        const data = await response.json();
        const aiResult = data.choices[0]?.message?.content || '';

        setResult(aiResult);
        return aiResult;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'AI分析失败';
        setError(errorMessage);
        throw err;
      } finally {
        setAnalyzing(false);
      }
    },
    [getPrompt]
  );

  // 解析Expense结果为结构化数据
  const parseExpenseResult = useCallback((aiResult: string): ExpenseItem[] => {
    try {
      // 尝试从AI结果中提取JSON
      const jsonMatch = aiResult.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.map((item: any) => ({
          category: item.category || '其他',
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

  // 生成AI Quote
  const generateQuote = useCallback(
    async (content: string): Promise<string> => {
      if (!content.trim()) {
        return '';
      }

      try {
        let prompt = getPrompt('history_quote');
        // Replace variables
        prompt = prompt.replace(/\{\{content\}\}/g, content);

        const response = await fetch(DEEPSEEK_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
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

        if (!response.ok) {
          console.error('Quote generation failed:', response.status);
          return '';
        }

        const data = await response.json();
        const quote = data.choices[0]?.message?.content?.trim() || '';

        return quote;
      } catch (err) {
        console.error('Failed to generate quote:', err);
        return '';
      }
    },
    [getPrompt]
  );

  // 清除结果
  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  // 提取成长标签
  const extractTags = useCallback(
    async (content: string): Promise<string[]> => {
      if (!content.trim()) return [];

      try {
        const response = await fetch(DEEPSEEK_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: 'You are an AI that extracts 1-3 behavioral growth tags from user journal entries. Return ONLY a JSON array of strings, like ["#深度思考", "#执行力"]. The tags MUST start with a hashtag (#) and be in Chinese if the text is in Chinese.' },
              { role: 'user', content }
            ],
            temperature: 0.3,
            max_tokens: 50,
          }),
        });

        if (!response.ok) return [];

        const data = await response.json();
        const aiText = data.choices[0]?.message?.content?.trim() || '[]';

        // Match JSON array
        const jsonMatch = aiText.match(/\[.*\]/s);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        return [];
      } catch (err) {
        console.error('Failed to extract tags:', err);
        return [];
      }
    },
    []
  );

  return {
    analyzing,
    result,
    error,
    analyze,
    generateQuote,
    parseExpenseResult,
    extractTags,
    clearResult,
  };
}

// 辅助函数：根据类目返回图标
function getCategoryIcon(category: string): string {
  const iconMap: Record<string, string> = {
    餐饮: 'restaurant',
    交通: 'directions_car',
    购物: 'shopping_bag',
    娱乐: 'movie',
    教育: 'school',
    医疗: 'local_hospital',
    其他: 'receipt',
  };
  return iconMap[category] || 'receipt';
}
