/**
 * สร้างข้อความ "สรุปงานนิเทศรอดำเนินการ" ประจำวัน สำหรับส่งเข้า LINE Group
 *
 * สถานะแผน (tbl_sendplan.plan_status)
 *   1 = ส่งแผนแล้ว รอ ผอ. ตรวจ      4 = ส่งแก้ไขแล้ว รอ ผอ. ตรวจ
 *   2 = ผอ. อนุมัติ/แต่งตั้งกรรมการ รอครูส่งคลิป
 *   5 = ส่งคลิปแล้ว รอประเมิน         6 = กำลังประเมิน (กรรมการบางท่านประเมินแล้ว)
 *
 * กรรมการช่องที่ N ถือว่า "ค้างประเมิน" เมื่อ committeeN มีค่า และ date_scoringN ยังว่าง
 */
import { selectAll, selectIn } from './supabaseRest.js';

const TZ = 'Asia/Bangkok';
const SLOTS = [1, 2, 3, 4, 5];
const MAX_PEOPLE_LINES = 40;
const MAX_SCHOOL_LINES = 15;

const lookbackDays = () => Number(process.env.DIGEST_LOOKBACK_DAYS || 365);
const overdueDays = () => Number(process.env.DIGEST_OVERDUE_DAYS || 7);

export const getAppUrl = () => {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return '';
};

/** แปลงเวลาเป็นสตริงแบบ "YYYY-MM-DD HH:mm:ss" ตามเวลาไทย (รูปแบบเดียวกับ plan_senddate) */
const toLocalStamp = (date) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value])
  );
  const hour = parts.hour === '24' ? '00' : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day} ${hour}:${parts.minute}:${parts.second}`;
};

const daysAgoStamp = (days) => toLocalStamp(new Date(Date.now() - days * 86400000));

const thaiDateLabel = (date) =>
  new Intl.DateTimeFormat('th-TH', {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  }).format(date);

const isBlank = (v) => v === null || v === undefined || String(v).trim() === '' || String(v) === '0000-00-00';

/**
 * @returns {Promise<{ hasWork: boolean, text: string, stats: object }>}
 */
export const buildDailyDigest = async (now = new Date()) => {
  const sinceStamp = daysAgoStamp(lookbackDays());
  const overdueStamp = daysAgoStamp(overdueDays());
  const newStamp = daysAgoStamp(1);

  const slotCols = SLOTS.flatMap((n) => [`committee${n}`, `date_scoring${n}`]).join(',');
  const plans = await selectAll(
    'tbl_sendplan',
    `select=planid,people_id,school_code,plan_status,plan_senddate,${slotCols}` +
      `&plan_status=in.(1,2,4,5,6)` +
      `&plan_senddate=gte.${encodeURIComponent(sinceStamp)}`
  );

  const waitDirector = plans.filter((p) => ['1', '4'].includes(String(p.plan_status)));
  const waitClip = plans.filter((p) => String(p.plan_status) === '2');
  const evaluating = plans.filter((p) => ['5', '6'].includes(String(p.plan_status)));
  const newPlans = plans.filter((p) => String(p.plan_senddate || '') >= newStamp);

  // ── กรรมการที่ยังค้างประเมิน ──
  // ตรวจซ้ำกับคะแนนจริงใน tbl_sendplan_score (ข้อมูลเก่าบางแผนอาจไม่มี date_scoringN)
  const scoreRows = evaluating.length
    ? await selectIn('tbl_sendplan_score', 'planid,supervision', 'planid', evaluating.map((p) => p.planid))
    : [];
  const scoredKeys = new Set(scoreRows.map((s) => `${s.planid}|${s.supervision}`));

  const pendingByPerson = new Map(); // people_id -> { total, overdue }
  let pendingSlots = 0;
  evaluating.forEach((p) => {
    const overdue = String(p.plan_senddate || '') < overdueStamp;
    SLOTS.forEach((n) => {
      const pid = p[`committee${n}`];
      if (isBlank(pid) || !isBlank(p[`date_scoring${n}`])) return;
      if (scoredKeys.has(`${p.planid}|${pid}`)) return;
      const key = String(pid);
      const entry = pendingByPerson.get(key) || { total: 0, overdue: 0 };
      entry.total += 1;
      if (overdue) entry.overdue += 1;
      pendingByPerson.set(key, entry);
      pendingSlots += 1;
    });
  });

  // ── โรงเรียนที่มีแผนรอ ผอ. ตรวจ ──
  const directorBySchool = new Map();
  waitDirector.forEach((p) => {
    const key = String(p.school_code || '-');
    directorBySchool.set(key, (directorBySchool.get(key) || 0) + 1);
  });

  const stats = {
    newPlans: newPlans.length,
    waitDirector: waitDirector.length,
    waitClip: waitClip.length,
    evaluatingPlans: evaluating.length,
    pendingSlots,
    pendingPeople: pendingByPerson.size,
  };

  const hasWork = waitDirector.length > 0 || pendingSlots > 0;
  if (!hasWork) {
    return { hasWork, stats, text: '' };
  }

  // ── Lookups: ชื่อกรรมการ / คำนำหน้า / ชื่อโรงเรียน ──
  const [users, prefixes, schools] = await Promise.all([
    selectIn('tbl_Users', 'people_id,prefix,name,lastname', 'people_id', [...pendingByPerson.keys()]),
    selectAll('tbl_system_prefix', 'select=prefix_id,prefix'),
    selectIn('tbl_school', 'school_id,school_name', 'school_id', [...directorBySchool.keys()]),
  ]);

  const prefixMap = Object.fromEntries(prefixes.map((p) => [String(p.prefix_id), p.prefix]));
  const userMap = Object.fromEntries(
    users.map((u) => [
      String(u.people_id),
      `${prefixMap[String(u.prefix)] || ''}${u.name || ''} ${u.lastname || ''}`.trim(),
    ])
  );
  const schoolMap = Object.fromEntries(schools.map((s) => [String(s.school_id), s.school_name]));

  const appUrl = getAppUrl();
  const lines = [];
  lines.push('📋 สรุปงานนิเทศรอดำเนินการ');
  lines.push(`🗓 ${thaiDateLabel(now)}`);
  lines.push('ระบบนิเทศออนไลน์ สพม.พิษณุโลก อุตรดิตถ์');
  lines.push('');
  lines.push(`🆕 แผนส่งเข้าใหม่ (24 ชม.): ${newPlans.length} แผน`);

  if (waitDirector.length > 0) {
    lines.push('');
    lines.push(`🏫 รอ ผอ. ตรวจ/อนุมัติ: ${waitDirector.length} แผน`);
    const sortedSchools = [...directorBySchool.entries()].sort((a, b) => b[1] - a[1]);
    sortedSchools.slice(0, MAX_SCHOOL_LINES).forEach(([code, count]) => {
      const name = schoolMap[code] ? `โรงเรียน${schoolMap[code].replace(/^โรงเรียน/, '')}` : `รหัส ${code}`;
      lines.push(`  • ${name} — ${count} แผน`);
    });
    if (sortedSchools.length > MAX_SCHOOL_LINES) {
      lines.push(`  …และอีก ${sortedSchools.length - MAX_SCHOOL_LINES} โรงเรียน`);
    }
  }

  if (waitClip.length > 0) {
    lines.push('');
    lines.push(`🎬 แต่งตั้งกรรมการแล้ว รอครูส่งคลิป: ${waitClip.length} แผน`);
  }

  if (pendingSlots > 0) {
    lines.push('');
    lines.push(`✍️ รอคณะกรรมการประเมิน: ${evaluating.length} แผน (${pendingByPerson.size} ท่าน)`);
    const sortedPeople = [...pendingByPerson.entries()].sort(
      (a, b) => b[1].overdue - a[1].overdue || b[1].total - a[1].total
    );
    sortedPeople.slice(0, MAX_PEOPLE_LINES).forEach(([pid, info]) => {
      // ห้ามแสดง people_id (เลขบัตรประชาชน) ในกลุ่ม LINE
      const name = userMap[pid] || 'กรรมการ (ไม่พบชื่อในระบบ)';
      const overdueTag = info.overdue > 0 ? ` ⏰ค้าง>${overdueDays()}วัน ${info.overdue}` : '';
      lines.push(`  • ${name} — ${info.total} แผน${overdueTag}`);
    });
    if (sortedPeople.length > MAX_PEOPLE_LINES) {
      lines.push(`  …และอีก ${sortedPeople.length - MAX_PEOPLE_LINES} ท่าน`);
    }
  }

  lines.push('');
  if (appUrl) {
    lines.push(`🔗 เข้าตรวจ/ประเมิน: ${appUrl}/Plan_Check`);
  }
  lines.push('💬 พิมพ์ "สรุปงาน" ในกลุ่มเพื่อดูสรุปล่าสุดได้ตลอดเวลา');

  return { hasWork, stats, text: lines.join('\n') };
};
