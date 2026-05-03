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
    console.log("Checking for 'admin' anywhere...");

    const { data: adminUsers, error } = await supabase
        .from('tbl_Users')
        .select('*')
        .or('level.ilike.%admin%,name.ilike.%admin%,people_id.ilike.%admin%');

    if (error) {
        console.error("Error:", error.message);
    } else {
        console.log("Admin matches:", adminUsers);
    }
}

checkAdmins().catch(console.error);
