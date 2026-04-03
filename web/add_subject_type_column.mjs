import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addColumn() {
    // Check if column already exists by trying to select it
    const { data, error } = await supabase
        .from('tbl_sendplan')
        .select('subject_type')
        .limit(1);

    if (error && error.message.includes('subject_type')) {
        console.log('❌ Column subject_type does not exist yet.');
        console.log('⚠️  Please add it via Supabase Dashboard SQL Editor:');
        console.log('');
        console.log('ALTER TABLE tbl_sendplan ADD COLUMN subject_type VARCHAR(10) DEFAULT \'01\';');
        console.log('');
        console.log('Or run this RPC if you have a migration function set up.');
    } else {
        console.log('✅ Column subject_type already exists in tbl_sendplan');
        console.log('   Current sample value:', data?.[0]?.subject_type ?? '(null)');
    }
}

addColumn().catch(console.error);
