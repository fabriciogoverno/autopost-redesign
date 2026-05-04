/**
 * AutoPost Ururau — Autoblog Engine
 * Motor de publicação automática 24/7
 * Fase 5 — Autoblog
 * 
 * Funcionamento:
 *   - Executa a cada hora (via GitHub Actions ou cron local)
 *   - Verifica time slots configurados (07:00, 09:00, 12:00, 15:00, 18:00, 21:00)
 *   - Seleciona notícias pendentes com prioridade
 *   - Respeita limites diários por plataforma
 *   - Publica e registra no DB
 */

import cron from 'node-cron';
import database from '../core/database.js';
import publisher from '../modules/publisher.js';
import { logInfo, logSuccess, logError, logWarn } from '../modules/logger.js';
import config from '../core/config.js';

class Autoblog {
    constructor() {
        this.running = false;
        this.cronJob = null;
        this.stats = {
            cycles: 0,
            published: 0,
            skipped: 0,
            errors: 0
        };
    }

    /**
     * Inicia o Autoblog (modo daemon local)
     */
    start() {
        if (this.running) {
            logWarn('⚠️ Autoblog já está rodando');
            return;
        }

        const autoblogConfig = config.get('autoblog') || {};
        if (!autoblogConfig.enabled) {
            logWarn('⚠️ Autoblog desabilitado em config/autoblog.json');
            return;
        }

        logInfo('🤖 Autoblog iniciado. Monitorando time slots...');
        this.running = true;

        // Roda a cada minuto para verificar time slots
        this.cronJob = cron.schedule('* * * * *', async () => {
            await this.tick();
        });
    }

    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            this.cronJob = null;
        }
        this.running = false;
        logInfo('🛑 Autoblog parado');
    }

    /**
     * Tick do Autoblog — verifica se deve publicar agora
     */
    async tick() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('pt-BR', { 
            timeZone: 'America/Sao_Paulo',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        const dayName = now.toLocaleDateString('pt-BR', { 
            timeZone: 'America/Sao_Paulo',
            weekday: 'short'
        }).toLowerCase().replace('.', '');

        const autoblogConfig = config.get('autoblog') || {};
        const schedule = autoblogConfig.schedule || {};
        const timeSlots = schedule.timeSlots || ['07:00', '09:00', '12:00', '15:00', '18:00', '21:00'];
        const weekdays = schedule.weekdays || ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

        // Verifica se hoje é dia válido
        const dayMap = { 'dom': 'sun', 'seg': 'mon', 'ter': 'tue', 'qua': 'wed', 'qui': 'thu', 'sex': 'fri', 'sáb': 'sat' };
        const englishDay = dayMap[dayName] || dayName;

        if (!weekdays.includes(englishDay)) {
            logDebug(`⏭️ Hoje (${dayName}) não está no schedule. Pulando.`);
            return;
        }

        // Verifica se está em um time slot (com tolerância de 1 minuto)
        const isTimeSlot = timeSlots.some(slot => {
            const [slotHour, slotMin] = slot.split(':').map(Number);
            const [currHour, currMin] = timeStr.split(':').map(Number);
            return slotHour === currHour && Math.abs(currMin - slotMin) <= 1;
        });

        if (!isTimeSlot) {
            return; // Não é hora de publicar
        }

        // Verifica se já publicou neste time slot
        const alreadyPublished = await this.checkSlotPublished(timeStr);
        if (alreadyPublished) {
            logDebug(`⏭️ Time slot ${timeStr} já executado hoje. Pulando.`);
            return;
        }

        logInfo(`⏰ Time slot atingido: ${timeStr}. Iniciando publicação...`);
        await this.runCycle();
    }

    /**
     * Executa um ciclo completo do Autoblog
     */
    async runCycle() {
        this.stats.cycles++;
        const cycleStart = Date.now();

        try {
            await database.init();

            // 1. Verifica limites diários
            const limits = await this.checkDailyLimits();
            if (limits.reached) {
                logWarn(`⚠️ Limite diário atingido: ${limits.count}/${limits.max}. Pulando.`);
                this.stats.skipped++;
                return;
            }

            // 2. Busca notícia pendente
            const posts = await database.getPendingPosts(1);

            if (posts.length === 0) {
                logInfo('📭 Nenhuma notícia pendente. Aguardando próximo ciclo.');
                this.stats.skipped++;
                return;
            }

            const post = posts[0];

            // 3. Verifica filtros
            if (!this.passesFilters(post)) {
                logInfo(`🚫 Notícia #${post.id} não passou nos filtros. Ignorando.`);
                await database.ignorePost(post.id, 'filter_rejected');
                return;
            }

            // 4. Publica
            const platforms = config.getEnabledPlatforms();

            if (platforms.length === 0) {
                logWarn('⚠️ Nenhuma plataforma habilitada.');
                return;
            }

            logInfo(`🚀 Autoblog publicando notícia #${post.id}: "${post.title?.substring(0, 50)}..."`);

            const result = await publisher.publish({
                postId: post.id,
                platforms,
                template: config.get('templates.default') || 'ururau-reels',
                formats: ['reels']
            });

            if (result.success) {
                this.stats.published++;
                logSuccess(`✅ Autoblog publicou em ${result.platforms.filter(p => p.success).length} plataforma(s) em ${Date.now() - cycleStart}ms`);
            } else {
                this.stats.errors++;
                logError(`❌ Autoblog falhou: ${result.error}`);
            }

            // 5. Registra execução do time slot
            await this.markSlotExecuted();

        } catch (err) {
            this.stats.errors++;
            logError('❌ Erro no ciclo do Autoblog', err);
        } finally {
            await database.close();
        }
    }

    /**
     * Verifica se já atingiu limite diário de posts
     */
    async checkDailyLimits() {
        const today = new Date().toISOString().slice(0, 10);
        const db = await database.connect();

        const count = await db.get(`
            SELECT COUNT(*) as count 
            FROM publications 
            WHERE date(published_at) = date('now', 'localtime') 
            AND status = 'published'
        `);

        const maxPerDay = parseInt(config.get('autoblog.limits.maxPerDay') || '25');

        return {
            reached: count.count >= maxPerDay,
            count: count.count,
            max: maxPerDay
        };
    }

    /**
     * Verifica se time slot já foi executado hoje
     */
    async checkSlotPublished(timeStr) {
        const db = await database.connect();
        const today = new Date().toISOString().slice(0, 10);

        const row = await db.get(`
            SELECT COUNT(*) as count 
            FROM audit_log 
            WHERE action = 'autoblog_slot' 
            AND date(timestamp) = date('now', 'localtime')
            AND details LIKE ?
        `, [`%${timeStr}%`]);

        return row.count > 0;
    }

    async markSlotExecuted() {
        await database.logAudit('autoblog_slot', null, null, `Slot executado: ${new Date().toLocaleTimeString('pt-BR')}`);
    }

    /**
     * Verifica se notícia passa nos filtros do Autoblog
     */
    passesFilters(post) {
        const filters = config.get('autoblog.filters') || {};

        // Filtro de categoria
        if (filters.categories && filters.categories.length > 0) {
            if (!filters.categories.includes(post.category || 'geral')) {
                return false;
            }
        }

        // Filtro de keywords excluídas
        if (filters.excludeKeywords && filters.excludeKeywords.length > 0) {
            const text = `${post.title} ${post.summary}`.toLowerCase();
            for (const keyword of filters.excludeKeywords) {
                if (text.includes(keyword.toLowerCase())) {
                    return false;
                }
            }
        }

        // manual_only
        if (post.manual_only === 1) {
            return false;
        }

        return true;
    }

    getStats() {
        return { ...this.stats };
    }
}

const autoblog = new Autoblog();
export default autoblog;
export { Autoblog };

function logDebug(msg) {
    if (process.env.LOG_LEVEL === 'debug') {
        console.log(`[${new Date().toLocaleString('pt-BR')}] 🔍 DEBUG: ${msg}`);
    }
}
