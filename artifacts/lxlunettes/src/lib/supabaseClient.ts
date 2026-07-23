import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_PUBLIC || '';

// Warn at startup if credentials are missing
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ [Supabase] Variables manquantes dans .env:\n' +
    (!supabaseUrl ? '  - VITE_SUPABASE_URL\n' : '') +
    (!supabaseAnonKey ? '  - VITE_SUPABASE_ANON_PUBLIC\n' : '') +
    'Toutes les opérations Supabase échoueront.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
