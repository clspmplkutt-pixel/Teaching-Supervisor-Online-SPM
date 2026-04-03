import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import CryptoJS from 'crypto-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase URL or Key not found in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const SECRET_KEY = 'PNS2AREA';
const SECRET_IV = 'SyS4School';
const getKeyIv = () => {
    const keyHash = CryptoJS.SHA256(SECRET_KEY).toString(CryptoJS.enc.Hex);
    const ivHash = CryptoJS.SHA256(SECRET_IV).toString(CryptoJS.enc.Hex);
    return {
        key: CryptoJS.enc.Utf8.parse(keyHash.substring(0, 32)),
        iv: CryptoJS.enc.Utf8.parse(ivHash.substring(0, 16)),
    };
};

const decryptLegacyPassword = (encryptedText) => {
    const { key, iv } = getKeyIv();
    try {
        const inner = Buffer.from(encryptedText, 'base64').toString('utf8');
        const d = CryptoJS.AES.decrypt(inner, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
        const result = d.toString(CryptoJS.enc.Utf8);
        if (result) return { password: result, format: 'PHP (double base64)' };
    } catch { }
    try {
        const d = CryptoJS.AES.decrypt(encryptedText, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
        const result = d.toString(CryptoJS.enc.Utf8);
        if (result) return { password: result, format: 'JS (single base64)' };
    } catch { }
    return { password: null, format: 'Unknown' };
};

async function run() {
    console.log("Checking user 'คเณศวร' or 'วารี'...");
    const { data: data2 } = await supabase.from('tbl_Users').select('*').ilike('lastname', '%วารี%');
    console.log("By Lastname:");
     data2.forEach(u => {
        const dec = decryptLegacyPassword(u.passwd);
        console.log(`- ${u.name} ${u.lastname} (ID: ${u.people_id}): ${dec.password} [${dec.format}]`);
    });
}
run();
