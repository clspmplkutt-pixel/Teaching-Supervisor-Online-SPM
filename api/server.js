import express from 'express';
import cors from 'cors';
import { google } from 'googleapis';
import { Readable } from 'stream';

const app = express();

const PORT = process.env.PORT || 8787;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const BODY_LIMIT = process.env.GDRIVE_BODY_LIMIT || '180mb';
const MAX_BYTES = Number(process.env.GDRIVE_MAX_BYTES || 0);
const FORWARD_URL = process.env.GDRIVE_FORWARD_URL || '';

app.use(cors({ origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(',') }));
app.use(express.json({ limit: BODY_LIMIT }));

const getServiceAccount = () => {
  if (process.env.GDRIVE_SERVICE_ACCOUNT_JSON_BASE64) {
    const raw = Buffer.from(process.env.GDRIVE_SERVICE_ACCOUNT_JSON_BASE64, 'base64').toString('utf8');
    return JSON.parse(raw);
  }
  if (process.env.GDRIVE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.GDRIVE_SERVICE_ACCOUNT_JSON);
  }

  const clientEmail = process.env.GDRIVE_CLIENT_EMAIL;
  const privateKey = process.env.GDRIVE_PRIVATE_KEY ? process.env.GDRIVE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined;
  if (clientEmail && privateKey) {
    return {
      client_email: clientEmail,
      private_key: privateKey,
    };
  }
  return null;
};

const getDriveClient = () => {
  const creds = getServiceAccount();
  if (!creds?.client_email || !creds?.private_key) {
    throw new Error('Missing Google Drive service account credentials');
  }
  const auth = new google.auth.JWT(
    creds.client_email,
    null,
    creds.private_key,
    ['https://www.googleapis.com/auth/drive']
  );
  return google.drive({ version: 'v3', auth });
};

const buildPublicUrl = (fileId) => `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;

app.post('/gdrive-upload', async (req, res) => {
  try {
    const { filename, mimeType, fileData, folderId } = req.body || {};
    // If configured, just forward to GAS (or any HTTP endpoint) to avoid client-side CORS
    if (FORWARD_URL) {
      const forwardRes = await fetch(FORWARD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body || {}),
      });
      const text = await forwardRes.text();
      let json = null;
      try { json = JSON.parse(text); } catch (e) { /* ignore */ }
      if (!forwardRes.ok) {
        return res.status(forwardRes.status).json(json || { status: 'error', message: text || 'Forward failed' });
      }
      return res.status(200).json(json || { status: 'success', raw: text });
    }

    if (!filename || !fileData) {
      return res.status(400).json({ status: 'error', message: 'Missing filename or fileData' });
    }

    const drive = getDriveClient();
    const folder = folderId || process.env.GDRIVE_FOLDER_ID || null;
    const sharedDriveId = process.env.GDRIVE_SHARED_DRIVE_ID || null;
    const allowPublic = String(process.env.GDRIVE_ALLOW_PUBLIC || 'true') === 'true';

    const buffer = Buffer.from(fileData, 'base64');
    if (!buffer.length) {
      return res.status(400).json({ status: 'error', message: 'Empty fileData' });
    }
    if (MAX_BYTES && buffer.length > MAX_BYTES) {
      return res.status(413).json({ status: 'error', message: 'File too large' });
    }

    const requestBody = { name: filename };
    if (folder) requestBody.parents = [folder];

    const createOptions = {
      requestBody,
      media: {
        mimeType: mimeType || 'application/octet-stream',
        body: Readable.from(buffer),
      },
      fields: 'id, name, webViewLink, webContentLink',
      supportsAllDrives: Boolean(sharedDriveId),
    };

    const createRes = await drive.files.create(createOptions);
    const fileId = createRes?.data?.id;

    if (!fileId) {
      return res.status(500).json({ status: 'error', message: 'Upload failed: missing file id' });
    }

    if (allowPublic) {
      await drive.permissions.create({
        fileId,
        requestBody: { role: 'reader', type: 'anyone' },
        supportsAllDrives: Boolean(sharedDriveId),
      });
    }

    const fileUrl = createRes?.data?.webViewLink || buildPublicUrl(fileId);
    return res.json({
      status: 'success',
      fileId,
      fileUrl,
      name: createRes?.data?.name || filename,
    });
  } catch (err) {
    console.error('gdrive-upload error:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Upload failed' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`GDrive upload server listening on port ${PORT}`);
});
