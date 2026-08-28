import { del } from '@vercel/blob';

function safeFileName(value) {
  const original = String(value || 'export.bin').trim();
  const cleaned = original
    .replace(/[\\/:*?"<>|\x00-\x1F]/g, '_')
    .replace(/\s+/g, ' ')
    .slice(0, 140);
  return cleaned || 'export.bin';
}

function isAllowedBlobUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && /(^|\.)blob\.vercel-storage\.com$/i.test(url.hostname);
  } catch (_) {
    return false;
  }
}

function asciiFileName(name) {
  return name.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', 'https://web.telegram.org');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(204).end();
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).end('Method not allowed');
  }

  const sourceUrl = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
  const fileName = safeFileName(Array.isArray(req.query.name) ? req.query.name[0] : req.query.name);
  if (!sourceUrl || !isAllowedBlobUrl(sourceUrl)) {
    return res.status(400).end('Invalid export URL');
  }

  try {
    const upstream = await fetch(sourceUrl, { cache: 'no-store' });
    if (!upstream.ok) return res.status(404).end('Export expired or unavailable');

    const data = Buffer.from(await upstream.arrayBuffer());
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const asciiName = asciiFileName(fileName);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', String(data.length));
    res.setHeader('Content-Disposition', `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.setHeader('Access-Control-Allow-Origin', 'https://web.telegram.org');
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // The function already has the bytes in memory, so remove the temporary public
    // Blob before replying. This keeps export storage from accumulating indefinitely.
    try { await del(sourceUrl); } catch (cleanupError) {
      console.warn('Temporary export cleanup failed', cleanupError);
    }

    return res.status(200).send(data);
  } catch (error) {
    console.error('export-download failed', error);
    return res.status(500).end('Could not download export');
  }
}
