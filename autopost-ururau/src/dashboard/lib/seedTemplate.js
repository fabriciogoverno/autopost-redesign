// Template padrão pré-cadastrado replicando o real do user no AutoPost
// (Template ururau - matéria Eduardo Paes / prefeita SF)

import { URURAU_RED } from './templateLayers';

export const SEED_TEMPLATE = {
  id: 'mine_ururau_default',
  name: 'Template ururau',
  accent: URURAU_RED,
  category: 'noticia',
  preview: 'custom',
  sourceId: 'ururau-default',
  createdAt: new Date().toISOString(),
  state: {
    version: 5,
    canvas: { width: 1080, height: 1920 },
    layers: {
      'category': { x: 44, y: 1170, width: 220, height: 88, fill: URURAU_RED, cornerRadius: 4, visible: true, opacity: 1 },
      'category_text': { x: 70, y: 1190, text: 'OPINIÃO', fontSize: 50, fontFamily: 'Aileron, Inter, Arial', fontStyle: 'bold', fill: '#FFFFFF', width: 220, visible: true, opacity: 1, align: 'center' },
      'title': { x: 44, y: 1295, text: 'Eduardo Paes pode ter dado um passo em falso com a filiação da prefeita de São Francisco', fontSize: 72, fontFamily: 'Aileron, Inter, Arial', fontStyle: 'bold', fill: '#FFFFFF', width: 1000, lineHeight: 1.05, visible: true, opacity: 1 },
      'line': { x: 44, y: 1610, width: 125, height: 7, fill: URURAU_RED, cornerRadius: 3, visible: true, opacity: 1 },
      'subtitle': { x: 44, y: 1650, text: 'Aproximação da prefeita com Paes cria ruído no tabuleiro político do Norte Fluminense', fontSize: 36, fontFamily: 'Aileron, Inter, Arial', fill: '#D5D5D5', width: 1000, lineHeight: 1.18, visible: true, opacity: 1 },
    },
  },
  thumb: null,
  baseImage: null,
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
  } catch (e) { console.error(e); }
}
