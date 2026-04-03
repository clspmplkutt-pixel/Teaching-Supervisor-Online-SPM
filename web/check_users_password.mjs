import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import CryptoJS from 'crypto-js';

// Load environment variables (.env อยู่ใน /web/)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') }); // override ด้วย .env.local ถ้ามี

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Supabase URL or Key not found in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ====== Legacy Crypto (same as legacyCrypto.js) ======
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
        // Double base64 (PHP format)
        const inner = Buffer.from(encryptedText, 'base64').toString('utf8');
        const d = CryptoJS.AES.decrypt(inner, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
        const result = d.toString(CryptoJS.enc.Utf8);
        if (result) return { password: result, format: 'PHP (double base64)' };
    } catch { }
    try {
        // Single base64 (JS format)
        const d = CryptoJS.AES.decrypt(encryptedText, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
        const result = d.toString(CryptoJS.enc.Utf8);
        if (result) return { password: result, format: 'JS (single base64)' };
    } catch { }
    return { password: null, format: 'ถอดรหัสไม่ได้' };
};
// =====================================================

// รายชื่อผู้ใช้ที่เข้าระบบไม่ได้
const usersToCheck = [
    'นายชัยณรงค์ อยู่จันทร์',
    'นางสาวรินรดา อินนาง',
    'นางสาวทักษพร ตระกูล',
];

async function checkUsers() {
    console.log('='.repeat(70));
    console.log('🔍 ตรวจสอบรหัสผ่านผู้ใช้ที่เข้าระบบไม่ได้');
    console.log('='.repeat(70));

    for (const fullName of usersToCheck) {
        // แยก firstname / lastname
        const nameParts = fullName.trim().split(' ');
        const lastName = nameParts[nameParts.length - 1];
        const firstName = nameParts.slice(0, -1).join(' ');

        console.log(`\n👤 ${fullName}`);
        console.log(`   ค้นหาด้วย: ชื่อ="${firstName}" | นามสกุล="${lastName}"`);

        const { data, error } = await supabase
            .from('tbl_Users')
            .select('people_id, name, lastname, passwd, level, school')
            .ilike('lastname', `%${lastName}%`)
            .limit(5);

        if (error) {
            console.log(`   ❌ Error: ${error.message}`);
            continue;
        }

        if (!data || data.length === 0) {
            console.log(`   ⚠️  ไม่พบข้อมูลในระบบ (ลองค้นหาด้วยนามสกุล: ${lastName})`);
            continue;
        }

        for (const user of data) {
            const decrypted = decryptLegacyPassword(user.passwd);
            console.log(`   ✅ พบ: ${user.name} ${user.lastname}`);
            console.log(`      - people_id (username): ${user.people_id}`);
            console.log(`      - รหัสผ่าน             : ${decrypted.password ?? '(ถอดรหัสไม่ได้)'}`);
            console.log(`      - format               : ${decrypted.format}`);
            console.log(`      - ระดับสิทธิ์           : ${user.level}`);
        }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ ตรวจสอบเสร็จสิ้น');
    console.log('='.repeat(70));
}

checkUsers().catch(console.error);
