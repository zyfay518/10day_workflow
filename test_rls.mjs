import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
    console.log("Signing in...");
    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'zyfay0518@163.com',
        password: '123456',
    });
    if (error) throw error;
    
    console.log("Checking session...");
    const { data: sessionData } = await supabase.auth.getSession();
    console.log("Has session:", !!sessionData.session);
    
    console.log("Trying to list dimensions...");
    const { data: dims, error: dimErr } = await supabase.from('dimensions').select('*').eq('user_id', data.user.id);
    console.log("Current Dims:", dims?.length, "Error:", dimErr);
    
    // Test inserting one
    console.log("Trying to insert one dimension...");
    const { data: inserted, error: insertErr } = await supabase.from('dimensions').insert({
        user_id: data.user.id,
        dimension_name: 'TestDim',
        color_code: '#ffffff',
        icon_name: 'Test',
        display_order: 99
    }).select();
    
    console.log("Insert Result:", inserted, "Error:", insertErr);
}
test().catch(console.error);
