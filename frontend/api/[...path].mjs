const HOP = new Set(['connection', 'content-encoding', 'content-length', 'host', 'transfer-encoding', 'x-taskflow-proxy-secret', 'x-taskflow-client-ip']);
export default async function handler(request, response) {
  const backend = process.env.RENDER_BACKEND_URL;
  const secret = process.env.TASKFLOW_PROXY_SECRET;
  if (!backend || !secret || secret.length < 32) return response.status(503).json({ message: 'Backend proxy is not configured' });
  const path = request.url || '/api';
  const headers = new Headers();
  for (const [name, raw] of Object.entries(request.headers)) if (!HOP.has(name.toLowerCase()) && raw !== undefined)
    headers.set(name, Array.isArray(raw) ? raw.join(', ') : raw);
  const forwarded = request.headers['x-forwarded-for'];
  headers.set('X-Taskflow-Proxy-Secret', secret);
  headers.set('X-Taskflow-Client-IP', (Array.isArray(forwarded) ? forwarded[0] : forwarded || '').split(',')[0].trim());
  const init = { method: request.method, headers, redirect: 'manual' };
  if (!['GET', 'HEAD'].includes(request.method || 'GET')) init.body = request.body == null
    ? undefined : (Buffer.isBuffer(request.body) ? request.body : JSON.stringify(request.body));
  try {
    const upstream = await fetch(new URL(path, backend.endsWith('/') ? backend : backend + '/'), init);
    response.status(upstream.status);
    upstream.headers.forEach((value, name) => { if (!HOP.has(name.toLowerCase()) && name.toLowerCase() !== 'set-cookie') response.setHeader(name, value); });
    const cookies = upstream.headers.getSetCookie?.() || [];
    if (cookies.length) response.setHeader('Set-Cookie', cookies);
    response.setHeader('Cache-Control', 'private, no-store');
    response.send(Buffer.from(await upstream.arrayBuffer()));
  } catch { response.status(502).json({ message: 'Taskflow server is starting or unavailable' }); }
}
