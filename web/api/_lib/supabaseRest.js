/**
 * Minimal Supabase REST (PostgREST) client for Vercel Serverless Functions.
 * ไม่พึ่ง dependency ภายนอก ใช้ fetch ของ Node 18+
 *
 * ENV:
 *   SUPABASE_URL                (fallback: VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY   (fallback: VITE_SUPABASE_ANON_KEY)
 */

const PAGE_SIZE = 1000;

const getConfig = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY environment variables');
  }
  return { url: url.replace(/\/$/, ''), key };
};

/**
 * ดึงข้อมูลทั้งหมดจากตาราง (รองรับแบ่งหน้าอัตโนมัติเกิน 1,000 แถว)
 * @param {string} table ชื่อตาราง
 * @param {string} query query string แบบ PostgREST เช่น "select=a,b&status=in.(1,2)"
 */
export const selectAll = async (table, query) => {
  const { url, key } = getConfig();
  const rows = [];
  let from = 0;

  while (true) {
    const res = await fetch(`${url}/rest/v1/${encodeURIComponent(table)}?${query}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Range: `${from}-${from + PAGE_SIZE - 1}`,
        'Range-Unit': 'items',
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Supabase ${table} query failed (${res.status}): ${body}`);
    }
    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
};

/** ดึงข้อมูลแบบ IN (...) โดยแบ่งเป็นชุดละ 100 ค่า เพื่อไม่ให้ URL ยาวเกิน */
export const selectIn = async (table, select, column, values) => {
  const unique = [...new Set(values.filter((v) => v !== null && v !== undefined && v !== ''))].map(String);
  const out = [];
  for (let i = 0; i < unique.length; i += 100) {
    const chunk = unique.slice(i, i + 100).map((v) => `"${v.replace(/"/g, '')}"`).join(',');
    const rows = await selectAll(table, `select=${select}&${column}=in.(${encodeURIComponent(chunk)})`);
    out.push(...rows);
  }
  return out;
};
