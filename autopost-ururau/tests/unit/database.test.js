/**
 * AutoPost Ururau — Testes Unitários: Database
 * Fase 8 — Testes
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import database from '../src/backend/core/database.js';

describe('Database Module', () => {
    before(async () => {
        process.env.URURAU_DB_PATH = './database/test_autopost.db';
        await database.init();
    });

    after(async () => {
        await database.close();
        // Limpa arquivo de teste
        try {
            const { unlinkSync } = await import('fs');
            unlinkSync('./database/test_autopost.db');
        } catch (e) {}
    });

    describe('Schema', () => {
        it('deve criar tabela posts_queue', async () => {
            const db = await database.connect();
            const table = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='posts_queue'");
            assert.ok(table, 'Tabela posts_queue deve existir');
        });

        it('deve criar tabela publications', async () => {
            const db = await database.connect();
            const table = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='publications'");
            assert.ok(table, 'Tabela publications deve existir');
        });

        it('deve criar tabela scheduled_posts', async () => {
            const db = await database.connect();
            const table = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='scheduled_posts'");
            assert.ok(table, 'Tabela scheduled_posts deve existir');
        });

        it('deve criar tabela audit_log', async () => {
            const db = await database.connect();
            const table = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='audit_log'");
            assert.ok(table, 'Tabela audit_log deve existir');
        });

        it('deve criar tabela caption_cache', async () => {
            const db = await database.connect();
            const table = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='caption_cache'");
            assert.ok(table, 'Tabela caption_cache deve existir');
        });

        it('deve criar índices', async () => {
            const db = await database.connect();
            const indices = await db.all("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'");
            assert.ok(indices.length >= 5, 'Deve haver pelo menos 5 índices');
        });
    });

    describe('posts_queue', () => {
        it('deve inserir notícia', async () => {
            const post = {
                hash: 'abc123def4567890123456789012345678901234567890123456789012345678',
                source: 'g1_rj',
                url: 'https://g1.globo.com/rj/teste',
                title: 'Teste de Inserção',
                summary: 'Resumo do teste',
                category: 'geral',
                priority: 1
            };
            const result = await database.insertPost(post);
            assert.strictEqual(result.inserted, true);
            assert.ok(result.id > 0);
        });

        it('deve bloquear duplicidade por hash', async () => {
            const post = {
                hash: 'dup123def4567890123456789012345678901234567890123456789012345678',
                source: 'g1_rj',
                url: 'https://g1.globo.com/rj/dup',
                title: 'Duplicidade Teste',
                category: 'geral'
            };
            const r1 = await database.insertPost(post);
            assert.strictEqual(r1.inserted, true);

            const r2 = await database.insertPost(post);
            assert.strictEqual(r2.inserted, false);
            assert.strictEqual(r2.reason, 'duplicate_hash');
        });

        it('deve buscar notícia por ID', async () => {
            const post = {
                hash: 'find123def456789012345678901234567890123456789012345678901234567',
                source: 'itatiaia',
                url: 'https://itatiaia.com.br/teste',
                title: 'Busca por ID',
                category: 'esporte'
            };
            const result = await database.insertPost(post);
            const found = await database.getPostById(result.id);
            assert.ok(found);
            assert.strictEqual(found.title, 'Busca por ID');
        });

        it('deve buscar notícia por hash', async () => {
            const post = {
                hash: 'hashfind12345678901234567890123456789012345678901234567890123456',
                source: 'campos24h',
                url: 'https://campos24h.com.br/teste',
                title: 'Busca por Hash',
                category: 'economia'
            };
            await database.insertPost(post);
            const found = await database.getPostByHash(post.hash);
            assert.ok(found);
            assert.strictEqual(found.source, 'campos24h');
        });

        it('deve listar posts pendentes', async () => {
            const posts = await database.getPendingPosts(10);
            assert.ok(Array.isArray(posts));
        });

        it('deve atualizar status', async () => {
            const post = {
                hash: 'status123456789012345678901234567890123456789012345678901234567',
                source: 'g1_rj',
                url: 'https://g1.globo.com/rj/status',
                title: 'Status Update',
                category: 'politica'
            };
            const result = await database.insertPost(post);
            await database.updatePostStatus(result.id, 'published');
            const updated = await database.getPostById(result.id);
            assert.strictEqual(updated.status, 'published');
        });

        it('deve ignorar post', async () => {
            const post = {
                hash: 'ignore123456789012345678901234567890123456789012345678901234567',
                source: 'g1_rj',
                url: 'https://g1.globo.com/rj/ignore',
                title: 'Ignore Test',
                category: 'geral'
            };
            const result = await database.insertPost(post);
            await database.ignorePost(result.id, 'test_ignore');
            const ignored = await database.getPostById(result.id);
            assert.strictEqual(ignored.status, 'ignored');
        });
    });

    describe('publications', () => {
        it('deve inserir publicação', async () => {
            const pub = {
                queue_id: 1,
                platform: 'instagram',
                post_id: '179123456789',
                post_url: 'https://instagram.com/p/abc',
                status: 'published',
                media_paths: JSON.stringify([{ format: 'reels', path: '/test.png' }]),
                caption: 'Teste'
            };
            const id = await database.insertPublication(pub);
            assert.ok(id > 0);
        });

        it('deve listar publicações por queue_id', async () => {
            const pubs = await database.getPublicationsByQueueId(1);
            assert.ok(Array.isArray(pubs));
        });
    });

    describe('audit_log', () => {
        it('deve registrar log', async () => {
            await database.logAudit('test_action', 1, 'instagram', 'Teste de auditoria');
            const logs = await database.getAuditLog(10, 'test_action');
            assert.ok(logs.length > 0);
            assert.strictEqual(logs[0].action, 'test_action');
        });
    });

    describe('caption_cache', () => {
        it('deve cachear legenda', async () => {
            const captions = { instagram: 'test', facebook: 'test', twitter: 'test', linkedin: 'test', threads: 'test', tiktok: 'test', whatsapp: 'test' };
            await database.cacheCaption('cache1234567890123456789012345678901234567890123456789012345678', captions, 'test');
            const cached = await database.getCachedCaption('cache1234567890123456789012345678901234567890123456789012345678');
            assert.ok(cached);
            assert.strictEqual(cached.model_used, 'test');
        });
    });

    describe('system_config', () => {
        it('deve ler config padrão', async () => {
            const val = await database.getConfig('version');
            assert.strictEqual(val, '1.0.0');
        });

        it('deve atualizar config', async () => {
            await database.setConfig('test_key', 'test_value');
            const val = await database.getConfig('test_key');
            assert.strictEqual(val, 'test_value');
        });
    });
});
