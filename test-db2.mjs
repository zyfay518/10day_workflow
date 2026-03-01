import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: records, error } = await supabase.from('records').select('id, content, dimensions(dimension_name), expenses(*)').order('created_at', { ascending: false }).limit(5);
  console.log("Records:", JSON.stringify(records, null, 2));
  if (error) console.error(error);
}
check();
