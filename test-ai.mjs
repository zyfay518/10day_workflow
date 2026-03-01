import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const content = "房租7700";
const systemPrompt = "You are a professional financial assistant expert at parsing expense information.";
const prompt = `You are a financial assistant expert. Extract expense items from the following text and output ONLY a JSON array.

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
${content}`;

async function check() {
  const response = await fetch(process.env.VITE_DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.VITE_DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });
  const data = await response.json();
  console.log("AI Result:", data.choices[0]?.message?.content);
}
check();
