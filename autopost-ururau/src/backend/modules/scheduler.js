/**
 * AutoPost Ururau — Scheduler
 * Agendamento manual de posts para datas/horários específicos
 * Fase 5 — Scheduler
 */

import database from '../core/database.js';
import publisher from '../modules/publisher.js';
import { logInfo, logSuccess, logError } from '../modules/logger.js';
import config from '../core/config.js';

class Scheduler {
    constructor() {
        this.running = false;
        this.interval = null;
    }

    /**
     * Agenda uma notícia para publicação futura
     */
    async schedule(postId, scheduledFor, platforms, options = {}) {
        try {
            await database.init();

            const post = await database.getPostById(postId);
            if (!post) {
                return { success: false, error: `Notícia #${postId} não encontrada` };
            }

            // Valida data
            const scheduleDate = new Date(scheduledFor);
            if (isNaN(scheduleDate.getTime()) || scheduleDate < new Date()) {
                return { success: false, error: 'Data de agendamento inválida ou no passado' };
            }

            const sql = `
                INSERT INTO scheduled_posts 
                (queue_id, scheduled_for, platforms, template, custom_caption, custom_title, status)
                VALUES (?, ?, ?, ?, ?, ?, 'scheduled')
            `;

            const db = await database.connect();
            const result = await db.run(sql, [
                postId,
                scheduledFor,
                JSON.stringify(platforms),
                options.template || config.get('templates.default') || 'ururau-reels',
                options.customCaption || null,
                options.customTitle || null
            ]);

            await database.logAudit('schedule', postId, null, 
                `Agendado para ${scheduledFor} em [${platforms.join(', ')}]`);

            logSuccess(`📅 Notícia #${postId} agendada para ${scheduledFor}`);

            return {
                success: true,
                scheduleId: result.lastID,
                scheduledFor,
                platforms
            };

        } catch (err) {
            logError('❌ Erro no agendamento', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Cancela agendamento
     */
    async cancel(scheduleId) {
        try {
            const db = await database.connect();

            const schedule = await db.get('SELECT * FROM scheduled_posts WHERE id = ?', [scheduleId]);
            if (!schedule) {
                return { success: false, error: 'Agendamento não encontrado' };
            }

            if (schedule.status !== 'scheduled') {
                return { success: false, error: `Status atual é '${schedule.status}', não pode cancelar` };
            }

            await db.run("UPDATE scheduled_posts SET status = 'cancelled' WHERE id = ?", [scheduleId]);
            await database.logAudit('schedule_cancel', schedule.queue_id, null, `Schedule #${scheduleId} cancelado`);

            logSuccess(`🚫 Agendamento #${scheduleId} cancelado`);
            return { success: true };

        } catch (err) {
            logError('❌ Erro ao cancelar', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Lista agendamentos
     */
    async list(status = 'scheduled', limit = 50) {
        try {
            const db = await database.connect();

            let sql = `
                SELECT s.*, q.title, q.source, q.category
                FROM scheduled_posts s
                JOIN posts_queue q ON s.queue_id = q.id
                WHERE 1=1
            `;
            const params = [];

            if (status) {
                sql += ' AND s.status = ?';
                params.push(status);
            }

            sql += ' ORDER BY s.scheduled_for ASC LIMIT ?';
            params.push(limit);

            return db.all(sql, params);

        } catch (err) {
            logError('❌ Erro ao listar agendamentos', err);
            return [];
        }
    }

    /**
     * Inicia monitor de agendamentos (checa a cada minuto)
     */
    start() {
        if (this.running) return;

        logInfo('📅 Scheduler iniciado. Checando agendamentos a cada minuto...');
        this.running = true;

        this.interval = setInterval(async () => {
            await this.checkScheduled();
        }, 60000); // 1 minuto
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.running = false;
        logInfo('📅 Scheduler parado');
    }

    /**
     * Verifica agendamentos que devem ser publicados agora
     */
    async checkScheduled() {
        try {
            await database.init();
            const db = await database.connect();

            const now = new Date().toISOString();

            const due = await db.all(`
                SELECT * FROM scheduled_posts 
                WHERE status = 'scheduled' 
                AND scheduled_for <= ?
                ORDER BY scheduled_for ASC
            `, [now]);

            for (const item of due) {
                logInfo(`⏰ Agendamento #${item.id} vencido. Publicando...`);

                const platforms = JSON.parse(item.platforms);
                const result = await publisher.publish({
                    postId: item.queue_id,
                    platforms,
                    template: item.template || 'ururau-reels',
                    formats: ['reels']
                });

                if (result.success) {
                    await db.run("UPDATE scheduled_posts SET status = 'published' WHERE id = ?", [item.id]);
                    logSuccess(`✅ Agendamento #${item.id} publicado`);
                } else {
                    await db.run("UPDATE scheduled_posts SET status = 'failed' WHERE id = ?", [item.id]);
                    logError(`❌ Agendamento #${item.id} falhou: ${result.error}`);
                }
            }

        } catch (err) {
            logError('❌ Erro no checkScheduled', err);
        } finally {
            await database.close();
        }
    }
}

const scheduler = new Scheduler();
export default scheduler;
export { Scheduler };
