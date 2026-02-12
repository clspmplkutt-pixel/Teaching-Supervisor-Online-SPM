import CryptoJS from 'crypto-js';

const SECRET_KEY = 'PNS2AREA';
const SECRET_IV = 'SyS4School';

export const encryptLegacyPassword = (plainText) => {
  const keyHash = CryptoJS.SHA256(SECRET_KEY).toString(CryptoJS.enc.Hex);
  const ivHash = CryptoJS.SHA256(SECRET_IV).toString(CryptoJS.enc.Hex);

  const key = CryptoJS.enc.Utf8.parse(keyHash.substring(0, 32));
  const iv = CryptoJS.enc.Utf8.parse(ivHash.substring(0, 16));

  return CryptoJS.AES.encrypt(plainText, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString();
};
