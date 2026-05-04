/**
 * AutoPost Ururau — Testes Unitários: Collector
 * Fase 8 — Testes
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import collector from '../src/backend/modules/collector.js';
import database from '../src/backend/core/database.js';

describe('Collector Module', () => {
    before(async () => {
        process.env.URURAU_DB_PATH = './database/test_collector.db';
        await database.init();
    });

    after(async () => {
        await database.close();
        try {
            const { unlinkSync } = await import('fs');
            unlinkSync('./database/test_collector.db');
        } catch (e) {}
    });

    it('deve processar notícia válida', async () => {
        const post = {
            source: 'g1_rj',
            url: 'https://g1.globo.com/rj/teste-collector',
            title: 'Teste do Collector',
            summary: 'Resumo do teste',
            category: 'politica',
            priority: 1
        };
        const result = await collector.processPost(post);
        assert.strictEqual(result.success, true);
        assert.ok(result.id > 0);
        assert.strictEqual(result.status, 'pending');
    });

    it('deve bloquear duplicidade', async () => {
        const post = {
            source: 'g1_rj',
            url: 'https://g1.globo.com/rj/teste-dup',
            title: 'Duplicidade Collector',
            category: 'geral'
        };
        await collector.processPost(post);
        const result = await collector.processPost(post);
        assert.strictEqual(result.success, false);
        assert.strictEqual(result.reason, 'duplicate');
    });

    it('deve rejeitar notícia sem URL', async () => {
        const post = { title: 'Sem URL', source: 'test' };
        await assert.rejects(collector.processPost(post), /obrigatórios/);
    });

    it('deve rejeitar notícia sem título', async () => {
        const post = { url: 'https://test.com', source: 'test' };
        await assert.rejects(collector.processPost(post), /obrigatórios/);
    });

    it('deve processar batch de notícias', async () => {
        collector.resetStats();
        const posts = [
            { source: 'g1_rj', url: 'https://g1.globo.com/rj/batch1', title: 'Batch 1', category: 'esporte' },
            { source: 'itatiaia', url: 'https://itatiaia.com.br/batch2', title: 'Batch 2', category: 'economia' },
            { source: 'campos24h', url: 'https://campos24h.com.br/batch3', title: 'Batch 3', category: 'seguranca' }
        ];
        const result = await collector.processBatch(posts);
        assert.strictEqual(result.total, 3);
        assert.strictEqual(result.inserted, 3);
        assert.strictEqual(result.duplicates, 0);
        assert.strictEqual(result.errors, 0);
    });

    it('deve rastrear estatísticas', async () => {
        collector.resetStats();
        const post = {
            source: 'g1_rj',
            url: 'https://g1.globo.com/rj/stats-test',
            title: 'Stats Test',
            category: 'geral'
        };
        await collector.processPost(post);
        const stats = collector.getStats();
        assert.strictEqual(stats.received, 1);
        assert.strictEqual(stats.inserted, 1);
        assert.strictEqual(stats.duplicates, 0);
    });
});
