/**
 * Proxy de imagem — resolve CORS quando o site da matéria
 * (ururau.com.br, g1, etc.) não libera Access-Control-Allow-Origin
 * pra carregar diretamente no <canvas>/Konva.
 *
 * Uso: /api/proxy-image?url=https://www.ururau.com.br/img/noticias/foo.jpg
 */
export const runtime = 'nodejs';

const ALLOWED_PROTOCOLS = ['http:', 'https:'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get('url');
  if (!target) return Response.json({ error: 'url required' }, { status: 400 });

  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    return Response.json({ error: 'invalid url' }, { status: 400 });
  }
  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    return Response.json({ error: 'unsupported protocol' }, { status: 400 });
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AutoPostUrurau/1.0; +https://github.com/fabriciogoverno/autopost-redesign)',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': parsed.origin,
      },
      redirect: 'follow',
    });

    if (!upstream.ok) {
      return Response.json({ error: `upstream HTTP ${upstream.status}` }, { status: 502 });
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      return Response.json({ error: 'not an image' }, { status: 415 });
    }

    const buf = await upstream.arrayBuffer();
    if (buf.byteLength > MAX_SIZE) {
      return Response.json({ error: 'image too large' }, { status: 413 });
    }

    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(buf.byteLength),
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        'Access-Control-Allow-Origin': '*',
        'X-Proxy-By': 'autopost-ururau',
      },
    });
  } catch (err) {
    return Response.json({ error: 'proxy failed: ' + err.message }, { status: 500 });
  }
}
