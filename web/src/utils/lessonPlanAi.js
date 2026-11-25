/**
 * Client helper for calling /api/parse-lesson-plan, normalizing AI output
 * to SendPlan.jsx form fields, matching curriculum indicators, and formatting
 * Free Tier countdown timers.
 */

import { preparePdfForAi } from './pdfLessonExtractor.js';

const FIELD_LABELS = {
  teach_subject_id: 'กลุ่มสาระฯ',
  grade_level_id: 'ระดับชั้น',
  subject_type: 'ประเภทวิชา',
  subject_code: 'รหัสวิชา',
  subject_name: 'ชื่อรายวิชา',
  subject_content: 'หน่วยการเรียนรู้',
  subject_name_plan: 'ชื่อแผนการสอน',
  teach_date: 'วันที่สอน',
  teach_timestart: 'เวลาเริ่มสอน',
  teach_timeend: 'เวลาเสร็จสิ้น',
  teach_minute: 'จำนวนนาที',
  learning_model: 'รูปแบบการสอน',
  competency: 'สมรรถนะสำคัญ',
  ability21: 'ทักษะศตวรรษที่ 21',
  desirable: 'คุณลักษณะฯ',
  objectives_knowledge: 'จุดประสงค์ (K)',
  objectives_process: 'จุดประสงค์ (P)',
  objectives_attribute: 'จุดประสงค์ (A)',
  learning_outcomes: 'มาตรฐาน/ผลการเรียนรู้',
  learning_content: 'สาระการเรียนรู้',
  learning_activities: 'กิจกรรมการเรียนรู้',
  instructional_media: 'สื่อการเรียนรู้',
  Measurement_how: 'วิธีการวัดผล',
  Measurement_tools: 'เครื่องมือวัดผล',
  Measurement_scoring: 'เกณฑ์การให้คะแนน',
  Measurement_outcomes: 'เกณฑ์การผ่าน',
  indicators_mid: 'ตัวชี้วัดระหว่างทาง',
  indicators_final: 'ตัวชี้วัดปลายทาง',
};

const normalizeDateAD = (raw) => {
  if (!raw) return '';
  const s = String(raw).trim();
  const matchYMD = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (matchYMD) {
    let y = parseInt(matchYMD[1], 10);
    if (y > 2400) y -= 543;
    if (y < 1990 || y > 2100) return '';
    return `${y}-${matchYMD[2].padStart(2, '0')}-${matchYMD[3].padStart(2, '0')}`;
  }
  const matchDMY = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (matchDMY) {
    let y = parseInt(matchDMY[3], 10);
    if (y > 2400) y -= 543;
    if (y < 1990 || y > 2100) return '';
    return `${y}-${matchDMY[2].padStart(2, '0')}-${matchDMY[1].padStart(2, '0')}`;
  }
  return '';
};

const normalizeTimeHHMM = (raw) => {
  if (!raw) return '';
  const match = String(raw).trim().match(/(\d{1,2})[:.](\d{2})/);
  if (!match) return '';
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return '';
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const normalizeIndicatorCode = (code) =>
  String(code || '')
    .replace(/\s+/g, '')
    .replace(/[–—]/g, '-')
    .toLowerCase();

/**
 * Match extracted indicator codes (e.g. ["ว 4.1 ม.3/1"]) against DB rows in tbl_indicators.
 */
export const matchIndicatorsFromCodes = (codes = [], indicatorRows = []) => {
  if (!Array.isArray(codes) || codes.length === 0 || !Array.isArray(indicatorRows) || indicatorRows.length === 0) {
    return { mid: [], final: [] };
  }

  const normCodes = codes.map(normalizeIndicatorCode).filter(Boolean);
  const mid = new Set();
  const final = new Set();

  for (const row of indicatorRows) {
    const name = String(row.indicators_name || '').trim();
    if (!name) continue;
    const normName = normalizeIndicatorCode(name);
    const matched = normCodes.some((c) => normName === c || normName.includes(c) || c.includes(normName));
    if (matched) {
      if (String(row.indicator_id) === '1') mid.add(name);
      else if (String(row.indicator_id) === '2') final.add(name);
    }
  }

  return {
    mid: Array.from(mid),
    final: Array.from(final),
  };
};

/**
 * Sanitize raw Gemini JSON against SendPlan master options.
 */
export const sanitizeExtractedPlan = (raw = {}, options = {}) => {
  const validSubjectIds = new Set((options.teachSubject || []).map((o) => String(o.teach_subject_id)));
  const validGradeIds = new Set((options.gradeLevel || []).map((o) => String(o.grade_level_id)));
  const validSubjectTypes = new Set((options.subjectTypes || []).map((o) => String(o.subjecttype_id)));
  const validCompIds = new Set((options.competency || []).map((o) => String(o.competency_id)));
  const validAbilIds = new Set((options.ability21 || []).map((o) => String(o.ability21_id)));
  const validDesIds = new Set((options.desirable || []).map((o) => String(o.desirable_id)));

  const cleanStr = (v) => (typeof v === 'string' ? v.trim() : '');
  const filterIds = (arr, validSet) =>
    Array.isArray(arr)
      ? Array.from(new Set(arr.map((v) => String(v).trim()).filter((v) => validSet.has(v))))
      : [];

  const teach_timestart = normalizeTimeHHMM(raw.teach_timestart);
  const teach_timeend = normalizeTimeHHMM(raw.teach_timeend);
  let teach_minute = String(raw.teach_minute || '').replace(/\D/g, '');
  if (!teach_minute && teach_timestart && teach_timeend) {
    const [sh, sm] = teach_timestart.split(':').map(Number);
    const [eh, em] = teach_timeend.split(':').map(Number);
    const diff = eh * 60 + em - (sh * 60 + sm);
    if (diff > 0 && diff <= 480) teach_minute = String(diff);
  }

  const rawSubjectId = cleanStr(raw.teach_subject_id);
  const rawGradeId = cleanStr(raw.grade_level_id);
  const rawSubjectType = cleanStr(raw.subject_type);

  return {
    teach_subject_id: validSubjectIds.has(rawSubjectId) ? rawSubjectId : '',
    grade_level_id: validGradeIds.has(rawGradeId) ? rawGradeId : '',
    subject_type: validSubjectTypes.has(rawSubjectType) ? rawSubjectType : '',
    subject_code: cleanStr(raw.subject_code),
    subject_name: cleanStr(raw.subject_name),
    subject_content: cleanStr(raw.subject_content),
    subject_name_plan: cleanStr(raw.subject_name_plan),
    teach_date: normalizeDateAD(raw.teach_date),
    teach_timestart,
    teach_timeend,
    teach_minute,
    learning_model: cleanStr(raw.learning_model),
    competency: filterIds(raw.competency, validCompIds),
    ability21: filterIds(raw.ability21, validAbilIds),
    desirable: filterIds(raw.desirable, validDesIds),
    objectives_knowledge: cleanStr(raw.objectives_knowledge),
    objectives_process: cleanStr(raw.objectives_process),
    objectives_attribute: cleanStr(raw.objectives_attribute),
    learning_outcomes: cleanStr(raw.learning_outcomes),
    learning_content: cleanStr(raw.learning_content),
    learning_activities: cleanStr(raw.learning_activities),
    instructional_media: cleanStr(raw.instructional_media),
    Measurement_how: cleanStr(raw.Measurement_how),
    Measurement_tools: cleanStr(raw.Measurement_tools),
    Measurement_scoring: cleanStr(raw.Measurement_scoring),
    Measurement_outcomes: cleanStr(raw.Measurement_outcomes),
    indicator_codes: Array.isArray(raw.indicator_codes)
      ? raw.indicator_codes.map((c) => String(c).trim()).filter(Boolean)
      : [],
  };
};

/**
 * Merge sanitized AI fields into current form state.
 * @param {object} currentForm
 * @param {object} extracted
 * @param {'overwrite' | 'emptyOnly'} mode
 */
export const mergeExtractedIntoForm = (currentForm, extracted, mode = 'overwrite') => {
  const next = { ...currentForm };
  const filledKeys = [];
  const missingKeys = [];

  for (const [key, label] of Object.entries(FIELD_LABELS)) {
    if (key === 'indicators_mid' || key === 'indicators_final') continue;
    const incoming = extracted[key];
    const hasIncoming = Array.isArray(incoming) ? incoming.length > 0 : Boolean(incoming);
    if (!hasIncoming) {
      missingKeys.push(label);
      continue;
    }

    const existing = currentForm[key];
    const hasExisting = Array.isArray(existing) ? existing.length > 0 : Boolean(String(existing || '').trim());

    if (mode === 'emptyOnly' && hasExisting) continue;
    next[key] = incoming;
    filledKeys.push(label);
  }

  return { nextForm: next, filledLabels: filledKeys, missingLabels: missingKeys };
};

/**
 * Format countdown seconds into Thai human-readable string.
 */
export const formatThaiCountdown = (totalSeconds) => {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h} ชม. ${String(m).padStart(2, '0')} นาที ${String(s).padStart(2, '0')} วินาที`;
  }
  if (m > 0) {
    return `${m} นาที ${String(s).padStart(2, '0')} วินาที`;
  }
  return `${s} วินาที`;
};

/**
 * End-to-end call: prepare PDF -> POST /api/parse-lesson-plan -> sanitize.
 */
export const parseLessonPlanPdfWithAi = async (file, options) => {
  const prepared = await preparePdfForAi(file);

  const response = await fetch('/api/parse-lesson-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      pdfBase64: prepared.pdfBase64 || '',
      extractedText: prepared.extractedText || '',
      options: {
        teachSubject: options.teachSubject || [],
        gradeLevel: options.gradeLevel || [],
        subjectTypes: options.subjectTypes || [],
        competency: options.competency || [],
        ability21: options.ability21 || [],
        desirable: options.desirable || [],
        learningModel: options.learningModel || [],
      },
    }),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.ok) {
    const err = new Error(
      payload?.message ||
        (response.status === 404
          ? 'ยังไม่พบบริการ AI บนสภาพแวดล้อมนี้ (กรุณาใช้งานบนระบบที่ deploy แล้วพร้อมตั้งค่า GEMINI_API_KEY)'
          : `ไม่สามารถวิเคราะห์แผนการสอนได้ (HTTP ${response.status})`)
    );
    err.errorType = payload?.errorType || 'PARSE_ERROR';
    err.retryAfterSeconds = payload?.retryAfterSeconds || 0;
    err.resetAt = payload?.resetAt || null;
    err.resetTimeThai = payload?.resetTimeThai || null;
    throw err;
  }

  const sanitized = sanitizeExtractedPlan(payload.extracted, options);
  return {
    extracted: sanitized,
    model: payload.model,
    mode: prepared.mode,
  };
};
