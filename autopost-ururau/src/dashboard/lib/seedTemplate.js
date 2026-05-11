// Template padrão pré-cadastrado para o user (replicando o do AutoPost real)
// Carrega automaticamente na primeira vez que o user entra em /templates

import { URURAU_RED } from './templateLayers';

export const SEED_TEMPLATE = {
  id: 'mine_ururau_default',
  name: 'Template ururau',
  accent: URURAU_RED,
  category: 'noticia',
  preview: 'custom',
  sourceId: 'ururau-default',
  createdAt: new Date().toISOString(),
  // Texto exemplo baseado no template real do user
  state: {
    version: 4,
    canvas: { width: 1080, height: 1920 },
    layers: {
      'category_text': {
        x: 84, y: 1186, text: 'APREENSÃO', fontSize: 56,
        fontFamily: 'Aileron, Inter, Arial', fontStyle: 'bold',
        fill: '#FFFFFF', width: 280, visible: true, opacity: 1, align: 'center',
      },
      'category': {
        x: 67, y: 1169, width: 320, height: 90,
        fill: URURAU_RED, cornerRadius: 4, visible: true, opacity: 1,
      },
      'title': {
        x: 68, y: 1266,
        text: 'Porsche do Thiago Rangel é apreendido pela PF em operação no Rio',
        fontSize: 85, fontFamily: 'Aileron, Inter, Arial', fontStyle: 'bold',
        fill: '#FFFFFF', width: 940, lineHeight: 1.08, visible: true, opacity: 1,
      },
      'line': {
        x: 68, y: 1622, width: 282, height: 10,
        fill: URURAU_RED, cornerRadius: 5, visible: true, opacity: 1,
      },
      'subtitle': {
        x: 68, y: 1655,
        text: 'PF cumpre mandados de busca e apreensão em operação contra fraudes na Educação do RJ',
        fontSize: 43, fontFamily: 'Aileron, Inter, Arial',
        fill: '#E4E4E4', width: 940, lineHeight: 1.20, visible: true, opacity: 1,
      },
    },
  },
  thumb: null, // Será gerado ao abrir no editor
  baseImage: null, // Usa o canvaBaseImage.js padrão
};

const TEMPLATES_KEY = 'ururau-my-templates-v1';

export function ensureSeedTemplate() {
  if (typeof window === 'undefined') return;
  try {
    const all = JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]');
    const has = all.some(t => t.id === SEED_TEMPLATE.id);
    if (!has) {
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify([SEED_TEMPLATE, ...all]));
    }
  } catch (e) {
    console.error('Erro ao criar seed template:', e);
  }
}
