
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), 'web', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase URL or Key not found in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
    const userId = '1659900626497';
    console.log(`Checking for user: ${userId} in tbl_Users...`);

    const { data: userData, error: userError } = await supabase
        .from('tbl_Users')
        .select('*')
        .eq('people_id', userId)
        .single();

    if (userError) {
        console.error("Error fetching from tbl_Users:", userError);
    } else {
        console.log("Found in tbl_Users:", userData);
    }

    console.log(`Checking for user: ${userId} in tbl_user...`);
    const { data: adminData, error: adminError } = await supabase
        .from('tbl_user')
        .select('*')
        .eq('user', userId)
        .maybeSingle(); // Use maybeSingle to avoid error if not found

    if (adminError) {
        console.error("Error fetching from tbl_user:", adminError);
    } else if (adminData) {
        console.log("Found in tbl_user:", adminData);
    } else {
        console.log("Not found in tbl_user.");
    }
}

checkUser();
