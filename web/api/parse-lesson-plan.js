/**
 * Vercel Serverless Function: /api/parse-lesson-plan
 *
 * Reads a teacher's lesson plan (PDF base64 or extracted text) using Google Gemini
 * Free Tier (with automatic model fallback) and returns structured JSON matching
 * SendPlan.jsx form fields.
 *
 * Required Vercel Environment Variable:
 *   GEMINI_API_KEY  — API Key from a Google AI Studio Free Tier project (no billing)
 *
 * Optional Environment Variable:
 *   GEMINI_MODELS   — Comma-separated fallback list (default: "gemini-3.5-flash-lite,gemini-3.5-flash")
 */

const DEFAULT_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash'];
const MAX_TEXT_CHARS = 45000;
const MAX_PDF_BASE64_CHARS = 4_600_000; // ~3.4 MB binary

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });

/**
 * Compute the next midnight in America/Los_Angeles (when Gemini Free Tier RPD resets)
 * and return both UTC timestamp and formatted Asia/Bangkok time string.
 */
const getNextPacificMidnightInfo = (now = new Date()) => {
  // Determine current Pacific calendar date (YYYY-MM-DD)
  const laParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const y = Number(laParts.find((p) => p.type === 'year')?.value);
  const m = Number(laParts.find((p) => p.type === 'month')?.value);
  const d = Number(laParts.find((p) => p.type === 'day')?.value);

  // Tomorrow in Pacific calendar; find the UTC instant corresponding to 00:00 America/Los_Angeles
  // Pacific offset is either UTC-8 (PST) or UTC-7 (PDT). Check both 07:00Z and 08:00Z.
  const candidates = [
    new Date(Date.UTC(y, m - 1, d + 1, 7, 0, 0)),
    new Date(Date.UTC(y, m - 1, d + 1, 8, 0, 0)),
  ];

  let resetDate = candidates[0];
  for (const cand of candidates) {
    const h = Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: '2-digit',
        hour12: false,
      }).format(cand)
    );
    if (h === 0 || h === 24) {
      resetDate = cand;
      break;
    }
  }

  const retryAfterSeconds = Math.max(60, Math.ceil((resetDate.getTime() - now.getTime()) / 1000));
  const resetTimeThai = new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(resetDate);

  return {
    resetAt: resetDate.toISOString(),
    retryAfterSeconds,
    resetTimeThai: `${resetTimeThai} น.`,
  };
};

/**
 * Inspect Gemini 429 / 503 error payload to classify RPM vs RPD and extract retryDelay.
 */
const classifyRateLimit = (errorPayload, headerRetryAfter) => {
  const errObj = errorPayload?.error || {};
  const msg = String(errObj.message || '').toLowerCase();
  const details = Array.isArray(errObj.details) ? errObj.details : [];

  let retrySeconds = 0;
  if (headerRetryAfter && /^\d+$/.test(String(headerRetryAfter).trim())) {
    retrySeconds = parseInt(String(headerRetryAfter).trim(), 10);
  }

  let isDaily = false;
  for (const detail of details) {
    if (detail?.retryDelay) {
      const match = String(detail.retryDelay).match(/(\d+(?:\.\d+)?)/);
      if (match) retrySeconds = Math.max(retrySeconds, Math.ceil(parseFloat(match[1])));
    }
    if (Array.isArray(detail?.violations)) {
      for (const v of detail.violations) {
        const qid = String(v?.quotaId || v?.quotaMetric || '').toLowerCase();
        if (qid.includes('day') || qid.includes('rpd') || qid.includes('daily')) {
          isDaily = true;
        }
      }
    }
  }

  if (
    msg.includes('per day') ||
    msg.includes('daily') ||
    msg.includes('rpd') ||
    retrySeconds > 3600
  ) {
    isDaily = true;
  }

  if (isDaily) {
    const info = getNextPacificMidnightInfo();
    return {
      errorType: 'RATE_LIMIT_DAILY',
      retryAfterSeconds: info.retryAfterSeconds,
      resetAt: info.resetAt,
      resetTimeThai: info.resetTimeThai,
      message: `โควตาระบบ AI ฟรีวันนี้ครบจำนวนแล้ว จะรีเซ็ตใช้งานได้อีกครั้งเวลา ${info.resetTimeThai} — คุณครูยังสามารถกรอกข้อมูลแผนการสอนด้วยตนเองได้ตามปกติ`,
    };
  }

  const waitSec = Math.min(Math.max(retrySeconds || 60, 15), 180);
  const resetAt = new Date(Date.now() + waitSec * 1000).toISOString();
  return {
    errorType: 'RATE_LIMIT_MINUTE',
    retryAfterSeconds: waitSec,
    resetAt,
    resetTimeThai: null,
    message: `ขณะนี้มีครูใช้งานระบบ AI พร้อมกันจำนวนมาก กรุณารอสักครู่แล้วกดลองใหม่ หรือสามารถกรอกข้อมูลด้วยตนเองด้านล่างได้ทันที`,
  };
};

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    teach_subject_id: { type: 'STRING', description: 'รหัสกลุ่มสาระการเรียนรู้จากรายการที่ให้ หากไม่แน่ใจให้เป็นค่าว่าง ""' },
    grade_level_id: { type: 'STRING', description: 'รหัสระดับชั้นจากรายการที่ให้ หากไม่แน่ใจให้เป็นค่าว่าง ""' },
    subject_type: { type: 'STRING', description: 'รหัสประเภทรายวิชา (เช่น 01 พื้นฐาน, 02 เพิ่มเติม) จากรายการที่ให้' },
    subject_code: { type: 'STRING', description: 'รหัสวิชา เช่น ว23103, ค21101, ท22101' },
    subject_name: { type: 'STRING', description: 'ชื่อรายวิชา เช่น คณิตศาสตร์พื้นฐาน, ภาษาไทย' },
    subject_content: { type: 'STRING', description: 'ชื่อหน่วยการเรียนรู้ เช่น หน่วยการเรียนรู้ที่ 1 เรื่อง ...' },
    subject_name_plan: { type: 'STRING', description: 'ชื่อแผนการจัดการเรียนรู้ / เรื่องที่สอน' },
    teach_date: { type: 'STRING', description: 'วันที่ทำการสอน รูปแบบ ค.ศ. YYYY-MM-DD (แปลงจาก พ.ศ. โดยลบ 543) หากไม่ระบุในแผนให้เป็น ""' },
    teach_timestart: { type: 'STRING', description: 'เวลาเริ่มสอน รูปแบบ 24 ชั่วโมง HH:MM เช่น 08:30 หากไม่ระบุให้เป็น ""' },
    teach_timeend: { type: 'STRING', description: 'เวลาสิ้นสุดการสอน รูปแบบ 24 ชั่วโมง HH:MM เช่น 09:20 หากไม่ระบุให้เป็น ""' },
    teach_minute: { type: 'STRING', description: 'จำนวนนาทีที่ใช้สอนเป็นตัวเลข เช่น 50, 60, 100 (1 คาบ/ชั่วโมง = 50 หรือ 60 นาทีตามที่ระบุในแผน)' },
    learning_model: { type: 'STRING', description: 'ชื่อรูปแบบการจัดการเรียนรู้ / วิธีการสอน เช่น Active Learning, 5E, GPAS 5 Steps, Project-Based Learning' },
    competency: { type: 'ARRAY', items: { type: 'STRING' }, description: 'รายการรหัสสมรรถนะสำคัญของผู้เรียนจากรายการที่ให้' },
    ability21: { type: 'ARRAY', items: { type: 'STRING' }, description: 'รายการรหัสทักษะในศตวรรษที่ 21 จากรายการที่ให้' },
    desirable: { type: 'ARRAY', items: { type: 'STRING' }, description: 'รายการรหัสคุณลักษณะอันพึงประสงค์จากรายการที่ให้' },
    objectives_knowledge: { type: 'STRING', description: 'จุดประสงค์การเรียนรู้ ด้านความรู้ (K)' },
    objectives_process: { type: 'STRING', description: 'จุดประสงค์การเรียนรู้ ด้านทักษะกระบวนการ (P)' },
    objectives_attribute: { type: 'STRING', description: 'จุดประสงค์การเรียนรู้ ด้านคุณลักษณะอันพึงประสงค์/เจตคติ (A)' },
    learning_outcomes: { type: 'STRING', description: 'มาตรฐานการเรียนรู้ / ตัวชี้วัด / ผลการเรียนรู้ / สาระสำคัญ' },
    learning_content: { type: 'STRING', description: 'สาระการเรียนรู้ / เนื้อหาที่สอน' },
    learning_activities: { type: 'STRING', description: 'กิจกรรมการเรียนรู้ สรุปเป็นขั้นตอนชัดเจน (เช่น ขั้นนำ ขั้นสอน/จัดกิจกรรม ขั้นสรุป)' },
    instructional_media: { type: 'STRING', description: 'สื่อการเรียนรู้ ใบงาน และแหล่งการเรียนรู้' },
    Measurement_how: { type: 'STRING', description: 'วิธีการวัดและประเมินผล' },
    Measurement_tools: { type: 'STRING', description: 'เครื่องมือวัดและประเมินผล' },
    Measurement_scoring: { type: 'STRING', description: 'เกณฑ์การให้คะแนน / เกณฑ์การประเมิน (Rubric)' },
    Measurement_outcomes: { type: 'STRING', description: 'เกณฑ์การผ่านการประเมิน / ผลลัพธ์การเรียนรู้ที่คาดหวัง' },
    indicator_codes: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'รหัสตัวชี้วัดหลักสูตรที่ปรากฏในแผน เช่น ["ว 4.1 ม.3/1", "ค 1.1 ม.1/2"]',
    },
  },
};

const buildPrompt = (options = {}) => {
  const fmtList = (arr, idKey, nameKey) =>
    (Array.isArray(arr) ? arr : [])
      .map((item) => `- "${item[idKey]}": ${item[nameKey]}`)
      .join('\n');

  return `คุณคือผู้เชี่ยวชาญด้านหลักสูตรแกนกลางการศึกษาขั้นพื้นฐานของไทย หน้าที่ของคุณคืออ่านเอกสาร "แผนการจัดการเรียนรู้" ที่แนบมา แล้วสกัดข้อมูลสำคัญออกมาเป็น JSON ตาม schema ที่กำหนดอย่างครบถ้วนและถูกต้อง

กฎสำคัญ:
1. ตอบเป็นภาษาไทยที่ถูกต้องตามต้นฉบับในแผนการจัดการเรียนรู้ (ห้ามแต่งข้อมูลที่ไม่มีในแผน หากช่องใดไม่มีในแผนจริง ๆ ให้ใส่ค่าว่าง "" หรือ [])
2. สำหรับช่องรหัสตัวเลือก (teach_subject_id, grade_level_id, subject_type, competency, ability21, desirable) ให้เลือกเฉพาะ "รหัส" ที่ตรงกับรายการอ้างอิงด้านล่างเท่านั้น
3. วันที่สอน (teach_date) หากในแผนเป็น พ.ศ. ให้แปลงเป็น ค.ศ. รูปแบบ YYYY-MM-DD (ลบ 543) หากไม่มีวันที่ให้ใส่ ""
4. กิจกรรมการเรียนรู้ (learning_activities) ให้สรุปกระชับ ชัดเจน ครบทุกขั้นตอน (ขั้นนำ / ขั้นสอน / ขั้นสรุป) พร้อมเวลาถ้ามี ไม่เกิน 3,000 ตัวอักษร
5. รหัสตัวชี้วัด (indicator_codes) ให้ดึงเฉพาะรหัสตัวชี้วัดที่ปรากฏในแผน เช่น "ว 4.1 ม.3/1", "ท 1.1 ม.2/3"

รายการตัวเลือกระบบ (ใช้รหัสในเครื่องหมายคำพูด):
[กลุ่มสาระการเรียนรู้ -> teach_subject_id]
${fmtList(options.teachSubject, 'teach_subject_id', 'teach_subject')}

[ระดับชั้น -> grade_level_id]
${fmtList(options.gradeLevel, 'grade_level_id', 'grade_level_name')}

[ประเภทรายวิชา -> subject_type]
${fmtList(options.subjectTypes, 'subjecttype_id', 'subjecttype_name')}

[สมรรถนะสำคัญของผู้เรียน -> competency]
${fmtList(options.competency, 'competency_id', 'competency_name')}

[ทักษะในศตวรรษที่ 21 -> ability21]
${fmtList(options.ability21, 'ability21_id', 'ability21_name_th')}

[คุณลักษณะอันพึงประสงค์ -> desirable]
${fmtList(options.desirable, 'desirable_id', 'desirable_name')}

[ตัวอย่างรูปแบบการจัดการเรียนรู้ -> learning_model]
${(Array.isArray(options.learningModel) ? options.learningModel : []).map((m) => m.model_name).filter(Boolean).slice(0, 30).join(', ')}
`;
};

const callGemini = async ({ apiKey, model, prompt, pdfBase64, extractedText }) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const parts = [{ text: prompt }];
  if (pdfBase64) {
    parts.push({
      inline_data: {
        mime_type: 'application/pdf',
        data: pdfBase64,
      },
    });
  } else if (extractedText) {
    parts.push({
      text: `\n\n--- เนื้อหาแผนการจัดการเรียนรู้ที่สกัดจาก PDF ---\n${extractedText.slice(0, MAX_TEXT_CHARS)}`,
    });
  }

  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const rawText = await res.text();
  let parsed = null;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    parsed = null;
  }

  return {
    ok: res.ok,
    status: res.status,
    retryAfterHeader: res.headers.get('retry-after'),
    data: parsed,
    rawText,
  };
};

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonResponse(
      {
        ok: false,
        errorType: 'MISSING_API_KEY',
        message: 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY บนระบบเซิร์ฟเวอร์ กรุณาติดต่อผู้ดูแลระบบ (คุณครูยังสามารถกรอกข้อมูลด้วยตนเองได้ตามปกติ)',
      },
      503
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, errorType: 'BAD_REQUEST', message: 'รูปแบบข้อมูลไม่ถูกต้อง' }, 400);
  }

  const pdfBase64 = typeof body?.pdfBase64 === 'string' ? body.pdfBase64.trim() : '';
  const extractedText = typeof body?.extractedText === 'string' ? body.extractedText.trim() : '';
  const options = body?.options && typeof body.options === 'object' ? body.options : {};

  if (!pdfBase64 && !extractedText) {
    return jsonResponse(
      { ok: false, errorType: 'BAD_REQUEST', message: 'ไม่พบข้อมูลไฟล์ PDF สำหรับวิเคราะห์' },
      400
    );
  }

  if (pdfBase64 && pdfBase64.length > MAX_PDF_BASE64_CHARS) {
    return jsonResponse(
      {
        ok: false,
        errorType: 'FILE_TOO_LARGE',
        message: 'ไฟล์ PDF มีขนาดใหญ่เกินขีดจำกัดสำหรับส่งตรง กรุณาลดขนาดไฟล์หรือกรอกข้อมูลด้วยตนเอง',
      },
      413
    );
  }

  const configuredModels = process.env.GEMINI_MODELS
    ? process.env.GEMINI_MODELS.split(',').map((s) => s.trim()).filter(Boolean)
    : DEFAULT_MODELS;

  const prompt = buildPrompt(options);
  let lastRateLimit = null;
  let lastErrorMsg = '';

  for (const model of configuredModels) {
    try {
      const result = await callGemini({ apiKey, model, prompt, pdfBase64, extractedText });

      if (result.ok) {
        const candidateText = result.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!candidateText) {
          lastErrorMsg = 'AI ไม่สามารถอ่านข้อความจากไฟล์ PDF นี้ได้';
          continue;
        }
        let extracted;
        try {
          extracted = JSON.parse(candidateText);
        } catch {
          // Strip possible markdown fences if any
          const cleaned = candidateText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
          extracted = JSON.parse(cleaned);
        }

        return jsonResponse({
          ok: true,
          model,
          extracted,
        });
      }

      if (result.status === 429 || result.status === 503) {
        const rl = classifyRateLimit(result.data, result.retryAfterHeader);
        // Prefer minute-limit if at least one model is only minute-limited; keep daily if all daily
        if (!lastRateLimit || (lastRateLimit.errorType === 'RATE_LIMIT_DAILY' && rl.errorType === 'RATE_LIMIT_MINUTE')) {
          lastRateLimit = rl;
        }
        console.warn(`[parse-lesson-plan] ${model} hit ${result.status} (${rl.errorType}), trying next model...`);
        continue;
      }

      lastErrorMsg = result.data?.error?.message || `Gemini HTTP ${result.status}`;
      console.error(`[parse-lesson-plan] ${model} failed:`, result.status, lastErrorMsg);
    } catch (err) {
      lastErrorMsg = err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ Gemini API';
      console.error(`[parse-lesson-plan] ${model} exception:`, err);
    }
  }

  if (lastRateLimit) {
    return jsonResponse({ ok: false, ...lastRateLimit }, 429);
  }

  return jsonResponse(
    {
      ok: false,
      errorType: 'PARSE_ERROR',
      message: lastErrorMsg || 'ไม่สามารถวิเคราะห์ไฟล์แผนการสอนได้ กรุณากรอกข้อมูลด้วยตนเอง',
    },
    502
  );
}

export function GET() {
  return jsonResponse({
    ok: true,
    service: 'parse-lesson-plan',
    configured: Boolean(process.env.GEMINI_API_KEY),
  });
}

