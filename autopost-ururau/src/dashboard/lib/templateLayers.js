/**
 * Definição das camadas editáveis do template Ururau Reels (1080×1920).
 *
 * Arquitetura:
 *   1. background (preto fallback)
 *   2. article_image (foto da matéria - cover-fit)
 *   3. gradient_top (escurece área do logo)
 *   4. gradient_overlay (escurece área dos textos editáveis)
 *   5. base-template PNG transparente (logo Ururau)
 *   6. category_bg + category_text
 *   7. title
 *   8. separator
 *   9. summary
 *  10. watermark (opcional)
 */

export const CANVAS_W = 1080;
export const CANVAS_H = 1920;
export const URURAU_RED = '#af0014';

export const TEMPLATE_LAYERS = {
  background: {
    label: 'Fundo (cor)',
    kind: 'rect',
    defaults: { x: 0, y: 0, width: 1080, height: 1920, fill: '#000000', listening: false },
    locked: true,
  },

  article_image: {
    label: 'Imagem da matéria',
    kind: 'image-slot',
    defaults: { x: 0, y: 0, width: 1080, height: 1920 },
  },

  // GRADIENTE DO TOPO (escurece atrás do logo)
  gradient_top: {
    label: 'Gradiente topo (atrás do logo)',
    kind: 'gradient-rect',
    defaults: {
      x: 0, y: 0, width: 1080, height: 400,
      gradientStart: 0.0, gradientEnd: 1.0,
      colorTop: 'rgba(0,0,0,0.55)',
      colorMid: 'rgba(0,0,0,0.25)',
      colorBottom: 'rgba(0,0,0,0)',
    },
  },

  // GRADIENTE DA BASE (escurece área dos textos editáveis)
  gradient_overlay: {
    label: 'Gradiente base (atrás dos textos)',
    kind: 'gradient-rect',
    defaults: {
      x: 0, y: 0, width: 1080, height: 1920,
      gradientStart: 0.40, gradientEnd: 0.85,
      colorTop: 'rgba(0,0,0,0)',
      colorMid: 'rgba(0,0,0,0.55)',
      colorBottom: 'rgba(0,0,0,0.95)',
    },
  },

  category_bg: {
    label: 'Badge · fundo',
    kind: 'rect',
    defaults: { x: 67, y: 1169, width: 280, height: 90, fill: URURAU_RED, cornerRadius: 4 },
  },
  category_text: {
    label: 'Badge · texto',
    kind: 'text',
    defaults: {
      x: 84, y: 1186, text: 'PRISÃO', fontSize: 56,
      fontFamily: 'Aileron, Inter, Arial', fontStyle: 'bold',
      fill: '#FFFFFF', letterSpacing: 0, align: 'center',
    },
  },

  title: {
    label: 'Título',
    kind: 'text',
    defaults: {
      x: 68, y: 1266, text: 'Título da matéria aqui em até 4 linhas para boa legibilidade',
      fontSize: 85, fontFamily: 'Aileron, Inter, Arial', fontStyle: 'bold',
      fill: '#FFFFFF', width: 940, lineHeight: 1.08,
    },
  },

  separator: {
    label: 'Linha decorativa',
    kind: 'rect',
    defaults: { x: 68, y: 1622, width: 282, height: 10, fill: URURAU_RED, cornerRadius: 5 },
  },

  summary: {
    label: 'Subtítulo / Resumo',
    kind: 'text',
    defaults: {
      x: 68, y: 1655, text: 'Subtítulo com o resumo da matéria. Geralmente 2 a 3 linhas explicando o assunto principal da notícia.',
      fontSize: 43, fontFamily: 'Aileron, Inter, Arial',
      fill: '#E4E4E4', width: 940, lineHeight: 1.20,
    },
  },

  // Watermark agora vem VAZIO - usuário pode escrever o que quiser ou ocultar
  watermark: {
    label: 'Marca d\'água',
    kind: 'text',
    defaults: {
      x: 68, y: 1875, text: '', fontSize: 22,
      fontFamily: 'Aileron, Inter, Arial', fontStyle: 'bold',
      fill: '#FFFFFF', opacity: 0.7, letterSpacing: 3,
      visible: false,
    },
  },
};

export const LAYER_ORDER = [
  'background',
  'article_image',
  'gradient_top',
  'gradient_overlay',
  'category_bg', 'category_text',
  'title', 'separator', 'summary',
  'watermark',
];

export const LAYER_GROUPS = [
  { label: 'Estrutura', keys: ['background', 'article_image', 'gradient_top', 'gradient_overlay'] },
  { label: 'Categoria', keys: ['category_bg', 'category_text'] },
  { label: 'Conteúdo', keys: ['title', 'separator', 'summary'] },
  { label: 'Marca', keys: ['watermark'] },
];

// Cores oficiais por categoria — todas com acento (igual ao Canva)
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
  const out = { version: 3, canvas: { width: CANVAS_W, height: CANVAS_H }, layers: {} };
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
    } else if (node.getClassName() === 'Circle') {
      data.radius = Math.round(node.radius());
      data.fill = node.fill();
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
