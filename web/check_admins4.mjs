import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Supabase URL or Key not found in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAdmins() {
    console.log("Checking tbl_user for admin users...");

    const { data: admins, error } = await supabase
        .from('tbl_user')
        .select('*');

    if (error) {
        console.error("Error:", error.message);
    } else {
        console.log("Found admins in tbl_user:", admins);
    }
}

checkAdmins().catch(console.error);
