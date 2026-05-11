import * as cheerio from 'cheerio';
export const runtime = 'nodejs';

const KW = {
  POLITICA: ['política','politica','governo','eleição','prefeito','vereador','deputado','senador','câmara'],
  ESPORTE:  ['esporte','futebol','jogo','campeonato','time','gol','atleta'],
  SEGURANCA:['polícia','policia','crime','assalto','roubo','homicídio','homicidio','preso','operação'],
  ECONOMIA: ['economia','preço','preco','inflação','pib','mercado','dólar','dolar','comércio'],
  OPINIAO:  ['opinião','opiniao','editorial','artigo','coluna','crônica','cronica'],
  SAUDE:    ['saúde','saude','hospital','médico','medico','doença','vacina'],
  EDUCACAO: ['educação','educacao','escola','universidade','ensino','aluno'],
  CULTURA:  ['cultura','show','música','musica','filme','arte','teatro'],
};

function detectCat(t) {
  const l = (t || '').toLowerCase();
  for (const [c, ks] of Object.entries(KW)) for (const k of ks) if (l.includes(k)) return c;
  return 'GERAL';
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
    const title = $('meta[property="og:title"]').attr('content') || $('h1').first().text() || $('title').text() || 'Sem título';
    const summary = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || $('article p').first().text() || '';
    const image = $('meta[property="og:image"]').attr('content') || $('article img').first().attr('src') || $('img').first().attr('src') || '';
    const siteName = $('meta[property="og:site_name"]').attr('content') || new URL(url).hostname.replace('www.','');
    const category = detectCat(`${new URL(url).pathname} ${title}`);
    return Response.json({
      title: title.trim().substring(0, 300),
      summary: summary.trim().substring(0, 500),
      image: abs(image, url),
      category, siteName, url,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
