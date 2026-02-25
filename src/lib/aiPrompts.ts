/**
 * AI Prompt 配置
 * 用于管理应用中所有AI相关的prompt模板
 */

export interface AIPromptConfig {
  key: string;
  name: string;
  description: string;
  defaultPrompt: string;
}

export const AI_PROMPTS: Record<string, AIPromptConfig> = {
  // Record页面 - AI解析（通用维度）
  RECORD_PARSE_GENERAL: {
    key: 'record_parse_general',
    name: 'Record AI Analysis (General)',
    description: 'AI analysis for general dimension records (Work, Reading, Investment, etc.)',
    defaultPrompt: `You are a personal development coach analyzing a user's daily record. Based on the content they wrote, provide constructive feedback and suggestions.

Guidelines:
1. Identify key themes and insights from the content
2. Highlight positive aspects or achievements
3. Suggest specific, actionable improvements
4. Keep the tone encouraging and supportive
5. Response should be 80-150 words
6. Use a professional yet warm tone

Format:
- Start with a brief summary
- List 2-3 key observations
- End with 1-2 actionable suggestions

The user's record is about: {{dimension}}

User's record content:
{{content}}`
  },

  // Record页面 - AI解析（费用维度）
  RECORD_PARSE_EXPENSE: {
    key: 'record_parse_expense',
    name: 'Record AI Analysis (Expense)',
    description: 'AI analysis specifically for expense/spending records',
    defaultPrompt: `You are a financial advisor analyzing a user's daily expense record. Based on their spending record, provide financial insights and suggestions.

Guidelines:
1. Analyze spending patterns and categories
2. Identify any unusual or noteworthy expenses
3. Suggest budget optimization opportunities
4. Provide practical money-saving tips if applicable
5. Response should be 80-150 words
6. Use a professional financial advisory tone

Format:
- Brief spending analysis
- Financial insights (2-3 points)
- Practical suggestions for better financial management

User's expense record:
{{content}}`
  },

  // History页面 - 名言金句生成
  HISTORY_QUOTE: {
    key: 'history_quote',
    name: 'AI Inspirational Quote',
    description: 'Generate inspirational quotes based on record content',
    defaultPrompt: `Based on the user's record content, generate a short, inspirational quote or wisdom that is highly relevant to what they wrote.

Requirements:
1. Must be highly relevant to the content theme
2. Style: Literary, philosophical, soul-stirring, or inspirational
3. Length: 20-30 Chinese characters (or equivalent in other languages)
4. If specific locations/events are mentioned, prefer related famous quotes
5. Should provide emotional resonance or deeper meaning
6. Output ONLY the quote, no additional explanation

Examples:
- Record: "Visited Machu Picchu" → "在云端之城，触摸时光的印记"
- Record: "Finished reading 'Sapiens'" → "历史是无数选择的回响"
- Record: "Morning run 5km" → "每一步都是对昨天的超越"

User's record content:
{{content}}

Generate one quote (20-30 characters):`
  }
};

/**
 * 获取AI Prompt
 */
export function getAIPrompt(key: string, variables?: Record<string, string>): string {
  const config = AI_PROMPTS[key.toUpperCase()];
  if (!config) {
    throw new Error(`AI Prompt not found: ${key}`);
  }

  let prompt = config.defaultPrompt;

  // Replace variables
  if (variables) {
    Object.entries(variables).forEach(([key, value]) => {
      prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
  }

  return prompt;
}

/**
 * 获取所有可配置的prompts
 */
export function getAllPromptConfigs(): AIPromptConfig[] {
  return Object.values(AI_PROMPTS);
}
