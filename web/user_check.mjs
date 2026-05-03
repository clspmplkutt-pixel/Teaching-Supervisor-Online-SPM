import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '/Users/analatkhankhen/Downloads/www/web/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.from('tbl_Users').select('birthday').eq('people_id', '1549900586755').single();
  console.log("Error:", error);
  console.log("Data:", data);
}
main();
