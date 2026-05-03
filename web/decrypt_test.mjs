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

console.log(decryptLegacyPassword('pF4AlOmWa7fJv7WiB9uAog=='));
