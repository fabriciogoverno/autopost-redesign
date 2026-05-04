/**
 * AutoPost Ururau — Publisher Principal
 * Orquestra publicação em múltiplas plataformas com atomicidade
 * Fase 4 — Publisher
 */

import database from '../core/database.js';
import generator from '../modules/generator.js';
import captionGenerator from '../modules/caption.js';
import { logInfo, logSuccess, logError, logWarn } from '../modules/logger.js';
import config from '../core/config.js';

// Plataformas
import InstagramPublisher from '../platforms/instagram.js';
import FacebookPublisher from '../platforms/facebook.js';
import TwitterPublisher from '../platforms/twitter.js';
import LinkedInPublisher from '../platforms/linkedin.js';
import WhatsAppPublisher from '../platforms/whatsapp.js';

class Publisher {
    constructor() {
        this.platforms = {
            instagram: new InstagramPublisher(),
            facebook: new FacebookPublisher(),
            twitter: new TwitterPublisher(),
            linkedin: new LinkedInPublisher(),
            whatsapp: new WhatsAppPublisher()
        };
        this.stats = {
            total: 0,
            success: 0,
            failed: 0,
            byPlatform: {}
        };
    }

    /**
     * Publica uma notícia em uma ou mais plataformas
     * @param {Object} params - { postId, platforms, template, formats }
     * @returns {Object} - Resultado completo da publicação
     */
    async publish(params) {
        const { postId, platforms, template = 'ururau-reels', formats = ['reels'] } = params;
        const startTime = Date.now();

        logInfo(`🚀 Iniciando publicação #${postId} em [${platforms.join(', ')}]`);

        try {
            // 1. Busca notícia no DB
            const post = await database.getPostById(postId);
            if (!post) {
                return { success: false, error: `Notícia #${postId} não encontrada` };
            }

            // 2. Gera arte (se ainda não gerada)
            let artes = [];
            const existingPubs = await database.getPublicationsByQueueId(postId);

            if (existingPubs.length === 0 || !existingPubs.some(p => p.media_paths)) {
                logInfo('🎨 Gerando arte...');
                const genResult = await generator.generate(post, template, formats);
                if (!genResult.success) {
                    return { success: false, error: `Falha na geração de arte: ${genResult.error}` };
                }
                artes = genResult.files;
            } else {
                // Reutiliza artes existentes
                const lastPub = existingPubs.find(p => p.media_paths);
                if (lastPub) {
                    artes = JSON.parse(lastPub.media_paths);
                }
            }

            if (artes.length === 0) {
                return { success: false, error: 'Nenhuma arte disponível para publicação' };
            }

            const imagePath = artes[0].path; // Usa primeira arte

            // 3. Gera legendas (se ainda não geradas)
            let captions = null;
            const cachedCaption = await database.getCachedCaption(post.hash);

            if (cachedCaption) {
                captions = JSON.parse(cachedCaption.captions);
                logInfo('♻️ Legendas recuperadas do cache');
            } else {
                logInfo('🧠 Gerando legendas com IA...');
                const capResult = await captionGenerator.generate(post);
                if (!capResult.success) {
                    return { success: false, error: `Falha na geração de legendas: ${capResult.error}` };
                }
                captions = capResult.captions;
            }

            // 4. Publica em cada plataforma
            const results = [];
            const publications = [];

            for (const platformName of platforms) {
                const platform = this.platforms[platformName];

                if (!platform) {
                    results.push({ platform: platformName, success: false, error: 'Plataforma não suportada' });
                    continue;
                }

                if (!platform.isConfigured()) {
                    results.push({ platform: platformName, success: false, error: 'Plataforma não configurada' });
                    continue;
                }

                // Seleciona legenda adequada
                const caption = captions[platformName] || captions['instagram'] || '';

                logInfo(`📤 Publicando em ${platformName}...`);

                try {
                    const pubResult = await platform.publish({
                        imagePath,
                        caption
                    });

                    results.push({ platform: platformName, ...pubResult });

                    if (pubResult.success) {
                        this.stats.success++;

                        // Registra no DB
                        const pubId = await database.insertPublication({
                            queue_id: postId,
                            platform: platformName,
                            post_id: pubResult.postId,
                            post_url: pubResult.postUrl,
                            status: 'published',
                            media_paths: JSON.stringify(artes),
                            caption
                        });

                        publications.push({ id: pubId, platform: platformName, url: pubResult.postUrl });

                        await database.logAudit('publish', postId, platformName, 
                            `Post ID: ${pubResult.postId} | URL: ${pubResult.postUrl}`);

                        logSuccess(`✅ ${platformName}: ${pubResult.postUrl || 'OK'}`);
                    } else {
                        this.stats.failed++;
                        await database.logAudit('error', postId, platformName, 
                            `Falha: ${pubResult.error}`);
                        logError(`❌ ${platformName}: ${pubResult.error}`);
                    }
                } catch (err) {
                    this.stats.failed++;
                    results.push({ platform: platformName, success: false, error: err.message });
                    await database.logAudit('error', postId, platformName, `Exceção: ${err.message}`);
                    logError(`❌ ${platformName} exceção`, err);
                }

                // Rate limiting: delay entre plataformas
                if (platforms.length > 1) {
                    await new Promise(r => setTimeout(r, 2000));
                }
            }

            // 5. Atualiza status da notícia
            const allSuccess = results.every(r => r.success);
            const anySuccess = results.some(r => r.success);

            if (allSuccess) {
                await database.updatePostStatus(postId, 'published');
            } else if (anySuccess) {
                await database.updatePostStatus(postId, 'published', 'Algumas plataformas falharam');
            } else {
                await database.updatePostStatus(postId, 'failed', 'Todas as plataformas falharam');
            }

            const duration = Date.now() - startTime;
            this.stats.total++;

            logInfo(`📊 Publicação #${postId} concluída em ${duration}ms | ${results.filter(r => r.success).length}/${results.length} plataformas OK`);

            return {
                success: anySuccess,
                allSuccess,
                postId,
                duration,
                platforms: results,
                publications,
                artes
            };

        } catch (err) {
            logError('❌ Erro fatal na publicação', err);
            await database.updatePostStatus(postId, 'failed', err.message);
            return { success: false, error: err.message };
        }
    }

    /**
     * Testa conexão com todas as plataformas configuradas
     */
    async testAllConnections() {
        const results = {};

        for (const [name, platform] of Object.entries(this.platforms)) {
            if (platform.isConfigured()) {
                try {
                    results[name] = await platform.testConnection();
                } catch (err) {
                    results[name] = { ok: false, error: err.message };
                }
            } else {
                results[name] = { ok: false, error: 'Não configurado', configured: false };
            }
        }

        return results;
    }

    getStats() {
        return { ...this.stats };
    }
}

const publisher = new Publisher();
export default publisher;
export { Publisher };
