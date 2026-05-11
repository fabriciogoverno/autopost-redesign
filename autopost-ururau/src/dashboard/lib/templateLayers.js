/**
 * Definição das camadas do template Ururau Reels (1080×1920).
 *
 * Nomes padronizados conforme AutoPost (app.autopost.com.br):
 *   - image    → fundo preto (cor sólida)
 *   - image-5  → slot da foto da matéria
 *   - overlay  → gradient escurecedor
 *   - logo     → logo Ururau PNG transparente
 *   - category → badge categoria (grupo bg+text)
 *   - title    → título
 *   - line     → linha decorativa
 *   - subtitle → subtítulo / resumo
 */

export const CANVAS_W = 1080;
export const CANVAS_H = 1920;
export const URURAU_RED = '#af0014';

export const TEMPLATE_LAYERS = {
  // Fundo preto (era "background")
  image: {
    label: 'image',
    kind: 'rect',
    defaults: { x: 0, y: 0, width: 1080, height: 1920, fill: '#000000', listening: false },
    locked: true,
  },

  // Slot da foto da matéria (era "article_image")
  'image-5': {
    label: 'image-5',
    kind: 'image-slot',
    defaults: { x: 0, y: 0, width: 1080, height: 1920 },
  },

  // Gradient overlay (era "gradient_top" + "gradient_overlay")
  overlay: {
    label: 'overlay',
    kind: 'gradient-rect',
    defaults: {
      x: 0, y: 0, width: 1080, height: 1920,
      gradientStart: 0.30, gradientEnd: 0.85,
      colorTop: 'rgba(0,0,0,0)',
      colorMid: 'rgba(0,0,0,0.55)',
      colorBottom: 'rgba(0,0,0,0.95)',
    },
  },

  // Badge categoria background (era "category_bg")
  category: {
    label: 'category',
    kind: 'rect',
    defaults: { x: 67, y: 1169, width: 280, height: 90, fill: URURAU_RED, cornerRadius: 4 },
  },

  // Texto da categoria (campo interno do group "category")
  category_text: {
    label: 'category (texto)',
    kind: 'text',
    defaults: {
      x: 84, y: 1186, text: 'PRISÃO', fontSize: 56,
      fontFamily: 'Aileron, Inter, Arial', fontStyle: 'bold',
      fill: '#FFFFFF', letterSpacing: 0, align: 'center',
    },
  },

  // Título
  title: {
    label: 'title',
    kind: 'text',
    defaults: {
      x: 68, y: 1266, text: 'Título da matéria aqui em até 4 linhas para boa legibilidade',
      fontSize: 85, fontFamily: 'Aileron, Inter, Arial', fontStyle: 'bold',
      fill: '#FFFFFF', width: 940, lineHeight: 1.08,
    },
  },

  // Linha decorativa (era "separator")
  line: {
    label: 'line',
    kind: 'rect',
    defaults: { x: 68, y: 1622, width: 282, height: 10, fill: URURAU_RED, cornerRadius: 5 },
  },

  // Subtítulo (era "summary")
  subtitle: {
    label: 'subtitle',
    kind: 'text',
    defaults: {
      x: 68, y: 1655, text: 'Subtítulo com o resumo da matéria. Geralmente 2 a 3 linhas explicando o assunto principal da notícia.',
      fontSize: 43, fontFamily: 'Aileron, Inter, Arial',
      fill: '#E4E4E4', width: 940, lineHeight: 1.20,
    },
  },
};

// Ordem das camadas — do fundo pro topo
// (logo é renderizado a partir do PNG base, fora desse array)
export const LAYER_ORDER = [
  'image',           // fundo preto
  'image-5',         // foto matéria (slot)
  'overlay',         // gradient
  'category', 'category_text',
  'title',
  'line',
  'subtitle',
];

// Apenas para o painel de Camadas estilo AutoPost (post + story)
export const LAYER_DISPLAY_NAMES = ['logo', 'subtitle', 'line', 'title', 'category', 'image-5', 'overlay', 'image'];

export const LAYER_GROUPS = [
  { label: 'post',  keys: LAYER_DISPLAY_NAMES },
  { label: 'story', keys: LAYER_DISPLAY_NAMES },
];

export const CATEGORY_COLORS = {
  'PRISÃO': URURAU_RED, 'PRISAO': URURAU_RED,
  'OPINIÃO': URURAU_RED, 'OPINIAO': URURAU_RED,
  'POLÍTICA': '#1D3557', 'POLITICA': '#1D3557',
  'ESPORTE': '#2A9D8F',
  'SEGURANÇA': '#E9C46A', 'SEGURANCA': '#E9C46A',
  'ECONOMIA': '#F4A261',
  'GERAL': '#6C757D',
  'INTERNACIONAL': '#4361EE',
  'SAÚDE': '#06A77D', 'SAUDE': '#06A77D',
  'EDUCAÇÃO': '#7209B7', 'EDUCACAO': '#7209B7',
  'CULTURA': '#F72585',
};

export function exportTemplate(nodesRef) {
  const out = { version: 4, canvas: { width: CANVAS_W, height: CANVAS_H }, layers: {} };
  Object.entries(nodesRef).forEach(([key, node]) => {
    if (!node) return;
    const data = {
      x: Math.round(node.x()),
      y: Math.round(node.y()),
      visible: node.visible(),
      opacity: node.opacity(),
    };
    if (node.getClassName() === 'Text') {
      data.text = node.text();
      data.fontSize = node.fontSize();
      data.fill = node.fill();
      data.fontFamily = node.fontFamily();
      data.fontStyle = node.fontStyle();
      data.align = node.align();
      data.width = Math.round(node.width() || 0);
      data.letterSpacing = node.letterSpacing() || 0;
      data.lineHeight = node.lineHeight() || 1;
    } else if (node.getClassName() === 'Rect') {
      data.width = Math.round(node.width());
      data.height = Math.round(node.height());
      data.fill = node.fill();
      data.cornerRadius = node.cornerRadius();
    }
    out.layers[key] = data;
  });
  return out;
}

export function importTemplate(nodesRef, data) {
  if (!data?.layers) return;
  Object.entries(data.layers).forEach(([key, props]) => {
    const node = nodesRef[key];
    if (!node) return;
    Object.entries(props).forEach(([k, v]) => {
      try { node.setAttr(k, v); } catch {}
    });
  });
}
