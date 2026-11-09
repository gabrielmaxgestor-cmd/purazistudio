import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente do Supabase.
 * Configure na Vercel (Settings → Environment Variables):
 *   VITE_SUPABASE_URL       = https://xxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY  = a chave "anon / publishable" do projeto
 * A chave anon é PÚBLICA por design: quem protege os dados são as regras (RLS) e as funções do banco.
 * NUNCA coloque a chave "service_role" no site.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseEnabled = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = supabaseEnabled
  ? createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  : null;
