/**
 * AutoPost Ururau — Testes de Integração: API REST
 * Fase 8 — Testes
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import database from '../src/backend/core/database.js';

describe('API Integration Tests', () => {
    before(async () => {
        process.env.URURAU_DB_PATH = './database/test_api.db';
        await database.init();
    });

    after(async () => {
        await database.close();
        try {
            const { unlinkSync } = await import('fs');
            unlinkSync('./database/test_api.db');
        } catch (e) {}
    });

    it('deve inicializar database', async () => {
        const db = await database.connect();
        const table = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='posts_queue'");
        assert.ok(table);
    });

    it('deve inserir e buscar notícia', async () => {
        const post = {
            hash: 'api_test_1234567890123456789012345678901234567890123456789012345678',
            source: 'g1_rj',
            url: 'https://g1.globo.com/rj/api-test',
            title: 'API Integration Test',
            category: 'geral'
        };
        const result = await database.insertPost(post);
        assert.strictEqual(result.inserted, true);

        const found = await database.getPostByHash(post.hash);
        assert.ok(found);
        assert.strictEqual(found.title, 'API Integration Test');
    });

    it('deve registrar audit log', async () => {
        await database.logAudit('api_test', 1, 'instagram', 'Teste de integração');
        const logs = await database.getAuditLog(10, 'api_test');
        assert.ok(logs.length > 0);
        assert.strictEqual(logs[0].action, 'api_test');
    });

    it('deve cachear caption', async () => {
        const captions = { instagram: 'test', facebook: 'test', twitter: 'test', linkedin: 'test', threads: 'test', tiktok: 'test', whatsapp: 'test' };
        await database.cacheCaption('api_cache_1234567890123456789012345678901234567890123456789012345678', captions, 'test');
        const cached = await database.getCachedCaption('api_cache_1234567890123456789012345678901234567890123456789012345678');
        assert.ok(cached);
    });
});
