/**
 * AutoPost Ururau — Rollback Module
 * Reversão completa de publicações com evidências
 * Fase 7 — Rollback
 */

import { readFileSync, existsSync, renameSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import database from '../core/database.js';
import { logInfo, logSuccess, logError } from '../modules/logger.js';
import config from '../core/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const EVIDENCE_DIR = join(process.cwd(), 'output', 'rollback_evidence');

class Rollback {
  constructor() {
    this.platforms = {};
  }

  /**
   * Executa rollback de uma publicação
   * @param {string|number} publicationId - ID da publicação no DB
   * @param {string} reason - Motivo do rollback
   * @returns {Object} - Resultado do rollback
   */
  async execute(publicationId, reason = 'manual_rollback') {
    logInfo(`↩️ Iniciando rollback da publicação #${publicationId} — Motivo: ${reason}`);

    try {
      await database.init();
      const db = await database.connect();

      // 1. Busca publicação
      const pub = await db.get('SELECT * FROM publications WHERE id = ?', [publicationId]);
      if (!pub) {
        return { success: false, error: `Publicação #${publicationId} não encontrada` };
      }

      if (pub.status === 'rolled_back') {
        return { success: false, error: 'Publicação já foi rollbackada' };
      }

      // 2. Busca notícia relacionada
      const post = await database.getPostById(pub.queue_id);
      if (!post) {
        return { success: false, error: 'Notícia relacionada não encontrada' };
      }

      // 3. Tira screenshot ANTES do rollback (evidência)
      const beforeScreenshot = await this.takeScreenshot(pub.post_url, `before_${publicationId}`);

      // 4. Deleta da plataforma
      const platform = pub.platform;
      let deleteResult = { success: false, error: 'Plataforma não suportada para delete' };

      try {
        const PlatformClass = await import(`../platforms/${platform}.js`);
        const platformInstance = new PlatformClass.default();

        if (platformInstance.deletePost) {
          deleteResult = await platformInstance.deletePost(pub.post_id);
        }
      } catch (err) {
        logWarn(`⚠️ Não foi possível deletar de ${platform}: ${err.message}`);
        deleteResult = { success: false, error: err.message };
      }

      // 5. Move arte para archived
      let archivedPaths = [];
      if (pub.media_paths) {
        try {
          const paths = JSON.parse(pub.media_paths);
          for (const p of paths) {
            if (existsSync(p.path)) {
              const archivedPath = join(process.cwd(), 'output', 'artes', 'archived', `${pub.hash}_${p.format}.png`);
              if (!existsSync(dirname(archivedPath))) {
                mkdirSync(dirname(archivedPath), { recursive: true });
              }
              renameSync(p.path, archivedPath);
              archivedPaths.push(archivedPath);
            }
          }
        } catch (err) {
          logWarn(`⚠️ Erro ao arquivar mídia: ${err.message}`);
        }
      }

      // 6. Atualiza status no DB
      await db.run(`
        UPDATE publications 
        SET status = 'rolled_back', error_log = ?
        WHERE id = ?
      `, [reason, publicationId]);

      await database.updatePostStatus(pub.queue_id, 'rolled_back', `Rollback: ${reason}`);

      // 7. Tira screenshot DEPOIS do rollback
      const afterScreenshot = await this.takeScreenshot(pub.post_url, `after_${publicationId}`);

      // 8. Registra evidência
      const evidenceData = {
        publicationId,
        queueId: pub.queue_id,
        platform,
        reason,
        beforeScreenshot,
        afterScreenshot,
        archivedPaths,
        deletedFromPlatform: deleteResult.success,
        timestamp: new Date().toISOString()
      };

      const evidenceFile = join(EVIDENCE_DIR, `rollback_${publicationId}_${Date.now()}.json`);
      if (!existsSync(EVIDENCE_DIR)) {
        mkdirSync(EVIDENCE_DIR, { recursive: true });
      }
      writeFileSync(evidenceFile, JSON.stringify(evidenceData, null, 2));

      // 9. Log de auditoria
      await database.logAudit('rollback', pub.queue_id, platform, 
        `Pub #${publicationId} rollbackado. Motivo: ${reason}. Evidência: ${evidenceFile}`);

      // 10. Bloqueia republicação por 24h
      const blockHours = parseInt(config.get('rollback.blockHours') || '24');
      await db.run(`
        UPDATE posts_queue 
        SET rollback_data = ?, processed_at = datetime('now', 'localtime', '+${blockHours} hours')
        WHERE id = ?
      `, [JSON.stringify(evidenceData), pub.queue_id]);

      logSuccess(`✅ Rollback #${publicationId} concluído. Evidência salva.`);

      return {
        success: true,
        publicationId,
        platform,
        reason,
        evidenceFile,
        deleteResult,
        archivedPaths,
        blockUntil: new Date(Date.now() + blockHours * 3600000).toISOString()
      };

    } catch (err) {
      logError(`❌ Rollback #${publicationId} falhou`, err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Tira screenshot de uma URL (evidência)
   */
  async takeScreenshot(url, filename) {
    if (!url || url === 'null') {
      return null;
    }

    try {
      const puppeteer = await import('puppeteer');
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.setViewport({ width: 1080, height: 1920 });
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      const screenshotPath = join(EVIDENCE_DIR, `${filename}_${Date.now()}.png`);
      if (!existsSync(EVIDENCE_DIR)) {
        mkdirSync(EVIDENCE_DIR, { recursive: true });
      }

      await page.screenshot({ path: screenshotPath, fullPage: true });
      await browser.close();

      return screenshotPath;
    } catch (err) {
      logWarn(`⚠️ Screenshot falhou: ${err.message}`);
      return null;
    }
  }

  /**
   * Gera relatório de rollback em Markdown
   */
  async generateReport(publicationId) {
    const db = await database.connect();
    const pub = await db.get('SELECT * FROM publications WHERE id = ?', [publicationId]);
    const post = pub ? await database.getPostById(pub.queue_id) : null;

    const report = `# Relatório de Rollback — Publicação #${publicationId}

**Data:** ${new Date().toLocaleString('pt-BR')}  
**Status:** ${pub?.status || 'N/A'}  
**Plataforma:** ${pub?.platform || 'N/A'}  
**Post ID:** ${pub?.post_id || 'N/A'}  

## Notícia

**Título:** ${post?.title || 'N/A'}  
**Fonte:** ${post?.source || 'N/A'}  
**URL:** ${post?.url || 'N/A'}  

## Ações Executadas

- [x] Screenshot antes do rollback
- [x] Deleção da plataforma
- [x] Arquivamento das artes
- [x] Atualização do banco de dados
- [x] Screenshot depois do rollback
- [x] Registro de evidência
- [x] Bloqueio de republicação (24h)

## Evidências

${pub?.media_paths ? `- Artes arquivadas: ${JSON.parse(pub.media_paths).map(p => p.path).join(', ')}` : '- Nenhuma arte'}

---
*Gerado automaticamente pelo AutoPost Ururau*
`;

    const reportPath = join(EVIDENCE_DIR, `report_${publicationId}_${Date.now()}.md`);
    writeFileSync(reportPath, report);
    return reportPath;
  }
}

const rollback = new Rollback();
export default rollback;
export { Rollback };

function logWarn(msg) {
  console.warn(`[${new Date().toLocaleString('pt-BR')}] ⚠️ WARN: ${msg}`);
}

function writeFileSync(path, data) {
  const { writeFileSync: wf } = require('fs');
  wf(path, data);
}
