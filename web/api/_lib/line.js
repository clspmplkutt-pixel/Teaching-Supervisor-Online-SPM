/**
 * LINE Messaging API helpers (แทน LINE Notify ที่ปิดบริการแล้ว)
 *
 * ENV:
 *   LINE_CHANNEL_ACCESS_TOKEN  Channel access token (long-lived) ของ LINE Official Account
 *   LINE_CHANNEL_SECRET        Channel secret (ใช้ตรวจลายเซ็น webhook)
 *   LINE_GROUP_ID              รหัสกลุ่ม LINE ที่จะส่งสรุป (ได้จากบอทหลังเชิญเข้ากลุ่ม)
 */
import crypto from 'node:crypto';

const LINE_API = 'https://api.line.me/v2/bot/message';
const MAX_TEXT = 4900; // LINE จำกัด 5,000 ตัวอักษรต่อข้อความ

const getToken = () => {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error('Missing LINE_CHANNEL_ACCESS_TOKEN environment variable');
  return token;
};

const toMessages = (text) => {
  const safe = text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT - 20)}\n…(ตัดข้อความ)` : text;
  return [{ type: 'text', text: safe }];
};

const callLine = async (endpoint, payload) => {
  const res = await fetch(`${LINE_API}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LINE ${endpoint} failed (${res.status}): ${body}`);
  }
};

/** Push message — นับโควตาตามจำนวนสมาชิกในกลุ่ม */
export const pushText = (to, text) => callLine('push', { to, messages: toMessages(text) });

/** Reply message — ตอบกลับเหตุการณ์ใน webhook (ไม่นับโควตา) */
export const replyText = (replyToken, text) => callLine('reply', { replyToken, messages: toMessages(text) });

/** ตรวจสอบลายเซ็น X-Line-Signature ของ webhook */
export const verifySignature = (rawBody, signature) => {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
