import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    console.log('=== tbl_system_Teach_Subject ===');
    const { data: subjects } = await supabase
        .from('tbl_system_Teach_Subject')
        .select('*')
        .order('teach_subject_id', { ascending: true });
    console.table(subjects);

    console.log('\n=== tbl_system_SubjectType ===');
    const { data: types } = await supabase
        .from('tbl_system_SubjectType')
        .select('*')
        .order('id', { ascending: true });
    console.table(types);

    console.log('\n=== tbl_type_indicators ===');
    const { data: indTypes } = await supabase
        .from('tbl_type_indicators')
        .select('*')
        .order('indicator_id', { ascending: true });
    console.table(indTypes);

    console.log('\n=== tbl_sendplan columns (sample) ===');
    const { data: sample } = await supabase
        .from('tbl_sendplan')
        .select('*')
        .limit(1);
    if (sample && sample.length > 0) {
        console.log('Columns:', Object.keys(sample[0]));
    }
}

check().catch(console.error);
