/**
 * Definição das camadas editáveis do template Ururau Reels (1080×1920).
 *
 * Coordenadas EXATAS extraídas via Figma REST API:
 *   GET https://api.figma.com/v1/files/42aGTHvkypbKFU8E0dUslt
 *
 * Original (Story do Instagram do usuário, criado no Canva) tinha frame
 * 810×1440 pt. Aplicado scale 4/3 para chegar em canvas 1080×1920 px.
 *
 * Cada camada é editável independentemente no painel direito do editor.
 */

export const CANVAS_W = 1080;
export const CANVAS_H = 1920;

export const TEMPLATE_LAYERS = {
  // ===== MOLDURA opcional =====
  frame_border: {
    label: 'Moldura',
    kind: 'rect-stroke',
    defaults: {
      x: 12, y: 12, width: 1056, height: 1896,
      stroke: '#FFDE59', strokeWidth: 8, fill: 'transparent',
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

  // ===== IMAGEM DA MATÉRIA — slot superior (até onde começa o gradient) =====
  article_image: {
    label: 'Imagem da matéria',
    kind: 'image-slot',
    defaults: { x: 0, y: 0, width: 1080, height: 1100 },
  },

  // ===== GRADIENT OVERLAY — começa onde os rectangles do PDF começam =====
  gradient_overlay: {
    label: 'Gradiente (escurece base)',
    kind: 'gradient-rect',
    defaults: {
      x: 0, y: 0, width: 1080, height: 1920,
      gradientStart: 0.43, gradientEnd: 0.62,
      colorTop: 'rgba(10,10,10,0)', colorMid: 'rgba(10,10,10,0.7)', colorBottom: 'rgba(10,10,10,1)',
    },
    locked: true,
  },

  // ============================================================
  // LOGO URURAU (canto superior direito)
  // Coordenadas exatas extraídas do Figma
  // ============================================================
  logo_ururau: {
    label: 'Logo · "ururau"',
    kind: 'text',
    defaults: {
      x: 609, y: 23, text: 'ururau', fontSize: 85,
      fontFamily: 'Aileron, Inter, Arial', fontStyle: '900',
      fill: '#FFFFFF', width: 304, letterSpacing: -1,
    },
  },
  logo_line_left: {
    label: 'Logo · linha ouro ←',
    kind: 'rect',
    defaults: { x: 604, y: 140, width: 78, height: 5, fill: '#FFDE59', cornerRadius: 2 },
  },
  logo_anos: {
    label: 'Logo · "19 ANOS"',
    kind: 'text',
    defaults: {
      x: 689, y: 121, text: '19 ANOS', fontSize: 33,
      fontFamily: 'Aileron, Inter, Arial', fontStyle: 'bold',
      fill: '#FFDE59', letterSpacing: 2,
    },
  },
  logo_line_right: {
    label: 'Logo · linha ouro →',
    kind: 'rect',
    defaults: { x: 836, y: 140, width: 78, height: 5, fill: '#FFDE59', cornerRadius: 2 },
  },
  logo_circle: {
    label: 'Logo · círculo @',
    kind: 'circle',
    defaults: { x: 984, y: 105, radius: 58, fill: '#E63946' },
  },
  logo_at: {
    label: 'Logo · símbolo @',
    kind: 'text',
    defaults: {
      x: 935, y: 50, text: '@', fontSize: 95,
      fontFamily: 'Inter, Arial', fontStyle: 'bold',
      fill: '#FFFFFF', width: 100, align: 'center',
    },
  },

  // ============================================================
  // BADGE CATEGORIA (rodapé esquerda)
  // ============================================================
  category_bg: {
    label: 'Badge · fundo',
    kind: 'rect',
    defaults: { x: 65, y: 1176, width: 210, height: 76, fill: '#E63946', cornerRadius: 2 },
  },
  category_text: {
    label: 'Badge · texto',
    kind: 'text',
    defaults: {
      x: 84, y: 1185, text: 'PRISÃO', fontSize: 45,
      fontFamily: 'Aileron, Inter, Arial', fontStyle: 'bold',
      fill: '#FFFFFF', letterSpacing: 0,
    },
  },

  // ============================================================
  // TÍTULO (cinza claro, bold, grande)
  // ============================================================
  title: {
    label: 'Título',
    kind: 'text',
    defaults: {
      x: 68, y: 1265, text: 'Título da matéria aqui em até 4 linhas para boa legibilidade',
      fontSize: 76, fontFamily: 'Aileron, Inter, Arial', fontStyle: '900',
      fill: '#E4E4E4', width: 970, lineHeight: 1.10,
    },
  },

  // ============================================================
  // LINHA DECORATIVA VERMELHA (entre título e subtítulo)
  // ============================================================
  separator: {
    label: 'Linha decorativa',
    kind: 'rect',
    defaults: { x: 68, y: 1622, width: 282, height: 10, fill: '#C11F25', cornerRadius: 5 },
  },

  // ============================================================
  // SUBTÍTULO / RESUMO
  // ============================================================
  summary: {
    label: 'Subtítulo / Resumo',
    kind: 'text',
    defaults: {
      x: 68, y: 1654, text: 'Subtítulo com o resumo da matéria. Geralmente 2 a 3 linhas explicando o assunto principal da notícia.',
      fontSize: 40, fontFamily: 'Aileron, Inter, Arial',
      fill: '#E4E4E4', width: 970, lineHeight: 1.25,
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
