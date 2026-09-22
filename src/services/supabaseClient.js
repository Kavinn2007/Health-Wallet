import { createClient } from '@supabase/supabase-js';

let supabaseClient = null;
let activeConfig = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  isConfigured: false
};
let configPromise = null;

/**
 * Initializes and retrieves the database configuration.
 * Priority:
 * 1. Vite environment variables (import.meta.env)
 * 2. Secure server endpoint (/api/config)
 * 3. Node.js process environment (process.env)
 */
export async function initDatabaseConfig() {
  if (configPromise) return configPromise;

  configPromise = (async () => {
    let url = '';
    let anonKey = '';

    // 1. Check Vite env if available
    try {
      if (typeof import.meta !== 'undefined' && import.meta.env) {
        url = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL || '';
        anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY || '';
      }
    } catch (e) {
      // Ignored in non-bundler environments
    }

    // 2. Fetch from /api/config if in browser and not set
    if (!url && typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          url = data.supabaseUrl || '';
          anonKey = data.supabaseAnonKey || '';
        }
      } catch (err) {
        console.warn('Could not fetch /api/config:', err.message);
      }
    }

    // 3. Check process.env in Node.js
    if (!url && typeof process !== 'undefined' && process.env) {
      url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
      anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
    }

    activeConfig.supabaseUrl = url.trim();
    activeConfig.supabaseAnonKey = anonKey.trim();

    if (activeConfig.supabaseUrl && activeConfig.supabaseAnonKey) {
      try {
        supabaseClient = createClient(activeConfig.supabaseUrl, activeConfig.supabaseAnonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false
          }
        });
        activeConfig.isConfigured = true;
        console.log('✓ Supabase PostgreSQL Client Connected Successfully');
      } catch (err) {
        console.error('Error creating Supabase client:', err.message);
        activeConfig.isConfigured = false;
      }
    } else if (!supabaseClient) {
      activeConfig.isConfigured = false;
    }

    return activeConfig;
  })();

  return configPromise;
}

export function getSupabase() {
  return supabaseClient;
}

export function setSupabaseClient(client) {
  supabaseClient = client;
  activeConfig.isConfigured = Boolean(client);
  if (client) {
    activeConfig.supabaseUrl = 'https://supabase.co';
    activeConfig.supabaseAnonKey = 'anon-key';
  }
}

export function isSupabaseConfigured() {
  return Boolean(activeConfig.isConfigured && supabaseClient);
}

export function getDatabaseConfig() {
  return activeConfig;
}

