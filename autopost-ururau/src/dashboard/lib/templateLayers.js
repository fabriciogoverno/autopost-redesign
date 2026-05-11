/**
 * Definição das camadas editáveis do template Ururau Reels (1080×1920).
 *
 * NOVA ARQUITETURA (inspirada no trabalho do Codex no ururau-reels-v11):
 *   - Foto da matéria preenche TODO o stage como cover-fit (camada base)
 *   - Gradient overlay é camada Konva separada (transparente em cima, preto embaixo)
 *   - PNG transparente sobreposto contém APENAS o logo Ururau
 *   - Textos editáveis (badge, título, linha, subtítulo, watermark) ficam por cima
 *
 * Ordem de renderização (do fundo para o topo):
 *   1. background (preto fallback, locked)
 *   2. article_image (foto da matéria, cover, draggable + transformer)
 *   3. gradient_overlay (Konva gradient transparente -> preto)
 *   4. base-template (PNG só com logo)
 *   5. category_bg + category_text
 *   6. title
 *   7. separator
 *   8. summary
 *   9. watermark
 */

export const CANVAS_W = 1080;
export const CANVAS_H = 1920;

// Cor oficial do vermelho Ururau (extraída do PDF do usuário)
export const URURAU_RED = '#af0014';

export const TEMPLATE_LAYERS = {
  // ===== FUNDO PRETO (fallback caso não tenha foto) =====
  background: {
    label: 'Fundo (cor)',
    kind: 'rect',
    defaults: { x: 0, y: 0, width: 1080, height: 1920, fill: '#000000', listening: false },
    locked: true,
  },

  // ===== IMAGEM DA MATÉRIA (cobre TODO o canvas) =====
  article_image: {
    label: 'Imagem da matéria',
    kind: 'image-slot',
    defaults: { x: 0, y: 0, width: 1080, height: 1920 },
  },

  // ===== GRADIENT OVERLAY (Konva, transparente em cima -> preto embaixo) =====
  gradient_overlay: {
    label: 'Gradiente (escurece base inferior)',
    kind: 'gradient-rect',
    defaults: {
      x: 0, y: 0, width: 1080, height: 1920,
      gradientStart: 0.30, gradientEnd: 0.85,
      colorTop: 'rgba(0,0,0,0)',
      colorMid: 'rgba(0,0,0,0.55)',
      colorBottom: 'rgba(0,0,0,0.95)',
    },
  },

  // ============================================================
  // BADGE CATEGORIA
  // ============================================================
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
      fill: '#FFFFFF', letterSpacing: 0,
    },
  },

  // ============================================================
  // TÍTULO
  // ============================================================
  title: {
    label: 'Título',
    kind: 'text',
    defaults: {
      x: 68, y: 1266, text: 'Título da matéria aqui em até 4 linhas para boa legibilidade',
      fontSize: 85, fontFamily: 'Aileron, Inter, Arial', fontStyle: 'bold',
      fill: '#FFFFFF', width: 865, lineHeight: 1.08,
    },
  },

  // ============================================================
  // LINHA DECORATIVA
  // ============================================================
  separator: {
    label: 'Linha decorativa',
    kind: 'rect',
    defaults: { x: 68, y: 1622, width: 282, height: 10, fill: URURAU_RED, cornerRadius: 5 },
  },

  // ============================================================
  // SUBTÍTULO
  // ============================================================
  summary: {
    label: 'Subtítulo / Resumo',
    kind: 'text',
    defaults: {
      x: 68, y: 1655, text: 'Subtítulo com o resumo da matéria. Geralmente 2 a 3 linhas explicando o assunto principal da notícia.',
      fontSize: 43, fontFamily: 'Aileron, Inter, Arial',
      fill: '#E4E4E4', width: 755, lineHeight: 1.20,
    },
  },

  // ============================================================
  // WATERMARK
  // ============================================================
  watermark: {
    label: 'Marca d\'água',
    kind: 'text',
    defaults: {
      x: 68, y: 1875, text: 'URURAU.COM.BR', fontSize: 22,
      fontFamily: 'Aileron, Inter, Arial', fontStyle: 'bold',
      fill: '#FFFFFF', opacity: 0.7, letterSpacing: 3,
    },
  },
};

export const LAYER_ORDER = [
  'background',
  'article_image',
  'gradient_overlay',
  'category_bg', 'category_text',
  'title', 'separator', 'summary',
  'watermark',
];

export const LAYER_GROUPS = [
  { label: 'Estrutura', keys: ['background', 'article_image', 'gradient_overlay'] },
  { label: 'Categoria', keys: ['category_bg', 'category_text'] },
  { label: 'Conteúdo', keys: ['title', 'separator', 'summary'] },
  { label: 'Marca', keys: ['watermark'] },
];

export const CATEGORY_COLORS = {
  PRISAO: URURAU_RED, 'PRISÃO': URURAU_RED,
  OPINIAO: URURAU_RED, 'OPINIÃO': URURAU_RED,
  POLITICA: '#1D3557', 'POLÍTICA': '#1D3557',
  ESPORTE: '#2A9D8F',
  SEGURANCA: '#E9C46A', 'SEGURANÇA': '#E9C46A',
  ECONOMIA: '#F4A261',
  GERAL: '#6C757D',
  INTERNACIONAL: '#4361EE',
  SAUDE: '#06A77D', 'SAÚDE': '#06A77D',
  EDUCACAO: '#7209B7', 'EDUCAÇÃO': '#7209B7',
  CULTURA: '#F72585',
};

export function exportTemplate(nodesRef) {
  const out = { version: 2, canvas: { width: CANVAS_W, height: CANVAS_H }, layers: {} };
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
      data.width = Math.round(node.width() || 0);
      data.letterSpacing = node.letterSpacing() || 0;
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
