import { put } from '@vercel/blob';

const MAX_RAW_BYTES = 3 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]);

function safeFileName(value) {
  const original = String(value || 'export.bin').trim();
  const cleaned = original
    .replace(/[\\/:*?"<>|\x00-\x1F]/g, '_')
    .replace(/\s+/g, ' ')
    .slice(0, 140);
  return cleaned || 'export.bin';
}

function publicBaseUrl(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return `${proto}://${host}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const fileName = safeFileName(body.fileName);
    const mimeType = String(body.mimeType || 'application/octet-stream');
    const encoded = typeof body.data === 'string' ? body.data : '';

    if (!ALLOWED_TYPES.has(mimeType)) {
      return res.status(400).json({ error: 'Unsupported export type' });
    }
    if (!encoded || !/^[A-Za-z0-9+/=]+$/.test(encoded)) {
      return res.status(400).json({ error: 'Invalid file payload' });
    }

    const fileBuffer = Buffer.from(encoded, 'base64');
    if (!fileBuffer.length) return res.status(400).json({ error: 'Empty file' });
    if (fileBuffer.length > MAX_RAW_BYTES) {
      return res.status(413).json({ error: 'Export exceeds the 3 MB native-download limit' });
    }

    const blob = await put(`telegram-exports/${Date.now()}-${fileName}`, fileBuffer, {
      access: 'public',
      contentType: mimeType,
      addRandomSuffix: true
    });

    const base = publicBaseUrl(req);
    const query = new URLSearchParams({ url: blob.url, name: fileName }).toString();
    return res.status(200).json({
      ok: true,
      downloadUrl: `${base}/api/export-download?${query}`
    });
  } catch (error) {
    console.error('export-upload failed', error);
    const missingBlob = /BLOB|token|store/i.test(String(error && error.message));
    return res.status(500).json({
      error: missingBlob
        ? 'Vercel Blob is not connected to this project yet.'
        : 'Could not prepare export file.'
    });
  }
}
