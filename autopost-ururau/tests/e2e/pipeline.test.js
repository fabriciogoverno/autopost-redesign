/**
 * AutoPost Ururau — Testes E2E: Pipeline Completo
 * Fase 8 — Testes
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import database from '../src/backend/core/database.js';
import collector from '../src/backend/modules/collector.js';
import captionGenerator from '../src/backend/modules/caption.js';
import { generatePostHash } from '../src/backend/core/hash.js';

describe('E2E Pipeline', () => {
    before(async () => {
        process.env.URURAU_DB_PATH = './database/test_e2e.db';
        await database.init();
    });

    after(async () => {
        await database.close();
        try {
            const { unlinkSync } = await import('fs');
            unlinkSync('./database/test_e2e.db');
        } catch (e) {}
    });

    it('deve executar pipeline: coleta → legenda → cache', async () => {
        const news = {
            source: 'g1_rj',
            url: 'https://g1.globo.com/rj/e2e-test',
            title: 'E2E Test: Operação policial em Campos',
            summary: 'Ação conjunta resultou em prisões na zona Norte.',
            category: 'seguranca',
            priority: 2
        };

        const collectResult = await collector.processPost(news);
        assert.strictEqual(collectResult.success, true);
        const postId = collectResult.id;

        const post = await database.getPostById(postId);
        assert.ok(post);
        assert.strictEqual(post.status, 'pending');
        assert.ok(generatePostHash(news));

        const captionResult = await captionGenerator.generate(post, { forceRegenerate: true });
        assert.strictEqual(captionResult.success, true);
        assert.ok(captionResult.captions.instagram);
        assert.ok(captionResult.captions.whatsapp);

        const cachedResult = await captionGenerator.generate(post);
        assert.strictEqual(cachedResult.cached, true);
        assert.ok(cachedResult.duration < 100);

        const logs = await database.getAuditLog(100);
        const collectLog = logs.find(l => l.action === 'collect');
        assert.ok(collectLog);
    });

    it('deve bloquear duplicidade no pipeline', async () => {
        const news = {
            source: 'campos24h',
            url: 'https://campos24h.com.br/e2e-dup',
            title: 'E2E Duplicidade Test',
            category: 'geral'
        };

        const r1 = await collector.processPost(news);
        assert.strictEqual(r1.success, true);

        const r2 = await collector.processPost(news);
        assert.strictEqual(r2.success, false);
        assert.strictEqual(r2.reason, 'duplicate');
    });

    it('deve respeitar prioridade na fila', async () => {
        collector.resetStats();

        const low = { source: 'g1_rj', url: 'https://g1.globo.com/rj/low', title: 'Low Priority', category: 'geral', priority: 0 };
        const high = { source: 'g1_rj', url: 'https://g1.globo.com/rj/high', title: 'High Priority', category: 'urgente', priority: 2 };

        await collector.processPost(low);
        await collector.processPost(high);

        const pending = await database.getPendingPosts(10);
        const highPost = pending.find(p => p.title === 'High Priority');
        const lowPost = pending.find(p => p.title === 'Low Priority');

        assert.ok(highPost);
        assert.ok(lowPost);
        assert.ok(pending.indexOf(highPost) <= pending.indexOf(lowPost));
    });
});
