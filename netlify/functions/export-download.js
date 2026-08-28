import { getStore } from '@netlify/blobs';

function safeFileName(value) {
  const original = String(value || 'export.bin').trim();
  const cleaned = original
    .replace(/[\\/:*?"<>|\x00-\x1F]/g, '_')
    .replace(/\s+/g, ' ')
    .slice(0, 140);
  return cleaned || 'export.bin';
}

function asciiFileName(name) {
  return name.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
}

export default async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://web.telegram.org',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'GET') {
    return new Response('Method not allowed', {
      status: 405,
      headers: { ...corsHeaders, 'Allow': 'GET, OPTIONS' }
    });
  }

  const key = new URL(req.url).searchParams.get('key');
  if (!key || !/^[A-Za-z0-9-]{10,100}$/.test(key)) {
    return new Response('Invalid export key', { status: 400, headers: corsHeaders });
  }

  try {
    const store = getStore('telegram-exports');
    const entry = await store.getWithMetadata(key, { type: 'arrayBuffer' });
    if (!entry || !entry.data) {
      return new Response('Export expired or unavailable', { status: 404, headers: corsHeaders });
    }

    const metadata = entry.metadata || {};
    if (metadata.expiresAt && Number(metadata.expiresAt) < Date.now()) {
      try { await store.delete(key); } catch (_) {}
      return new Response('Export expired', { status: 410, headers: corsHeaders });
    }

    const fileName = safeFileName(metadata.fileName);
    const contentType = String(metadata.mimeType || 'application/octet-stream');
    const asciiName = asciiFileName(fileName);

    // Bytes are already loaded into memory, so remove the temporary blob now.
    try { await store.delete(key); } catch (cleanupError) {
      console.warn('Temporary export cleanup failed', cleanupError);
    }

    return new Response(entry.data, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Length': String(entry.data.byteLength),
        'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
      }
    });
  } catch (error) {
    console.error('export-download failed', error);
    return new Response('Could not download export', { status: 500, headers: corsHeaders });
  }
};
