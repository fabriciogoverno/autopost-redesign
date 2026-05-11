/**
 * Camadas calibradas a partir do PNG REAL exportado do AutoPost
 * (Template ururau - matéria Eduardo Paes / filiação prefeita SF)
 *
 * Padronização AutoPost: logo, subtitle, line, title, category, image-5, overlay, image
 */

export const CANVAS_W = 1080;
export const CANVAS_H = 1920;
export const URURAU_RED = '#C03434';  // Calibrado do badge real do template

export const TEMPLATE_LAYERS = {
  // Fundo preto fallback
  image: {
    label: 'image',
    kind: 'rect',
    defaults: { x: 0, y: 0, width: 1080, height: 1920, fill: '#000000', listening: false },
    locked: true,
  },

  // Slot da foto da matéria (cover-fit 1080x1920)
  'image-5': {
    label: 'image-5',
    kind: 'image-slot',
    defaults: { x: 0, y: 0, width: 1080, height: 1920 },
  },

  // Gradient escuro suave (começa em ~y=1080, totalmente preto em y=1920)
  overlay: {
    label: 'overlay',
    kind: 'gradient-rect',
    defaults: {
      x: 0, y: 0, width: 1080, height: 1920,
      gradientStart: 0.55,  // y=1056 transparente
      gradientEnd: 0.95,    // y=1824 escuro total
      colorTop: 'rgba(0,0,0,0)',
      colorMid: 'rgba(0,0,0,0.45)',
      colorBottom: 'rgba(0,0,0,0.98)',
    },
  },

  // Badge categoria — coordenadas do template real
  category: {
    label: 'category',
    kind: 'rect',
    defaults: { x: 44, y: 1170, width: 220, height: 88, fill: URURAU_RED, cornerRadius: 4 },
  },

  category_text: {
    label: 'category (texto)',
    kind: 'text',
    defaults: {
      x: 70, y: 1190, text: 'OPINIÃO', fontSize: 50,
      fontFamily: 'Aileron, Inter, Arial', fontStyle: 'bold',
      fill: '#FFFFFF', letterSpacing: 0, align: 'center',
    },
  },

  // Título — fonte grande branca bold, 4 linhas máx
  title: {
    label: 'title',
    kind: 'text',
    defaults: {
      x: 44, y: 1295,
      text: 'Título da matéria aqui em até 4 linhas para boa legibilidade',
      fontSize: 72, fontFamily: 'Aileron, Inter, Arial', fontStyle: 'bold',
      fill: '#FFFFFF', width: 1000, lineHeight: 1.05,
    },
  },

  // Linha decorativa vermelha curtinha
  line: {
    label: 'line',
    kind: 'rect',
    defaults: { x: 44, y: 1610, width: 125, height: 7, fill: URURAU_RED, cornerRadius: 3 },
  },

  // Subtítulo cinza claro
  subtitle: {
    label: 'subtitle',
    kind: 'text',
    defaults: {
      x: 44, y: 1650,
      text: 'Subtítulo com o resumo da matéria. Geralmente 2 a 3 linhas explicando o assunto principal da notícia.',
      fontSize: 36, fontFamily: 'Aileron, Inter, Arial',
      fill: '#D5D5D5', width: 1000, lineHeight: 1.18,
    },
  },
};

export const LAYER_ORDER = [
  'image',
  'image-5',
  'overlay',
  'category', 'category_text',
  'title',
  'line',
  'subtitle',
];

export const LAYER_DISPLAY_NAMES = ['logo', 'subtitle', 'line', 'title', 'category', 'image-5', 'overlay', 'image'];

export const LAYER_GROUPS = [
  { label: 'post',  keys: LAYER_DISPLAY_NAMES },
  { label: 'story', keys: LAYER_DISPLAY_NAMES },
];

export const CATEGORY_COLORS = {
  'OPINIÃO': URURAU_RED, 'OPINIAO': URURAU_RED,
  'PRISÃO': URURAU_RED, 'PRISAO': URURAU_RED,
  'APREENSÃO': URURAU_RED, 'APREENSAO': URURAU_RED,
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
  const out = { version: 5, canvas: { width: CANVAS_W, height: CANVAS_H }, layers: {} };
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
