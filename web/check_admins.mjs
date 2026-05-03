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
    // 1. Find distinct levels
    // Wait, Supabase RPC doesn't have distinct without a view, let's just fetch some users and group them or guess the admin level.
    // Usually admin might have level 1 or 2 or 9.
    
    // Let's fetch all users, it's probably not too many, or just fetch some users with specific levels
    const { data, error } = await supabase
        .from('tbl_Users')
        .select('people_id, name, lastname, level, school')
        // if level is a number, we can just sort by level or something. Let's fetch all users with level < 3 or level like 'admin'
        
    if (error) {
        console.error("❌ Error fetching users:", error.message);
        return;
    }

    if (!data) {
        console.log("No data");
        return;
    }

    const levels = {};
    for (const u of data) {
        if (!levels[u.level]) levels[u.level] = [];
        levels[u.level].push(u);
    }
    
    console.log("Found levels:", Object.keys(levels));
    
    for (const lvl of Object.keys(levels)) {
        console.log(`\n--- Level ${lvl} (${levels[lvl].length} users) ---`);
        for (let i = 0; i < Math.min(10, levels[lvl].length); i++) {
            const u = levels[lvl][i];
            console.log(`- ${u.people_id}: ${u.name} ${u.lastname} (School: ${u.school})`);
        }
    }
}

checkAdmins().catch(console.error);
