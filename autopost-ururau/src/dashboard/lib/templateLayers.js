/**
 * Definição das camadas editáveis do template Ururau Reels (1080x1920).
 *
 * Medidas extraídas do design original do usuário no Canva
 * (DAHJU-vIOgA - Cópia de Modelo da marca sem nome - Story do Instagram).
 *
 * Logo group medido: X=607.9 Y=23.9 W=304 H=108.1 (Aileron Bold 67.9px)
 * Badge categoria: Aileron Bold 35.8px
 *
 * Cada camada é editável independentemente no painel direito do editor.
 */

export const CANVAS_W = 1080;
export const CANVAS_H = 1920;

// Posições absolutas do logo no Canvas (extraídas do Canva original)
const LOGO_X = 608;
const LOGO_Y = 24;
const LOGO_W = 304;

export const TEMPLATE_LAYERS = {
  // ===== MOLDURA opcional =====
  frame_border: {
    label: 'Moldura',
    kind: 'rect-stroke',
    defaults: {
      x: 12, y: 12, width: 1056, height: 1896,
      stroke: '#F5C518', strokeWidth: 8, fill: 'transparent',
      cornerRadius: 0, visible: false,
    },
  },

  // ===== BACKGROUND =====
  background: {
    label: 'Fundo (cor)',
    kind: 'rect',
    defaults: { x: 0, y: 0, width: 1080, height: 1920, fill: '#0a0a0a', listening: false },
    locked: true,
  },

  // ===== IMAGEM DA MATÉRIA (slot superior 65%) =====
  article_image: {
    label: 'Imagem da matéria',
    kind: 'image-slot',
    defaults: { x: 0, y: 0, width: 1080, height: 1248 },
  },

  // ===== GRADIENT OVERLAY =====
  gradient_overlay: {
    label: 'Gradiente (escurece base)',
    kind: 'gradient-rect',
    defaults: {
      x: 0, y: 0, width: 1080, height: 1920,
      gradientStart: 0.45, gradientEnd: 0.68,
      colorTop: 'rgba(10,10,10,0)', colorMid: 'rgba(10,10,10,0.6)', colorBottom: 'rgba(10,10,10,1)',
    },
    locked: true,
  },

  // ===== LOGO URURAU =====
  // Coordenadas relativas ao Canvas (logo posicionado top-right)
  logo_ururau: {
    label: 'Logo · "ururau"',
    kind: 'text',
    defaults: {
      x: LOGO_X, y: LOGO_Y, text: 'ururau', fontSize: 68,
      fontFamily: 'Aileron, Inter, Arial', fontStyle: 'bold',
      fill: '#FFFFFF', letterSpacing: -1,
    },
  },
  logo_line_left: {
    label: 'Logo · linha ouro ←',
    kind: 'rect',
    defaults: { x: LOGO_X + 4, y: LOGO_Y + 82, width: 56, height: 4, fill: '#F5C518', cornerRadius: 2 },
  },
  logo_anos: {
    label: 'Logo · "19 ANOS"',
    kind: 'text',
    defaults: {
      x: LOGO_X + 70, y: LOGO_Y + 76, text: '19 ANOS', fontSize: 18,
      fontFamily: 'Aileron, Inter, Arial', fontStyle: 'bold',
      fill: '#F5C518', letterSpacing: 2,
    },
  },
  logo_line_right: {
    label: 'Logo · linha ouro →',
    kind: 'rect',
    defaults: { x: LOGO_X + 170, y: LOGO_Y + 82, width: 56, height: 4, fill: '#F5C518', cornerRadius: 2 },
  },
  logo_circle: {
    label: 'Logo · círculo @',
    kind: 'circle',
    defaults: { x: LOGO_X + LOGO_W - 50, y: LOGO_Y + 50, radius: 54, fill: '#E63946' },
  },
  logo_at: {
    label: 'Logo · símbolo @',
    kind: 'text',
    defaults: {
      x: LOGO_X + LOGO_W - 96, y: LOGO_Y - 5, text: '@', fontSize: 92,
      fontFamily: 'Inter, Arial', fontStyle: 'bold',
      fill: '#FFFFFF', width: 90, align: 'center',
    },
  },

  // ===== BADGE CATEGORIA =====
  // Posicionada no terço inferior, com altura = fontSize × ~2
  category_bg: {
    label: 'Badge · fundo',
    kind: 'rect',
    defaults: { x: 55, y: 1180, width: 220, height: 64, fill: '#E63946', cornerRadius: 2 },
  },
  category_text: {
    label: 'Badge · texto',
    kind: 'text',
    defaults: {
      x: 75, y: 1192, text: 'PRISÃO', fontSize: 36,
      fontFamily: 'Aileron, Inter, Arial', fontStyle: 'bold',
      fill: '#FFFFFF', letterSpacing: 0,
    },
  },

  // ===== TÍTULO =====
  // Fonte grande, bold, branco, multi-linha
  title: {
    label: 'Título',
    kind: 'text',
    defaults: {
      x: 55, y: 1280, text: 'Título da matéria aqui em até 4 linhas para boa legibilidade',
      fontSize: 88, fontFamily: 'Aileron, Inter, Arial', fontStyle: 'bold',
      fill: '#FFFFFF', width: 970, lineHeight: 1.05,
    },
  },

  // ===== LINHA DECORATIVA VERMELHA =====
  separator: {
    label: 'Linha decorativa',
    kind: 'rect',
    defaults: { x: 55, y: 1700, width: 180, height: 8, fill: '#C11F25', cornerRadius: 4 },
  },

  // ===== SUBTÍTULO / RESUMO =====
  summary: {
    label: 'Subtítulo / Resumo',
    kind: 'text',
    defaults: {
      x: 55, y: 1730, text: 'Subtítulo com o resumo da matéria. Geralmente 2 a 3 linhas explicando o assunto principal.',
      fontSize: 32, fontFamily: 'Aileron, Inter, Arial',
      fill: '#D8D8D8', width: 970, lineHeight: 1.30,
    },
  },

  // ===== WATERMARK =====
  watermark: {
    label: 'Marca d\'água',
    kind: 'text',
    defaults: {
      x: 55, y: 1875, text: 'URURAU.COM.BR', fontSize: 18,
      fontFamily: 'Aileron, Inter, Arial', fontStyle: 'bold',
      fill: '#FFFFFF', opacity: 0.5, letterSpacing: 3,
    },
  },
};

// Ordem de empilhamento (fundo → topo)
export const LAYER_ORDER = [
  'background',
  'article_image',
  'gradient_overlay',
  'frame_border',
  'logo_ururau', 'logo_line_left', 'logo_anos', 'logo_line_right', 'logo_circle', 'logo_at',
  'category_bg', 'category_text',
  'title', 'separator', 'summary',
  'watermark',
];

// Agrupamento visual no painel de camadas
export const LAYER_GROUPS = [
  { label: 'Estrutura', keys: ['frame_border', 'background', 'article_image', 'gradient_overlay'] },
  { label: 'Logo Ururau', keys: ['logo_ururau', 'logo_line_left', 'logo_anos', 'logo_line_right', 'logo_circle', 'logo_at'] },
  { label: 'Categoria', keys: ['category_bg', 'category_text'] },
  { label: 'Conteúdo', keys: ['title', 'separator', 'summary'] },
  { label: 'Marca', keys: ['watermark'] },
];

// Cores pré-definidas pra categorias
export const CATEGORY_COLORS = {
  PRISAO: '#E63946', 'PRISÃO': '#E63946',
  OPINIAO: '#E63946', 'OPINIÃO': '#E63946',
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

/**
 * Exporta o estado atual de todas as camadas como JSON serializável.
 * Útil para salvar template completo (cores, posições, textos) em
 * localStorage ou backend.
 */
export function exportTemplate(nodesRef) {
  const out = { version: 1, canvas: { width: CANVAS_W, height: CANVAS_H }, layers: {} };
  Object.entries(nodesRef).forEach(([key, node]) => {
    const def = TEMPLATE_LAYERS[key];
    if (!def || !node) return;
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

/**
 * Aplica um JSON exportado de volta nas camadas (Konva nodes).
 */
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
