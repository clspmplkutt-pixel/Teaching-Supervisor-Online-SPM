/**
 * Client-side PDF preparation for AI Lesson Plan parsing.
 *
 * Strategy:
 *  - Files <= 3.2 MB: send raw PDF base64 directly so Gemini's native multimodal
 *    PDF reader handles Thai diacritics (สระ/วรรณยุกต์), tables, and scans accurately.
 *  - Files > 3.2 MB (up to 25 MB): lazy-load pdfjs-dist in the browser and extract
 *    plain text from up to 35 pages to stay well under Vercel's 4.5 MB body limit.
 */

export const MAX_DIRECT_PDF_BYTES = Math.floor(3.2 * 1024 * 1024); // ~3.2 MB binary -> ~4.3 MB base64
const MAX_PAGES_TO_EXTRACT = 35;

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ PDF ได้'));
    reader.readAsDataURL(file);
  });

const extractTextWithPdfJs = async (file) => {
  const [pdfjsLib, workerModule] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);

  if (pdfjsLib.GlobalWorkerOptions && workerModule?.default) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default;
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;

  const pageLimit = Math.min(pdf.numPages, MAX_PAGES_TO_EXTRACT);
  const chunks = [];

  for (let pageNum = 1; pageNum <= pageLimit; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = (content.items || [])
      .map((item) => (typeof item.str === 'string' ? item.str : ''))
      .join(' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (pageText) {
      chunks.push(`--- หน้า ${pageNum} ---\n${pageText}`);
    }
  }

  return {
    text: chunks.join('\n\n'),
    pageCount: pdf.numPages,
    extractedPages: pageLimit,
  };
};

/**
 * Prepare payload for /api/parse-lesson-plan from a browser File object.
 * @param {File} file
 * @returns {Promise<{ mode: 'pdf' | 'text', pdfBase64?: string, extractedText?: string, pageCount?: number }>}
 */
export const preparePdfForAi = async (file) => {
  if (!file) {
    throw new Error('กรุณาเลือกไฟล์ PDF ก่อน');
  }

  if (file.size <= MAX_DIRECT_PDF_BYTES) {
    const pdfBase64 = await fileToBase64(file);
    return { mode: 'pdf', pdfBase64 };
  }

  const { text, pageCount, extractedPages } = await extractTextWithPdfJs(file);
  if (!text || text.trim().length < 80) {
    throw new Error(
      `ไฟล์ PDF นี้มีขนาด ${(file.size / 1024 / 1024).toFixed(1)} MB และเป็นไฟล์สแกนภาพ (ไม่มีข้อความในไฟล์) — ระบบส่งไฟล์ภาพตรงได้ไม่เกิน 3.2 MB กรุณาย่อขนาดไฟล์ PDF หรือกรอกข้อมูลด้วยตนเองด้านล่างครับ`
    );
  }

  return {
    mode: 'text',
    extractedText: text,
    pageCount,
    extractedPages,
  };
};

