/**
 * AI Prompts Management Hook
 *
 * 管理用户自定义的AI Prompts
 */

import { useCallback, useEffect, useState } from 'react';
import { AI_PROMPTS, AIPromptConfig } from '../lib/aiPrompts';
import { localUserProfile } from '../lib/localStorage';

type CustomPrompts = Record<string, string>;

export function useAIPrompts(userId?: string) {
  const [customPrompts, setCustomPrompts] = useState<CustomPrompts>({});
  const [loading, setLoading] = useState(false);

  // 加载用户自定义prompts
  useEffect(() => {
    if (!userId) return;

    const profile = localUserProfile.get(userId);
    if (profile?.ai_prompts) {
      try {
        const prompts = profile.ai_prompts as CustomPrompts;
        setCustomPrompts(prompts);
      } catch (error) {
        console.error('Failed to parse custom prompts:', error);
      }
    }
  }, [userId]);

  // 获取prompt（优先使用自定义，否则使用默认）
  const getPrompt = useCallback(
    (key: string): string => {
      if (customPrompts[key]) {
        return customPrompts[key];
      }
      // Find config by key property
      const config = Object.values(AI_PROMPTS).find(c => c.key === key);
      return config?.defaultPrompt || '';
    },
    [customPrompts]
  );

  // 保存自定义prompt
  const savePrompt = useCallback(
    async (key: string, prompt: string): Promise<boolean> => {
      if (!userId) return false;

      setLoading(true);
      try {
        const newPrompts = { ...customPrompts, [key]: prompt };

        const success = localUserProfile.update(userId, {
          ai_prompts: newPrompts as any,
        });

        if (success) {
          setCustomPrompts(newPrompts);
          return true;
        }
        return false;
      } catch (error) {
        console.error('Failed to save custom prompt:', error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [userId, customPrompts]
  );

  // 重置prompt为默认值
  const resetPrompt = useCallback(
    async (key: string): Promise<boolean> => {
      if (!userId) return false;

      setLoading(true);
      try {
        const newPrompts = { ...customPrompts };
        delete newPrompts[key];

        const success = localUserProfile.update(userId, {
          ai_prompts: newPrompts as any,
        });

        if (success) {
          setCustomPrompts(newPrompts);
          return true;
        }
        return false;
      } catch (error) {
        console.error('Failed to reset prompt:', error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [userId, customPrompts]
  );

  // 重置所有prompts
  const resetAllPrompts = useCallback(
    async (): Promise<boolean> => {
      if (!userId) return false;

      setLoading(true);
      try {
        const success = localUserProfile.update(userId, {
          ai_prompts: null,
        });

        if (success) {
          setCustomPrompts({});
          return true;
        }
        return false;
      } catch (error) {
        console.error('Failed to reset all prompts:', error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  // 获取所有可用的prompt配置
  const getAllPromptConfigs = useCallback((): AIPromptConfig[] => {
    return Object.values(AI_PROMPTS);
  }, []);

  // 检查某个prompt是否被自定义
  const isCustomized = useCallback(
    (key: string): boolean => {
      return !!customPrompts[key];
    },
    [customPrompts]
  );

  return {
    customPrompts,
    loading,
    getPrompt,
    savePrompt,
    resetPrompt,
    resetAllPrompts,
    getAllPromptConfigs,
    isCustomized,
  };
}
