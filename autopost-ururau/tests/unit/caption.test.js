/**
 * AutoPost Ururau — Testes Unitários: Caption Generator
 * Fase 8 — Testes
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import captionGenerator from '../src/backend/modules/caption.js';
import database from '../src/backend/core/database.js';

describe('Caption Generator', () => {
    before(async () => {
        process.env.URURAU_DB_PATH = './database/test_caption.db';
        await database.init();
    });

    after(async () => {
        await database.close();
        try {
            const { unlinkSync } = await import('fs');
            unlinkSync('./database/test_caption.db');
        } catch (e) {}
    });

    it('deve gerar fallback template', async () => {
        const post = {
            title: 'Teste de Legenda',
            summary: 'Resumo do teste',
            category: 'geral',
            url: 'https://test.com'
        };
        const result = await captionGenerator.generate(post, { forceRegenerate: true });
        assert.strictEqual(result.success, true);
        assert.ok(result.captions);
        assert.ok(result.captions.instagram);
        assert.ok(result.captions.whatsapp);
        assert.ok(result.captions.twitter);
    });

    it('deve respeitar limites por plataforma', async () => {
        const post = { title: 'Test', summary: 'Test', category: 'geral' };
        const result = await captionGenerator.generate(post, { forceRegenerate: true });
        assert.ok(result.captions.twitter.length <= 280, 'Twitter deve ter no máximo 280 chars');
        assert.ok(result.captions.tiktok.length <= 100, 'TikTok deve ter no máximo 100 chars');
    });

    it('deve cachear legendas', async () => {
        const post = {
            hash: 'cache_test_1234567890123456789012345678901234567890123456789012345678',
            title: 'Cache Test',
            summary: 'Teste de cache',
            category: 'geral'
        };
        const r1 = await captionGenerator.generate(post);
        const r2 = await captionGenerator.generate(post);
        assert.strictEqual(r2.cached, true);
        assert.ok(r2.duration < 100, 'Cache deve ser rápido');
    });

    it('deve validar legendas', () => {
        const valid = captionGenerator.validateCaptions({
            instagram: 'a'.repeat(50),
            facebook: 'a'.repeat(50),
            twitter: 'a'.repeat(50),
            linkedin: 'a'.repeat(50),
            threads: 'a'.repeat(50),
            tiktok: 'a'.repeat(50),
            whatsapp: 'a'.repeat(50)
        });
        assert.strictEqual(valid.valid, true);

        const invalid = captionGenerator.validateCaptions({
            instagram: '',
            facebook: 'test',
            twitter: 'test',
            linkedin: 'test',
            threads: 'test',
            tiktok: 'test',
            whatsapp: 'test'
        });
        assert.strictEqual(invalid.valid, false);
    });

    it('deve gerar fallback se IA falhar', () => {
        const post = { title: 'Fallback Test', summary: 'Teste', category: 'geral', url: 'https://test.com' };
        const fallback = captionGenerator.generateTemplateFallback(post);
        assert.ok(fallback.instagram);
        assert.ok(fallback.whatsapp);
        assert.ok(fallback.twitter);
        assert.ok(fallback.instagram.includes('Fallback Test'));
    });
});
