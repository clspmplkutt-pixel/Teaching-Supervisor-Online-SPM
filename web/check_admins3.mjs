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
    console.log("Checking tbl_Users for 'admin' or 'root' levels...");

    const { data: users, error } = await supabase
        .from('tbl_Users')
        .select('people_id, name, lastname, level, school')
        .in('level', ['admin', 'root']);

    if (error) {
        console.error("Error:", error.message);
    } else {
        console.log("Users with level admin/root:", users);
    }
    
    console.log("Checking if there is a tbl_Admin table...");
    const { data: admins, error: adminErr } = await supabase
        .from('tbl_Admin')
        .select('*');
        
    if (adminErr) {
        console.log("tbl_Admin table might not exist or error:", adminErr.message);
    } else {
        console.log("tbl_Admin records:", admins);
    }
}

checkAdmins().catch(console.error);
