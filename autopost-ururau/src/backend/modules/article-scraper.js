const USER_AGENT = 'Mozilla/5.0 AutoPost Template Editor';
const REQUEST_TIMEOUT_MS = 12000;
const GENERIC_PATH_SEGMENTS = new Set([
  'noticias', 'noticia', 'materias', 'materia', 'posts', 'post', 'blog',
  'conteudo', 'conteudos', 'portal', 'site', 'amp'
]);

export async function scrapeArticleByUrl(rawUrl) {
  const url = normalizeInputUrl(rawUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: controller.signal
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const finalUrl = response.url || url;
    const html = await response.text();
    const metas = parseMetaTags(html);
    const jsonLd = parseJsonLd(html);

    return {
      success: true,
      url: finalUrl,
      category: firstText([
        extractBreadcrumbCategory(html, jsonLd),
        findMetaContent(metas, ['article:section', 'section']),
        firstJsonLdValue(jsonLd, ['articleSection']),
        extractVisibleCategoryAboveTitle(html),
        extractCategoryFromPath(finalUrl)
      ]),
      title: firstText([
        extractFirstTagText(html, 'h1'),
        findMetaContent(metas, ['og:title']),
        findMetaContent(metas, ['twitter:title']),
        firstJsonLdValue(jsonLd, ['headline', 'name']),
        extractPageTitle(html)
      ]),
      summary: firstText([
        extractSubtitleNearTitle(html),
        findMetaContent(metas, ['description']),
        findMetaContent(metas, ['og:description']),
        findMetaContent(metas, ['twitter:description']),
        firstJsonLdValue(jsonLd, ['description'])
      ]),
      image: normalizeUrl(firstText([
        findMetaContent(metas, ['og:image', 'og:image:url', 'og:image:secure_url']),
        findMetaContent(metas, ['twitter:image', 'twitter:image:src']),
        firstJsonLdImage(jsonLd),
        extractArticleImage(html)
      ]), finalUrl),
      author: firstText([
        findMetaContent(metas, ['author', 'article:author']),
        firstJsonLdAuthor(jsonLd)
      ]),
      publishedAt: firstText([
        findMetaContent(metas, ['article:published_time', 'publishdate', 'pubdate', 'date']),
        firstJsonLdValue(jsonLd, ['datePublished', 'dateCreated']),
        extractTimeDatetime(html)
      ])
    };
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeInputUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') throw new Error('URL invalida');
  const parsed = new URL(rawUrl.trim());
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('URL invalida');
  return parsed.href;
}

function parseMetaTags(html) {
  const metas = [];
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = parseAttrs(match[0]);
    const key = (attrs.property || attrs.name || attrs.itemprop || '').toLowerCase();
    if (key && attrs.content) metas.push({ key, content: cleanText(attrs.content) });
  }
  return metas;
}

function parseJsonLd(html) {
  const nodes = [];
  for (const match of html.matchAll(/<script\b[^>]*type=["'][^"']*ld\+json[^"']*["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const raw = decodeHtml(match[1]).trim();
      if (!raw) continue;
      flattenJsonLd(JSON.parse(raw), nodes);
    } catch {
      // Ignore invalid JSON-LD blocks from third-party widgets.
    }
  }
  return nodes;
}

function flattenJsonLd(value, out) {
  if (Array.isArray(value)) {
    value.forEach(item => flattenJsonLd(item, out));
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value['@graph'])) value['@graph'].forEach(item => flattenJsonLd(item, out));
  out.push(value);
}

function findMetaContent(metas, keys) {
  const wanted = keys.map(key => key.toLowerCase());
  const meta = metas.find(item => wanted.includes(item.key));
  return meta?.content || '';
}

function firstJsonLdValue(nodes, keys) {
  for (const node of nodes) {
    for (const key of keys) {
      const value = node[key];
      const text = jsonLdText(value);
      if (text) return text;
    }
  }
  return '';
}

function firstJsonLdImage(nodes) {
  for (const node of nodes) {
    const image = node.image || node.thumbnailUrl;
    if (typeof image === 'string') return image;
    if (Array.isArray(image)) {
      const found = image.map(jsonLdImageValue).find(Boolean);
      if (found) return found;
    }
    const found = jsonLdImageValue(image);
    if (found) return found;
  }
  return '';
}

function jsonLdImageValue(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return value.url || value.contentUrl || '';
  return '';
}

function firstJsonLdAuthor(nodes) {
  for (const node of nodes) {
    const author = node.author || node.creator;
    if (Array.isArray(author)) {
      const found = author.map(jsonLdText).find(Boolean);
      if (found) return found;
    }
    const text = jsonLdText(author);
    if (text) return text;
  }
  return '';
}

function jsonLdText(value) {
  if (!value) return '';
  if (typeof value === 'string') return cleanText(value);
  if (Array.isArray(value)) return firstText(value.map(jsonLdText));
  if (typeof value === 'object') return cleanText(value.name || value.headline || value.text || value['@id'] || '');
  return '';
}

function extractBreadcrumbCategory(html, nodes) {
  const jsonLdCategory = extractJsonLdBreadcrumbCategory(nodes);
  if (jsonLdCategory) return jsonLdCategory;

  const breadcrumbHtml = firstRaw([
    extractTagHtmlByAttr(html, 'nav', /(breadcrumb|breadcrumbs|migalha)/i),
    extractTagHtmlByAttr(html, 'ol', /(breadcrumb|breadcrumbs|migalha)/i),
    extractTagHtmlByAttr(html, 'ul', /(breadcrumb|breadcrumbs|migalha)/i),
    extractTagHtmlByAttr(html, 'div', /(breadcrumb|breadcrumbs|migalha)/i)
  ]);
  if (!breadcrumbHtml) return '';

  const crumbs = extractInlineTexts(breadcrumbHtml)
    .map(cleanText)
    .filter(Boolean)
    .filter(text => !/^(home|inicio|início|capa|principal)$/i.test(text));
  return chooseBreadcrumbCategory(crumbs);
}

function extractJsonLdBreadcrumbCategory(nodes) {
  for (const node of nodes) {
    const type = String(node['@type'] || '').toLowerCase();
    if (!type.includes('breadcrumblist') || !Array.isArray(node.itemListElement)) continue;
    const crumbs = node.itemListElement
      .map(item => jsonLdText(item?.item) || jsonLdText(item))
      .filter(Boolean)
      .filter(text => !/^(home|inicio|início|capa|principal)$/i.test(text));
    if (crumbs.length) return chooseBreadcrumbCategory(crumbs);
  }
  return '';
}

function chooseBreadcrumbCategory(crumbs) {
  if (!crumbs.length) return '';
  const last = crumbs[crumbs.length - 1];
  const looksLikeArticleTitle = last.length > 60 || last.split(/\s+/).length > 7;
  if (crumbs.length > 1 && looksLikeArticleTitle) return crumbs[crumbs.length - 2];
  return last;
}

function extractVisibleCategoryAboveTitle(html) {
  const h1 = /<h1\b[^>]*>/i.exec(html);
  if (!h1) return '';
  const beforeTitle = html.slice(Math.max(0, h1.index - 4000), h1.index);
  return firstText([
    extractTagByAttr(beforeTitle, 'span', /(editoria|category|categoria|section|chapeu|chap[eé]u|kicker)/i),
    extractTagByAttr(beforeTitle, 'div', /(editoria|category|categoria|section|chapeu|chap[eé]u|kicker)/i),
    extractTagByAttr(beforeTitle, 'a', /(editoria|category|categoria|section|chapeu|chap[eé]u|kicker)/i)
  ]);
}

function extractSubtitleNearTitle(html) {
  const h1End = /<\/h1>/i.exec(html);
  if (!h1End) return '';
  const afterTitle = html.slice(h1End.index + h1End[0].length, h1End.index + 4500);
  return firstText([
    extractTagByAttr(afterTitle, 'h2', /(subtitle|subtitulo|subt[ií]tulo|summary|resumo|linha-fina|lead|deck|dek|standfirst|description|descricao)/i),
    extractTagByAttr(afterTitle, 'p', /(subtitle|subtitulo|subt[ií]tulo|summary|resumo|linha-fina|lead|deck|dek|standfirst|description|descricao)/i),
    extractTagByAttr(afterTitle, 'div', /(subtitle|subtitulo|subt[ií]tulo|summary|resumo|linha-fina|lead|deck|dek|standfirst|description|descricao)/i),
    extractFirstParagraph(afterTitle)
  ]);
}

function extractFirstParagraph(html) {
  for (const match of html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = cleanText(stripTags(match[1]));
    if (text.length >= 40 && text.length <= 500) return text;
  }
  return '';
}

function extractArticleImage(html) {
  const article = /<article\b[^>]*>([\s\S]*?)<\/article>/i.exec(html)?.[1] || html;
  for (const match of article.matchAll(/<img\b[^>]*>/gi)) {
    const attrs = parseAttrs(match[0]);
    const src = attrs.src || attrs['data-src'] || attrs['data-lazy-src'] || attrs['data-original'] || attrs.srcset?.split(',')[0]?.trim().split(/\s+/)[0];
    if (src && !/logo|avatar|icon|sprite|placeholder/i.test(src)) return src;
  }
  return '';
}

function extractCategoryFromPath(url) {
  try {
    const segments = new URL(url).pathname
      .split('/')
      .map(segment => decodeURIComponent(segment).trim())
      .filter(Boolean)
      .filter(segment => !GENERIC_PATH_SEGMENTS.has(segment.toLowerCase()))
      .filter(segment => !/^\d{4}$/.test(segment))
      .filter(segment => !/^\d+$/.test(segment));
    if (!segments.length) return '';
    return titleCase(segments[0].replace(/[-_]+/g, ' '));
  } catch {
    return '';
  }
}

function extractPageTitle(html) {
  return cleanText(stripTags(/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] || ''));
}

function extractFirstTagText(html, tag) {
  return cleanText(stripTags(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(html)?.[1] || ''));
}

function extractTimeDatetime(html) {
  for (const match of html.matchAll(/<time\b[^>]*>/gi)) {
    const attrs = parseAttrs(match[0]);
    if (attrs.datetime) return cleanText(attrs.datetime);
  }
  return '';
}

function extractTagByAttr(html, tag, pattern) {
  const innerHtml = extractTagHtmlByAttr(html, tag, pattern);
  return innerHtml ? cleanText(stripTags(innerHtml)) : '';
}

function extractTagHtmlByAttr(html, tag, pattern) {
  const rx = new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  for (const match of html.matchAll(rx)) {
    const attrs = parseAttrs(match[1]);
    const haystack = `${attrs.class || ''} ${attrs.id || ''} ${attrs.itemprop || ''} ${attrs['aria-label'] || ''}`;
    if (!pattern.test(haystack)) continue;
    if (match[2]) return match[2];
  }
  return '';
}

function extractInlineTexts(html) {
  const texts = [];
  for (const match of html.matchAll(/<(a|span|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const text = cleanText(stripTags(match[2]));
    if (text) texts.push(text);
  }
  return texts;
}

function parseAttrs(tag) {
  const attrs = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    attrs[match[1].toLowerCase()] = decodeHtml(match[3] ?? match[4] ?? match[5] ?? '');
  }
  return attrs;
}

function firstText(values) {
  for (const value of values) {
    const text = cleanText(value || '');
    if (text) return text;
  }
  return '';
}

function firstRaw(values) {
  return values.find(value => String(value || '').trim()) || '';
}

function normalizeUrl(value, baseUrl) {
  if (!value) return '';
  try {
    return new URL(value, baseUrl).href;
  } catch {
    return '';
  }
}

function cleanText(value) {
  return decodeHtml(String(value || ''))
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
}

function stripTags(value) {
  return String(value || '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}

function decodeHtml(value) {
  const named = {
    amp: '&',
    quot: '"',
    apos: "'",
    lt: '<',
    gt: '>',
    nbsp: ' '
  };
  return String(value || '').replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (full, entity) => {
    const key = entity.toLowerCase();
    if (key[0] === '#') {
      const code = key[1] === 'x' ? parseInt(key.slice(2), 16) : parseInt(key.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : full;
    }
    return named[key] ?? full;
  });
}

function titleCase(value) {
  return cleanText(value).replace(/\b\p{L}/gu, letter => letter.toUpperCase());
}
