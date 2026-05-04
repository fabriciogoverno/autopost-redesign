/**
 * AutoPost Ururau — Testes Unitários: Template Loader
 * Fase 8 — Testes
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { loadTemplate, fillTemplate, truncateText, wrapTitle, isValidHash } from '../src/backend/modules/template-loader.js';

describe('Template Loader', () => {
    describe('loadTemplate', () => {
        it('deve carregar template ururau-reels', () => {
            const template = loadTemplate('ururau-reels');
            assert.ok(template);
            assert.strictEqual(template.id, 'ururau-reels');
            assert.ok(template.dimensions);
            assert.strictEqual(template.dimensions.width, 1080);
            assert.strictEqual(template.dimensions.height, 1920);
        });

        it('deve lançar erro para template inexistente', () => {
            assert.throws(() => loadTemplate('inexistente'), /não encontrado/);
        });

        it('deve validar estrutura do template', () => {
            assert.throws(() => loadTemplate('invalid'), /não encontrado/);
        });
    });

    describe('fillTemplate', () => {
        it('deve preencher placeholders', () => {
            const template = loadTemplate('ururau-reels');
            const post = {
                title: 'Título de Teste',
                summary: 'Resumo de teste',
                category: 'opiniao'
            };
            const filled = fillTemplate(template, post);

            const titleEl = filled.elements.find(e => e.id === 'title_main');
            assert.ok(titleEl.text.includes('Título de Teste'));

            const badgeEl = filled.elements.find(e => e.id === 'category_badge');
            assert.ok(badgeEl.text.includes('OPINIÃO'));
        });

        it('deve aplicar cor do badge por categoria', () => {
            const template = loadTemplate('ururau-reels');
            const post = { title: 'Test', summary: 'Test', category: 'esporte' };
            const filled = fillTemplate(template, post);
            const badge = filled.elements.find(e => e.id === 'category_badge');
            assert.strictEqual(badge.background, '#2A9D8F');
        });
    });

    describe('truncateText', () => {
        it('deve truncar texto longo', () => {
            const text = 'a'.repeat(100);
            const truncated = truncateText(text, 20);
            assert.strictEqual(truncated.length, 20);
            assert.ok(truncated.endsWith('...'));
        });

        it('não deve truncar texto curto', () => {
            const text = 'curto';
            const result = truncateText(text, 20);
            assert.strictEqual(result, 'curto');
        });
    });

    describe('wrapTitle', () => {
        it('deve quebrar título em múltiplas linhas', () => {
            const title = 'Este é um título muito longo que deve ser quebrado em várias linhas para caber no template';
            const lines = wrapTitle(title, 800, 58);
            assert.ok(lines.length > 1);
            assert.ok(lines.length <= 5);
        });

        it('deve limitar a 5 linhas', () => {
            const title = 'a '.repeat(100);
            const lines = wrapTitle(title, 300, 58);
            assert.ok(lines.length <= 5);
        });
    });
});
