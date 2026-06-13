import CryptoJS from 'crypto-js';

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

/**
 * เข้ารหัสแบบ PHP (double base64) — สำหรับ user ที่ migrate มาจาก PHP
 * PHP: base64_encode(openssl_encrypt(pass, AES-256-CBC, key, 0, iv))
 *   → openssl_encrypt with flag=0 คืนค่า base64 อยู่แล้ว
 *   → base64_encode() ครั้งที่ 2 → double base64
 */
export const encryptLegacyPasswordPHP = (plainText) => {
  const { key, iv } = getKeyIv();
  const singleB64 = CryptoJS.AES.encrypt(plainText, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString(); // ได้ base64 ชั้นที่ 1
  return btoa(singleB64); // base64 ชั้นที่ 2 (format PHP)
};

/**
 * เข้ารหัสแบบ JS (single base64) — สำหรับ user ที่สมัครผ่านเว็บใหม่
 */
export const encryptLegacyPassword = (plainText) => {
  const { key, iv } = getKeyIv();
  return CryptoJS.AES.encrypt(plainText, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString();
};

/**
 * ถอดรหัส password จาก DB (รองรับทั้ง PHP double base64 และ JS single base64)
 */
export const decryptLegacyPassword = (encryptedText) => {
  const { key, iv } = getKeyIv();
  try {
    // ลองเป็น double base64 (PHP format) ก่อน
    const inner = atob(encryptedText);
    const d = CryptoJS.AES.decrypt(inner, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
    const result = d.toString(CryptoJS.enc.Utf8);
    if (result) return result;
  } catch {
    // empty
  }
  try {
    // ลองเป็น single base64 (JS format)
    const d = CryptoJS.AES.decrypt(encryptedText, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
    return d.toString(CryptoJS.enc.Utf8) || null;
  } catch {
    // empty
  }
  return null;
};
