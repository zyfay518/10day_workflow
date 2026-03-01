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
  try {
    console.log("Checking records...");
    const { data: records, error } = await supabase.from('records').select('id, content, url_slug, expenses(*)').order('created_at', { ascending: false }).limit(3);
    if (error) {
      console.error("Query error:", error);
    } else {
      console.log("Latest records:", JSON.stringify(records, null, 2));
    }
  } catch (err) {
    console.error("Caught error:", err);
  } finally {
    process.exit(0);
  }
}
check();
