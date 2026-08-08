const JSON_HEADERS = {
  'content-type': 'application/json; charset=UTF-8',
  'cache-control': 'no-store',
};

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extra },
  });
}

function allowedOrigin(request, env) {
  const origin = request.headers.get('Origin');
  const allowed = String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return origin && allowed.includes(origin) ? origin : null;
}

function corsHeaders(origin) {
  return origin ? {
    'access-control-allow-origin': origin,
    'access-control-allow-credentials': 'false',
    'access-control-allow-headers': 'content-type, x-anonymous-key',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'vary': 'Origin',
  } : {};
}

function routeStoryId(pathname) {
  const match = pathname.match(/^\/api\/stories\/([^/]+)\/(ratings|reviews)$/);
  return match ? { storyId: decodeURIComponent(match[1]), resource: match[2] } : null;
}

function validStoryId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,160}$/.test(value);
}

function validAnonymousKey(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9._:-]{16,160}$/.test(value);
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export default {
  async fetch(request, env) {
    const origin = allowedOrigin(request, env);
    const pathname = new URL(request.url).pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== 'GET' && request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, corsHeaders(origin));
    }

    if (pathname === '/health') {
      return json({ ok: true, service: 'mahmuda-fun-api', database: 'configured' }, 200, corsHeaders(origin));
    }

    if (pathname === '/api/ratings/summary' && request.method === 'GET') {
      if (!origin && request.headers.get('Origin')) {
        return json({ error: 'Origin not allowed' }, 403);
      }
      if (!env.REVIEWS_DB) {
        return json({ error: 'Database binding is not configured' }, 503, corsHeaders(origin));
      }
      const result = await env.REVIEWS_DB.prepare(
        'SELECT story_id AS storyId, COUNT(*) AS count, ROUND(AVG(rating), 2) AS average FROM story_ratings GROUP BY story_id ORDER BY average DESC, count DESC LIMIT 200'
      ).all();
      return json({ ratings: result.results || [] }, 200, corsHeaders(origin));
    }

    const route = routeStoryId(pathname);
    if (!route || !validStoryId(route.storyId)) {
      return json({ error: 'Not found' }, 404, corsHeaders(origin));
    }

    if (!origin && request.headers.get('Origin')) {
      return json({ error: 'Origin not allowed' }, 403);
    }

    if (!env.REVIEWS_DB) {
      return json({ error: 'Database binding is not configured' }, 503, corsHeaders(origin));
    }

    if (request.method === 'GET' && route.resource === 'ratings') {
      const result = await env.REVIEWS_DB.prepare(
        'SELECT COUNT(*) AS count, COALESCE(ROUND(AVG(rating), 2), 0) AS average FROM story_ratings WHERE story_id = ?'
      ).bind(route.storyId).first();
      return json({ storyId: route.storyId, count: Number(result?.count || 0), average: Number(result?.average || 0) }, 200, corsHeaders(origin));
    }

    if (request.method === 'GET' && route.resource === 'reviews') {
      const result = await env.REVIEWS_DB.prepare(
        'SELECT id, story_id AS storyId, display_name AS displayName, review_text AS reviewText, created_at AS createdAt FROM story_reviews WHERE story_id = ? AND status = ? ORDER BY created_at DESC LIMIT 50'
      ).bind(route.storyId, 'approved').all();
      return json({ storyId: route.storyId, reviews: result.results || [] }, 200, corsHeaders(origin));
    }

    const body = await readJson(request);
    const anonymousKey = request.headers.get('X-Anonymous-Key') || body?.anonymousKey;
    if (!validAnonymousKey(anonymousKey)) {
      return json({ error: 'A client-generated anonymous key is required' }, 400, corsHeaders(origin));
    }

    if (route.resource === 'ratings') {
      const rating = Number(body?.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return json({ error: 'Rating must be an integer from 1 to 5' }, 400, corsHeaders(origin));
      }
      await env.REVIEWS_DB.prepare(
        `INSERT INTO story_ratings (story_id, rating, anonymous_key) VALUES (?, ?, ?)
         ON CONFLICT(story_id, anonymous_key) DO UPDATE SET rating = excluded.rating, updated_at = datetime('now')`
      ).bind(route.storyId, rating, anonymousKey).run();
      return json({ ok: true, status: 'saved' }, 201, corsHeaders(origin));
    }

    const reviewText = typeof body?.reviewText === 'string' ? body.reviewText.trim() : '';
    const displayName = typeof body?.displayName === 'string' ? body.displayName.trim().slice(0, 80) : null;
    if (reviewText.length < 2 || reviewText.length > 2000) {
      return json({ error: 'Review must be between 2 and 2000 characters' }, 400, corsHeaders(origin));
    }
    await env.REVIEWS_DB.prepare(
      'INSERT INTO story_reviews (story_id, display_name, review_text, anonymous_key) VALUES (?, ?, ?, ?)'
    ).bind(route.storyId, displayName, reviewText, anonymousKey).run();
    return json({ ok: true, status: 'pending_moderation' }, 201, corsHeaders(origin));
  },
};
