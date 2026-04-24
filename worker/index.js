const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const TTL_SECONDS = 30 * 60;
const KEY = 'current';

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...CORS, ...(init.headers || {}) },
  });
}

function unauthorized() {
  return json({ error: 'unauthorized' }, { status: 401 });
}

function isAuthed(request, env) {
  const h = request.headers.get('authorization') || '';
  const token = h.replace(/^Bearer\s+/i, '');
  return env.AUTH_TOKEN && token === env.AUTH_TOKEN;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (request.method === 'GET' && url.pathname === '/') {
      const raw = await env.WATCHING.get(KEY);
      if (!raw) return json(null);
      try {
        return json(JSON.parse(raw));
      } catch {
        return json(null);
      }
    }

    if (request.method === 'POST' && url.pathname === '/update') {
      if (!isAuthed(request, env)) return unauthorized();
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: 'invalid json' }, { status: 400 });
      }
      const { title, service = 'Prime Video', url: watchUrl = null } = body || {};
      if (!title || typeof title !== 'string') {
        return json({ error: 'title required' }, { status: 400 });
      }
      const payload = {
        title: title.slice(0, 200),
        service: String(service).slice(0, 50),
        url: watchUrl ? String(watchUrl).slice(0, 500) : null,
        updatedAt: Date.now(),
      };
      await env.WATCHING.put(KEY, JSON.stringify(payload), { expirationTtl: TTL_SECONDS });
      return json(payload);
    }

    if (request.method === 'POST' && url.pathname === '/clear') {
      if (!isAuthed(request, env)) return unauthorized();
      await env.WATCHING.delete(KEY);
      return json({ ok: true });
    }

    return json({ error: 'not found' }, { status: 404 });
  },
};
