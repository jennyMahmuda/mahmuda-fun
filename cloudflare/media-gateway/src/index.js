const ALLOWED_ORIGINS = new Set(['https://mahmuda.fun', 'https://www.mahmuda.fun']);
const SAFE_KEY = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,180}$/;
const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
  'video/mp4', 'video/webm', 'video/quicktime'
]);

function originFor(request) {
  const origin = request.headers.get('Origin') || '';
  return ALLOWED_ORIGINS.has(origin) ? origin : 'https://mahmuda.fun';
}

function cors(request) {
  const origin = originFor(request);
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, PUT, OPTIONS',
    'access-control-allow-headers': 'Authorization, Content-Type, X-Media-Key',
    'access-control-max-age': '86400',
    vary: 'Origin'
  };
}

function json(request, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors(request), 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

function authorized(request, env) {
  const auth = request.headers.get('Authorization') || '';
  return Boolean(env.MEDIA_GATEWAY_AUTH_SECRET) && auth === `Bearer ${env.MEDIA_GATEWAY_AUTH_SECRET}`;
}

function keyFromRequest(request) {
  const url = new URL(request.url);
  const key = decodeURIComponent(url.pathname.replace(/^\/media\//, ''));
  return key;
}

function safeKey(key) {
  return SAFE_KEY.test(key) && !key.includes('..') && !key.startsWith('/');
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(request) });
    const url = new URL(request.url);

    if (url.pathname === '/health' && request.method === 'GET') {
      return json(request, { ok: true, service: 'mahmuda-fun-media-gateway', bucket: 'arifjennymedia' });
    }

    if (!authorized(request, env)) return json(request, { error: 'Unauthorized' }, 401);
    if (!env.MEDIA_BUCKET) return json(request, { error: 'Media bucket binding is not configured' }, 503);

    if (!['GET', 'PUT'].includes(request.method) || !url.pathname.startsWith('/media/')) {
      return json(request, { error: 'Not found' }, 404);
    }

    let key;
    try { key = keyFromRequest(request); } catch (_) { return json(request, { error: 'Invalid media key' }, 400); }
    if (!safeKey(key)) return json(request, { error: 'Invalid media key' }, 400);

    if (request.method === 'GET') {
      const object = await env.MEDIA_BUCKET.get(key);
      if (!object) return json(request, { error: 'Object not found' }, 404);
      const headers = new Headers(cors(request));
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      headers.set('cache-control', 'public, max-age=31536000, immutable');
      return new Response(object.body, { status: 200, headers });
    }

    const contentType = (request.headers.get('Content-Type') || '').split(';')[0].toLowerCase();
    const maxBytes = Number(env.MAX_UPLOAD_BYTES || 52428800);
    const contentLength = Number(request.headers.get('Content-Length') || 0);
    if (!ALLOWED_TYPES.has(contentType)) return json(request, { error: 'Only approved image/video content types are allowed' }, 415);
    if (contentLength > maxBytes) return json(request, { error: 'File exceeds the upload size limit' }, 413);

    await env.MEDIA_BUCKET.put(key, request.body, {
      httpMetadata: { contentType, cacheControl: 'public, max-age=31536000, immutable' }
    });
    return json(request, { ok: true, key, url: `${url.origin}/media/${encodeURIComponent(key)}` }, 201);
  }
};
