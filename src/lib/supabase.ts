import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables');
}

// NOTE: keep client typing permissive until database.ts is regenerated
// from the live Supabase schema (to avoid false `never` errors).
export const supabase = createClient(
    supabaseUrl || '',
    supabaseAnonKey || ''
);
