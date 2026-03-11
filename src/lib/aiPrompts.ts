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
    defaultPrompt: `You are a financial assistant expert. Extract expense items from the following text and output ONLY a JSON array.

Guidelines:
1. Extract the expense name (item), category, and amount (number only)
2. Categories should be standardized (e.g., Dining, Transport, Shopping, Rent, Entertainment, Utilities, Other)
3. Do not include any explanations, markdown blocks, or text outside the JSON array.
4. If no expenses are found, return an empty array [].

Example output format:
[
  { "name": "Rent", "category": "Rent", "amount": 7700 },
  { "name": "Coffee", "category": "Dining", "amount": 30 }
]

User's expense record:
{{content}}`
  },

  // Record页面 - 多维度拆分
  RECORD_SPLIT_DIMENSIONS: {
    key: 'record_split_dimensions',
    name: 'Record AI Split Dimensions',
    description: 'AI analysis to split raw text into multiple standardized dimensions',
    defaultPrompt: `You are an intelligent assistant for a daily journaling app. Your task is to split the user's raw text into fragments and assign them to specific life dimensions. Output ONLY a clean JSON array.

Guidelines:
1. Valid dimensions to choose from: "Health", "Work", "Study", "Wealth", "Family", "Other".
2. If multiple sentences belong to the same dimension, concatenate them using a newline character (\\n).
3. Do not create more than one item per dimension. The maximum array length is 6.
4. Ensure no content from the original text is lost.
5. If a sentence doesn't clearly fit "Health", "Work", "Study", "Wealth", or "Family", put it in "Other".
6. Do NOT include markdown code blocks \`\`\`json or any other text. Output RAW JSON array only.

Example mapping behavior depending on user input:
User input: "Ran 5km today. Spent 100 on lunch. Coded for 3 hours."
Output:
[
  { "dimension": "Health", "content": "Ran 5km today." },
  { "dimension": "Wealth", "content": "Spent 100 on lunch." },
  { "dimension": "Work", "content": "Coded for 3 hours." }
]

User's raw text:
{{content}}`
  },

  // Voice Quick Capture - 语音结构化解析
  VOICE_QUICK_PARSE: {
    key: 'voice_quick_parse',
    name: 'Voice Quick Parse',
    description: 'Parse voice transcript into records, cycle goals, daily goals, and expenses',
    defaultPrompt: `You are a strict JSON extractor for a life-tracking app.
Current date: {{currentDate}}
Timezone: {{timezone}}
Return ONLY valid JSON with this exact shape:
{
  "summary": "string",
  "dimension": "Health|Work|Study|Wealth|Family|Other",
  "records": [{"dimension":"Health|Work|Study|Wealth|Family|Other","content":"string","record_date":"YYYY-MM-DD"}],
  "cycle_goals": [{"dimension":"Health|Work|Study|Wealth|Family|Other","content":"string","evaluation_criteria":"string","target_type":"quantitative|qualitative","target_value":null,"target_unit":null}],
  "todos": [{"todo_date":"YYYY-MM-DD","content":"string"}],
  "expenses": [{"category":"string","item_name":"string","amount":0,"expense_date":"YYYY-MM-DD"}],
  "confidence": 0.0
}
Rules:
- If unsure, use dimension = Other.
- CRITICAL GOAL SPLIT:
  - cycle_goals: long-range / this period / this 10-day cycle targets.
  - todos: today/tomorrow/this day tasks only.
- If user explicitly says "本周期" / "这个周期" / "这十天" / "10天", you MUST output at least one cycle_goals item.
- Time parsing is strict:
  - 今天 => {{currentDate}}
  - 明天 => current date + 1 day
  - 后天 => current date + 2 days
  - If explicit date exists, use it.
  - If no date, default to {{currentDate}} for record/goal/expense date fields.
  - NEVER output hallucinated past year dates unless explicitly spoken.
- Do not invent money or exact dates if unclear.
- Empty arrays when not applicable.
- No markdown, no explanation.

User transcript:
{{content}}`
  },

  // Goals页面 - AI目标评分
  GOAL_EVALUATE: {
    key: 'goal_evaluate',
    name: 'Goal AI Evaluation',
    description: 'Evaluate goal completion score based on goal definition and period records',
    defaultPrompt: `You are an evaluation engine for personal goals.
Return ONLY valid JSON:
{"ai_score": number, "ai_analysis": "string"}
Rules:
- ai_score must be 0-100 integer.
- Use goal target, criteria and evidence from records.
- If evidence is weak, score conservatively.
- Keep ai_analysis concise (1-3 sentences) and actionable.

Goal type: {{goalType}}
Dimension: {{dimension}}
Goal content: {{goalContent}}
Evaluation criteria: {{criteria}}
User records in this cycle:
{{records}}
`
  },

  // Record页面 - 意图识别（目标/记录/todo）
  RECORD_INTENT_EXTRACT: {
    key: 'record_intent_extract',
    name: 'Record Intent Extract',
    description: 'Extract todo candidates from record text with intent classification',
    defaultPrompt: `You are an intent classifier for journaling text.
Classify each meaningful clause into one of: goal | record | todo.
Rules:
- 想做什么 => goal
- 做了什么 => record
- 准备做什么 => todo
Return ONLY JSON:
{"items":[{"type":"goal|record|todo","text":"string"}]}
No markdown. No explanation.

User text:
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
