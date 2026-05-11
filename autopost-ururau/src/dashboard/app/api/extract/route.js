import * as cheerio from 'cheerio';
export const runtime = 'nodejs';

// Mapeamento canonico: chave sem acento -> rótulo COM acento (igual ao Canva original)
const KW = {
  'POLÍTICA':  ['política','politica','governo','eleição','prefeito','vereador','deputado','senador','câmara'],
  'ESPORTE':   ['esporte','futebol','jogo','campeonato','time','gol','atleta'],
  'PRISÃO':    ['prisão','prisao','polícia','policia','crime','assalto','roubo','homicídio','preso','operação','operacao'],
  'ECONOMIA':  ['economia','preço','preco','inflação','pib','mercado','dólar','comércio'],
  'OPINIÃO':   ['opinião','opiniao','editorial','artigo','coluna','crônica'],
  'SAÚDE':     ['saúde','saude','hospital','médico','doença','vacina'],
  'EDUCAÇÃO':  ['educação','educacao','escola','universidade','ensino','aluno','fraude','fraudes'],
  'CULTURA':   ['cultura','show','música','filme','arte','teatro'],
  'INTERNACIONAL': ['internacional','exterior','mundo','eua','china','europa'],
};

function detectCat(t) {
  const l = (t || '').toLowerCase();
  for (const [c, ks] of Object.entries(KW)) for (const k of ks) if (l.includes(k)) return c;
  return 'GERAL';
}

function cleanTitle(raw, siteName) {
  if (!raw) return '';
  let t = raw.trim();
  // Remove sufixos comuns do tipo " - Portal Ururau", " | Ururau", " — Ururau"
  const suffixPatterns = [
    /\s*[-—|–]\s*(Portal\s+Ururau|Ururau\s*\.com|Ururau).*$/i,
    /\s*[-—|–]\s*[A-Z][a-zA-ZÀ-ÿ\s]*$/,  // " - Algum Portal/Site"
  ];
  for (const p of suffixPatterns) t = t.replace(p, '');
  if (siteName) t = t.replace(new RegExp(`\\s*[-—|–]\\s*${siteName.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\s*$`, 'i'), '');
  return t.trim();
}

function abs(u, b) { if (!u) return ''; if (u.startsWith('http')) return u; if (u.startsWith('//')) return 'https:'+u; try { return new URL(u, b).toString(); } catch { return u; } }

export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url || !url.startsWith('http')) return Response.json({ error: 'URL inválida' }, { status: 400 });
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0', 'Accept': 'text/html' },
      redirect: 'follow',
    });
    if (!res.ok) return Response.json({ error: `HTTP ${res.status}` }, { status: 502 });
    const html = await res.text();
    const $ = cheerio.load(html);

    const siteName = $('meta[property="og:site_name"]').attr('content') || new URL(url).hostname.replace('www.','');
    const rawTitle = $('meta[property="og:title"]').attr('content') || $('h1').first().text() || $('title').text() || 'Sem título';
    const title = cleanTitle(rawTitle, siteName);

    const summary = $('meta[property="og:description"]').attr('content')
      || $('meta[name="description"]').attr('content')
      || $('article p').first().text()
      || '';

    const image = $('meta[property="og:image"]').attr('content')
      || $('meta[name="twitter:image"]').attr('content')
      || $('link[rel="image_src"]').attr('href')
      || $('article img').first().attr('src')
      || $('img').first().attr('src')
      || '';

    const category = detectCat(`${new URL(url).pathname} ${rawTitle} ${summary}`);

    return Response.json({
      title: title.substring(0, 300),
      summary: summary.trim().substring(0, 500),
      image: abs(image, url),
      category, siteName, url,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
