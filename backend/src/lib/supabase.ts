// ==============================================================================
// PeoplePay360: Supabase Client Initializer
// ==============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// If running in Node.js environment, load dotenv
if (typeof process !== 'undefined' && process.env) {
  try {
    const { config } = await import('dotenv');
    config();
  } catch {
    // Ignore in browsers / bundlers
  }
}

const rawUrl =
  (typeof process !== 'undefined' && (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL)) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
  'https://mock.supabase.co';

const rawKey =
  (typeof process !== 'undefined' && (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY)) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
  'mock-anon-key';

// Normalize URL: remove trailing /rest/v1 or trailing slashes
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseKey = rawKey;

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Helper to check if real Supabase credentials are configured
 */
export function isSupabaseConfigured(): boolean {
  return (
    Boolean(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL) &&
    !supabaseUrl.includes('mock.supabase.co')
  );
}

export { supabaseUrl, supabaseKey };
