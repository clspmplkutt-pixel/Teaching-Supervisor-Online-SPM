const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const result = String(reader.result || '');
    const base64 = result.split(',')[1] || '';
    resolve(base64);
  };
  reader.onerror = (err) => reject(err);
  reader.readAsDataURL(file);
});

export const uploadToDrive = async (file, options = {}) => {
  const uploadUrl = import.meta.env.VITE_GDRIVE_UPLOAD_URL;
  if (!uploadUrl) throw new Error('ยังไม่ได้ตั้งค่า VITE_GDRIVE_UPLOAD_URL');

  const base64Data = await fileToBase64(file);
  const envFolderId = import.meta.env.VITE_GDRIVE_FOLDER_ID;
  const envMakePublic = import.meta.env.VITE_GDRIVE_MAKE_PUBLIC;
  const payload = {
    filename: options.filename || file.name,
    mimeType: file.type,
    fileData: base64Data,
  };

  const folderId = options.folderId || envFolderId;
  if (folderId) payload.folderId = folderId;
  if (typeof options.makePublic !== 'undefined') {
    payload.makePublic = options.makePublic;
  } else if (typeof envMakePublic !== 'undefined') {
    payload.makePublic = String(envMakePublic) !== 'false';
  }

  let response;
  try {
    response = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });
  } catch (networkErr) {
    throw new Error(`เชื่อมต่อเซิร์ฟเวอร์อัปโหลดล้มเหลว: ${networkErr.message}`);
  }

  let rawText = '';
  try {
    rawText = await response.text();
  } catch {
    throw new Error('ไม่สามารถอ่านข้อมูลตอบกลับจากเซิร์ฟเวอร์ได้');
  }

  let result = null;
  try {
    result = JSON.parse(rawText);
  } catch {
    console.error('[driveUpload] Non-JSON response:', rawText.slice(0, 500));
    throw new Error('เซิร์ฟเวอร์อัปโหลดตอบกลับไม่ถูกรูปแบบ กรุณาลองอีกครั้ง');
  }

  if (!response.ok) {
    throw new Error(result?.message || `server error ${response.status}`);
  }

  if (result?.status === 'success') {
    return result.fileUrl || result.url || result.link || '';
  }

  throw new Error(result?.message || 'อัปโหลดล้มเหลว');
};
