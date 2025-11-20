import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { config } from 'dotenv';
import path from 'path';

// Load .env from the backend directory (go up one level from /src)
config({ path: path.resolve(process.cwd(), '../.env') });

console.log('Current directory:', process.cwd());
console.log('NODE_ENV:', process.env.NODE_ENV);

// Load from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseKey) {
  console.log(supabaseUrl,supabaseKey)
  throw new Error('❌ Missing Supabase environment variables. Check SUPABASE_URL and SUPABASE_ANON_KEY.');
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('✅ Connected to Supabase successfully');

export default supabase;
