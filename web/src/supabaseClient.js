import { createClient } from '@supabase/supabase-js'

// For development/demo purposes, you can force demo mode by setting VITE_DEMO_MODE=true
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const supabaseUrl = DEMO_MODE
    ? 'https://placeholder.supabase.co'
    : import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

// *** CRITICAL FIX ***
// Supabase client crashes if the URL is not a valid HTTP/HTTPS string.
// If the user hasn't set their URL yet, we use a placeholder that satisfies the validator.
// The AuthContext handles this by enabling "Demo Mode".
const isValidUrl = (url) => url && (url.startsWith('http://') || url.startsWith('https://'));
const safeUrl = isValidUrl(supabaseUrl) ? supabaseUrl : 'https://placeholder.supabase.co';

export const supabase = createClient(safeUrl, supabaseAnonKey)

