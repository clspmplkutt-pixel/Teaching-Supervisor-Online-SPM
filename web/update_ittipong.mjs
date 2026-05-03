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

async function findAndUpdate() {
    console.log("Searching for อิทธิพงษ์ in tbl_Users...");

    const { data: generalUser, error: findErr } = await supabase
        .from('tbl_Users')
        .select('people_id, name, lastname, passwd')
        .like('name', '%อิทธิพงษ์%');

    if (findErr) {
        console.error("Find Error:", findErr.message);
        return;
    }

    console.log("General User Found:", generalUser);
    
    if (generalUser && generalUser.length > 0) {
        const user = generalUser[0];
        const newUsername = user.people_id;
        const newPasswordHash = user.passwd;
        
        console.log(`Will update Admin user: Username -> ${newUsername}, Password -> ${newPasswordHash}`);
        
        const { data: updatedAdmin, error: updateErr } = await supabase
            .from('tbl_user')
            .update({ user: newUsername, passwd: newPasswordHash })
            .like('name', '%อิทธิพงษ์%')
            .select();
            
        if (updateErr) {
            console.error("Update Admin Error:", updateErr.message);
        } else {
            console.log("Admin User Updated Successfully:", updatedAdmin);
        }
    }
}

findAndUpdate().catch(console.error);
