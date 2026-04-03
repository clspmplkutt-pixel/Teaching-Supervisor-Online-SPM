import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import CryptoJS from 'crypto-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

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
        if (result) return { password: result, format: 'PHP' };
    } catch { }
    try {
        const d = CryptoJS.AES.decrypt(encryptedText, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
        const result = d.toString(CryptoJS.enc.Utf8);
        if (result) return { password: result, format: 'JS' };
    } catch { }
    return { password: null, format: 'ถอดรหัสไม่ได้' };
};

async function search() {
    // ค้นหาด้วยชื่อ "คเณศวร"
    const { data } = await supabase
        .from('tbl_Users')
        .select('people_id, name, lastname, passwd, level')
        .ilike('name', '%คเณศวร%');

    console.log('🔍 ค้นหา "คเณศวร" ในฐานข้อมูล:');
    if (!data || data.length === 0) {
        console.log('   ❌ ไม่พบ');
    } else {
        for (const u of data) {
            const dec = decryptLegacyPassword(u.passwd);
            console.log(`   ✅ ${u.name} ${u.lastname}`);
            console.log(`      Username: ${u.people_id} | รหัสผ่าน: ${dec.password} | สิทธิ์: ${u.level}`);
        }
    }
}

search().catch(console.error);
