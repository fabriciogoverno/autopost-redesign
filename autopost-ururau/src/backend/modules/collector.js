/**
 * AutoPost Ururau — Collector Module
 * Consome notícias dos scrapers Python existentes do Ururau
 * Fase 1 — Core
 */

import database from './database.js';
import { generatePostHash } from './hash.js';
import { logInfo, logError, logSuccess } from '../modules/logger.js';

/**
 * Interface esperada de entrada (JSON):
 * {
 *   "source": "g1_rj",
 *   "url": "https://g1.globo.com/rj/...",
 *   "title": "Título da notícia",
 *   "summary": "Resumo ou lead",
 *   "content": "Corpo completo (opcional)",
 *   "image_url": "https://...",
 *   "published_at": "2026-05-03T14:30:00Z",
 *   "category": "politica",
 *   "priority": 0
 * }
 */

class Collector {
    constructor() {
        this.stats = {
            received: 0,
            inserted: 0,
            duplicates: 0,
            errors: 0
        };
    }

    /**
     * Processa uma única notícia
     * @param {Object} post - Notícia no formato da interface
     * @returns {Object} - Resultado do processamento
     */
    async processPost(post) {
        this.stats.received++;

        // Validação obrigatória
        if (!post.url || !post.title) {
            this.stats.errors++;
            const err = new Error('URL e título são obrigatórios');
            await database.logAudit('error', null, null, `Validação falhou: ${err.message}`);
            throw err;
        }

        // Normalização
        const normalized = {
            source: post.source || 'unknown',
            url: post.url.trim(),
            title: post.title.trim(),
            summary: post.summary?.trim() || null,
            content: post.content?.trim() || null,
            image_url: post.image_url?.trim() || null,
            category: post.category || 'geral',
            published_at: post.published_at || null,
            priority: post.priority || 0,
            metadata: post.metadata || {}
        };

        // Gera hash SHA-256 (bloqueio de duplicidade)
        normalized.hash = generatePostHash(normalized);

        // Verifica duplicidade
        const existing = await database.getPostByHash(normalized.hash);
        if (existing) {
            this.stats.duplicates++;
            logInfo(`🔒 Duplicidade bloqueada: "${normalized.title.substring(0, 60)}..." (hash: ${normalized.hash.substring(0, 12)})`);
            return {
                success: false,
                reason: 'duplicate',
                hash: normalized.hash,
                existingId: existing.id
            };
        }

        // Insere no banco
        try {
            const result = await database.insertPost(normalized);

            if (result.inserted) {
                this.stats.inserted++;
                await database.logAudit(
                    'collect', 
                    result.id, 
                    null, 
                    `Fonte: ${normalized.source} | Categoria: ${normalized.category}`
                );
                logSuccess(`✅ Notícia #${result.id} inserida: "${normalized.title.substring(0, 60)}..."`);
                return {
                    success: true,
                    id: result.id,
                    hash: normalized.hash,
                    status: 'pending'
                };
            }
        } catch (err) {
            this.stats.errors++;
            await database.logAudit('error', null, null, `Insert falhou: ${err.message}`);
            throw err;
        }
    }

    /**
     * Processa batch de notícias (array)
     * @param {Array} posts - Array de notícias
     * @returns {Object} - Resumo do processamento
     */
    async processBatch(posts) {
        const results = [];

        for (const post of posts) {
            try {
                const result = await this.processPost(post);
                results.push(result);
            } catch (err) {
                results.push({ success: false, reason: 'error', error: err.message });
            }
        }

        const summary = {
            total: posts.length,
            inserted: results.filter(r => r.success && r.id).length,
            duplicates: results.filter(r => r.reason === 'duplicate').length,
            errors: results.filter(r => r.reason === 'error').length,
            results
        };

        logInfo(`📊 Batch processado: ${summary.inserted} inseridas, ${summary.duplicates} duplicadas, ${summary.errors} erros`);
        return summary;
    }

    /**
     * Consome arquivo JSON gerado por scraper Python
     * @param {string} filePath - Caminho para arquivo JSON
     */
    async consumeJsonFile(filePath) {
        const { readFileSync } = await import('fs');
        const data = JSON.parse(readFileSync(filePath, 'utf-8'));

        // Suporta tanto array quanto objeto com campo 'articles'
        const posts = Array.isArray(data) ? data : (data.articles || data.posts || []);

        return this.processBatch(posts);
    }

    /**
     * Consome diretório de arquivos JSON (padrão scrapers Ururau)
     * @param {string} dirPath - Diretório com .json
     */
    async consumeDirectory(dirPath) {
        const { readdirSync } = await import('fs');
        const { join } = await import('path');

        const files = readdirSync(dirPath).filter(f => f.endsWith('.json'));
        const allResults = [];

        for (const file of files) {
            const result = await this.consumeJsonFile(join(dirPath, file));
            allResults.push({ file, ...result });
        }

        const totalInserted = allResults.reduce((sum, r) => sum + r.inserted, 0);
        const totalDupes = allResults.reduce((sum, r) => sum + r.duplicates, 0);

        logSuccess(`📁 Diretório processado: ${files.length} arquivos, ${totalInserted} notícias novas, ${totalDupes} duplicadas`);
        return allResults;
    }

    getStats() {
        return { ...this.stats };
    }

    resetStats() {
        this.stats = { received: 0, inserted: 0, duplicates: 0, errors: 0 };
    }
}

const collector = new Collector();
export default collector;
export { Collector };
