/**
 * LINE Webhook — ตั้งค่า URL นี้ใน LINE Developers Console:
 *   https://<host>/api/line-webhook
 *
 * ความสามารถ (ใช้ Reply message ทั้งหมด จึงไม่นับโควตา):
 *   • เมื่อเชิญบอทเข้ากลุ่ม → บอทตอบ "รหัสกลุ่ม" (groupId) เพื่อนำไปตั้งค่า LINE_GROUP_ID
 *   • พิมพ์ "รหัสกลุ่ม" หรือ "groupid" → บอทตอบ groupId อีกครั้ง
 *   • พิมพ์ "สรุปงาน" → บอทตอบสรุปงานนิเทศรอดำเนินการล่าสุด
 */
import { verifySignature, replyText } from './_lib/line.js';
import { buildDailyDigest } from './_lib/digest.js';

const ok = () => new Response('OK', { status: 200 });

const handleEvent = async (event) => {
  const source = event.source || {};
  const groupId = source.groupId || source.roomId || '';

  if (event.type === 'join' && event.replyToken) {
    await replyText(
      event.replyToken,
      '👋 สวัสดีครับ บอทระบบนิเทศออนไลน์ สพม.พิษณุโลก อุตรดิตถ์\n\n' +
        'บอทจะส่ง "สรุปงานนิเทศรอดำเนินการ" ทุกเช้าวันทำการ\n\n' +
        `🔑 รหัสกลุ่ม (สำหรับผู้ดูแลระบบ):\n${groupId || '-'}\n\n` +
        '💬 พิมพ์ "สรุปงาน" เพื่อดูสรุปล่าสุดได้ตลอดเวลา'
    );
    return;
  }

  if (event.type !== 'message' || event.message?.type !== 'text' || !event.replyToken) return;
  const text = String(event.message.text || '').trim().toLowerCase();

  if (['รหัสกลุ่ม', 'groupid', 'group id'].includes(text)) {
    await replyText(event.replyToken, `🔑 รหัสกลุ่มนี้:\n${groupId || '(ไม่ใช่กลุ่ม)'}`);
    return;
  }

  if (['สรุปงาน', 'สรุป', 'งานค้าง'].includes(text)) {
    const digest = await buildDailyDigest();
    await replyText(event.replyToken, digest.hasWork ? digest.text : '✅ ขณะนี้ไม่มีงานนิเทศค้างดำเนินการครับ');
  }
};

export async function POST(request) {
  const rawBody = await request.text();
  if (!verifySignature(rawBody, request.headers.get('x-line-signature'))) {
    return new Response('Invalid signature', { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody || '{}');
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  const results = await Promise.allSettled((payload.events || []).map(handleEvent));
  results
    .filter((r) => r.status === 'rejected')
    .forEach((r) => console.error('[line-webhook]', r.reason));

  return ok();
}

// LINE Console "Verify" ส่ง POST แต่บางครั้งเปิดผ่านเบราว์เซอร์เพื่อเช็ก
export function GET() {
  return new Response('LMSS LINE webhook is running', { status: 200 });
}
