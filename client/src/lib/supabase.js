import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase URL and public key
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://your-supabase-url.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'your-public-key';

// Create a Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);
