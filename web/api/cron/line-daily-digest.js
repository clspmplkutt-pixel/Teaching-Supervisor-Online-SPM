/**
 * Vercel Cron: ส่งสรุปงานนิเทศรอดำเนินการเข้า LINE Group ทุกเช้าวันทำการ
 * ตารางเวลากำหนดใน web/vercel.json ("crons")
 *
 * ทดสอบโดยไม่ส่งจริง:
 *   curl -H "Authorization: Bearer $CRON_SECRET" "https://<host>/api/cron/line-daily-digest?dry=1"
 */
import { buildDailyDigest } from '../_lib/digest.js';
import { pushText } from '../_lib/line.js';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return json({ ok: false, error: 'Unauthorized' }, 401);
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get('dry') === '1';
  const force = url.searchParams.get('force') === '1';

  try {
    const digest = await buildDailyDigest();

    if (!digest.hasWork && !force) {
      return json({ ok: true, sent: false, reason: 'ไม่มีงานค้าง — ไม่ส่งข้อความ', stats: digest.stats });
    }

    const text = digest.text || '✅ วันนี้ไม่มีงานนิเทศค้างดำเนินการ';

    if (dryRun) {
      return json({ ok: true, sent: false, dryRun: true, stats: digest.stats, text });
    }

    const groupId = process.env.LINE_GROUP_ID;
    if (!groupId) {
      return json({ ok: false, error: 'Missing LINE_GROUP_ID environment variable', stats: digest.stats }, 500);
    }

    await pushText(groupId, text);
    return json({ ok: true, sent: true, stats: digest.stats });
  } catch (err) {
    console.error('[line-daily-digest]', err);
    return json({ ok: false, error: String(err?.message || err) }, 500);
  }
}
