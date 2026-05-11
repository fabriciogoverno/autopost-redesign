/**
 * Definição das camadas editáveis do template Ururau Reels.
 * Cada camada é um elemento individual que aparece no painel Camadas
 * e pode ser arrastada, redimensionada e ter propriedades alteradas.
 *
 * Estrutura inspirada na análise do template no Figma do usuário,
 * onde cada elemento gráfico é uma camada separada (Vector, Clip path frame, etc).
 */

export const TEMPLATE_LAYERS = {
  // ===== MOLDURA (borda externa amarela opcional) =====
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
    locked: true, // não arrastável por padrão
  },

  // ===== IMAGEM DA MATÉRIA =====
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
      gradientStart: 0.35, gradientEnd: 0.60,
      colorTop: 'rgba(10,10,10,0)', colorMid: 'rgba(10,10,10,0.7)', colorBottom: 'rgba(10,10,10,1)',
    },
    locked: true,
  },

  // ===== LOGO URURAU — texto principal =====
  logo_ururau: {
    label: 'Logo · texto "ururau"',
    kind: 'text',
    defaults: {
      x: 540, y: 60, text: 'ururau', fontSize: 80,
      fontFamily: 'Aileron, Inter, Arial', fontStyle: 'bold',
      fill: '#FFFFFF', letterSpacing: -2,
    },
  },

  // ===== LOGO — linha dourada esquerda =====
  logo_line_left: {
    label: 'Logo · linha dourada ←',
    kind: 'rect',
    defaults: { x: 540, y: 138, width: 65, height: 4, fill: '#F5C518', cornerRadius: 2 },
  },

  // ===== LOGO — "19 ANOS" texto dourado =====
  logo_anos: {
    label: 'Logo · "19 ANOS"',
    kind: 'text',
    defaults: {
      x: 615, y: 132, text: '19 ANOS', fontSize: 22,
      fontFamily: 'Aileron, Inter, Arial', fontStyle: 'bold',
      fill: '#F5C518', letterSpacing: 3,
    },
  },

  // ===== LOGO — linha dourada direita =====
  logo_line_right: {
    label: 'Logo · linha dourada →',
    kind: 'rect',
    defaults: { x: 720, y: 138, width: 65, height: 4, fill: '#F5C518', cornerRadius: 2 },
  },

  // ===== LOGO — círculo vermelho do "@" =====
  logo_circle: {
    label: 'Logo · círculo @',
    kind: 'circle',
    defaults: { x: 900, y: 95, radius: 55, fill: '#E63946' },
  },

  // ===== LOGO — símbolo "@" =====
  logo_at: {
    label: 'Logo · símbolo @',
    kind: 'text',
    defaults: {
      x: 860, y: 50, text: '@', fontSize: 90,
      fontFamily: 'Inter, Arial', fontStyle: 'bold',
      fill: '#FFFFFF', width: 80, align: 'center',
    },
  },

  // ===== BADGE CATEGORIA =====
  category_bg: {
    label: 'Badge · fundo',
    kind: 'rect',
    defaults: { x: 55, y: 1180, width: 240, height: 80, fill: '#E63946', cornerRadius: 4 },
  },
  category_text: {
    label: 'Badge · texto',
    kind: 'text',
    defaults: {
      x: 80, y: 1200, text: 'PRISÃO', fontSize: 36,
      fontFamily: 'Aileron, Inter, Arial', fontStyle: 'bold',
      fill: '#FFFFFF', letterSpacing: 1,
    },
  },

  // ===== TÍTULO =====
  title: {
    label: 'Título',
    kind: 'text',
    defaults: {
      x: 55, y: 1290, text: 'Título da matéria aqui em até 4 linhas para boa legibilidade',
      fontSize: 72, fontFamily: 'Aileron, Inter, Arial', fontStyle: 'bold',
      fill: '#FFFFFF', width: 970, lineHeight: 1.1,
    },
  },

  // ===== LINHA DECORATIVA VERMELHA =====
  separator: {
    label: 'Linha decorativa',
    kind: 'rect',
    defaults: { x: 55, y: 1700, width: 200, height: 6, fill: '#C11F25', cornerRadius: 3 },
  },

  // ===== SUBTÍTULO / RESUMO =====
  summary: {
    label: 'Subtítulo / Resumo',
    kind: 'text',
    defaults: {
      x: 55, y: 1740, text: 'Subtítulo com o resumo da matéria. Geralmente 2 a 3 linhas de texto explicando o assunto principal.',
      fontSize: 32, fontFamily: 'Aileron, Inter, Arial',
      fill: '#E0E0E0', width: 970, lineHeight: 1.35,
    },
  },

  // ===== WATERMARK =====
  watermark: {
    label: 'Marca d\'água (URURAU.COM.BR)',
    kind: 'text',
    defaults: {
      x: 55, y: 1880, text: 'URURAU.COM.BR', fontSize: 20,
      fontFamily: 'Aileron, Inter, Arial', fontStyle: 'bold',
      fill: '#FFFFFF', opacity: 0.5, letterSpacing: 3,
    },
  },
};

// Ordem de empilhamento (do fundo para o topo)
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

// Cores pré-definidas pra categorias (badge muda automaticamente)
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
