import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';

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

function exactArrayBuffer(buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Allow': 'POST' }
    });
  }

  try {
    const body = await req.json();
    const fileName = safeFileName(body?.fileName);
    const mimeType = String(body?.mimeType || 'application/octet-stream');
    const encoded = typeof body?.data === 'string' ? body.data : '';

    if (!ALLOWED_TYPES.has(mimeType)) {
      return Response.json({ error: 'Unsupported export type' }, { status: 400 });
    }
    if (!encoded || !/^[A-Za-z0-9+/=]+$/.test(encoded)) {
      return Response.json({ error: 'Invalid file payload' }, { status: 400 });
    }

    const fileBuffer = Buffer.from(encoded, 'base64');
    if (!fileBuffer.length) {
      return Response.json({ error: 'Empty file' }, { status: 400 });
    }
    if (fileBuffer.length > MAX_RAW_BYTES) {
      return Response.json({ error: 'Export exceeds the 3 MB native-download limit' }, { status: 413 });
    }

    const key = `${Date.now()}-${crypto.randomUUID()}`;
    const store = getStore('telegram-exports');
    await store.set(key, exactArrayBuffer(fileBuffer), {
      metadata: {
        fileName,
        mimeType,
        expiresAt: Date.now() + 10 * 60 * 1000
      }
    });

    const origin = new URL(req.url).origin;
    const downloadUrl = `${origin}/api/export-download?key=${encodeURIComponent(key)}`;

    return Response.json({ ok: true, downloadUrl }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    console.error('export-upload failed', error);
    return Response.json({ error: 'Could not prepare export file.' }, { status: 500 });
  }
};
