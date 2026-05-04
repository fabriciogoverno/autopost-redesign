#!/usr/bin/env node
/**
 * AutoPost Ururau — Teste de Autoblog (Standalone)
 * Simula ciclo completo do Autoblog sem publicar real
 * Fase 5 — Teste
 */

import autoblog from './src/backend/modules/autoblog.js';
import scheduler from './src/backend/modules/scheduler.js';
import database from './src/backend/core/database.js';
import collector from './src/backend/modules/collector.js';

async function runTest() {
    console.log('🤖 AutoPost Ururau — Teste de Autoblog 24/7\n');

    await database.init();

    // 1. Popula DB com notícias de teste
    console.log('📰 Inserindo notícias de teste...');
    const testPosts = [
        {
            source: 'g1_rj',
            url: 'https://g1.globo.com/rj/rio-de-janeiro/noticia/2026/05/04/policia.ghtml',
            title: 'Operação policial prende 10 suspeitos em Campos dos Goytacazes',
            summary: 'Ação conjunta das polícias Civil e Militar resultou em prisões por tráfico de drogas na zona Norte.',
            category: 'seguranca',
            priority: 2
        },
        {
            source: 'itatiaia',
            url: 'https://itatiaia.com.br/noticia/2026/05/04/futebol.ghtml',
            title: 'Campos FC anuncia novo técnico para Série D',
            summary: 'Ex-jogador da seleção brasileira assume comando do time para a disputa do campeonato nacional.',
            category: 'esporte',
            priority: 1
        },
        {
            source: 'campos24h',
            url: 'https://campos24h.com.br/2026/05/04/economia.ghtml',
            title: 'Comércio de Campos projeta crescimento de 8% no segundo semestre',
            summary: 'Setor varejista espera alta nas vendas com a chegada do inverno e datas comemorativas.',
            category: 'economia',
            priority: 0
        }
    ];

    for (const post of testPosts) {
        await collector.processPost(post);
    }
    console.log(`   ✅ ${testPosts.length} notícias inseridas\n`);

    // 2. Testa filtros do Autoblog
    console.log('🔍 Testando filtros do Autoblog...');
    const allPending = await database.getPendingPosts(10);
    console.log(`   ${allPending.length} notícias pendentes na fila`);

    for (const post of allPending) {
        const passes = autoblog.passesFilters(post);
        console.log(`   ${passes ? '✅' : '❌'} #${post.id} [${post.category}] "${post.title?.substring(0, 50)}..."`);
    }
    console.log('');

    // 3. Testa limites diários
    console.log('📊 Verificando limites diários...');
    const limits = await autoblog.checkDailyLimits();
    console.log(`   Publicações hoje: ${limits.count}/${limits.max}`);
    console.log(`   Limite atingido: ${limits.reached ? 'SIM' : 'NÃO'}\n`);

    // 4. Testa agendamento
    console.log('📅 Testando Scheduler...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);

    const scheduleResult = await scheduler.schedule(
        allPending[0]?.id || 1,
        tomorrow.toISOString(),
        ['whatsapp'],
        { template: 'ururau-reels' }
    );

    if (scheduleResult.success) {
        console.log(`   ✅ Agendamento #${scheduleResult.scheduleId} criado`);
        console.log(`      Data: ${scheduleResult.scheduledFor}`);
        console.log(`      Plataformas: ${scheduleResult.platforms.join(', ')}`);
    } else {
        console.log(`   ❌ Erro: ${scheduleResult.error}`);
    }

    // 5. Lista agendamentos
    console.log('\n📋 Lista de agendamentos:');
    const scheduled = await scheduler.list('scheduled', 10);
    for (const item of scheduled) {
        const date = new Date(item.scheduled_for).toLocaleString('pt-BR');
        console.log(`   #${item.id} — ${date} — [${JSON.parse(item.platforms).join(', ')}]`);
    }

    // 6. Estatísticas
    console.log('\n📊 Estatísticas do Autoblog:');
    const stats = autoblog.getStats();
    console.log(`   Ciclos: ${stats.cycles}`);
    console.log(`   Publicadas: ${stats.published}`);
    console.log(`   Puladas: ${stats.skipped}`);
    console.log(`   Erros: ${stats.errors}`);

    console.log('\n🚀 Fase 5 concluída! Autoblog e Scheduler prontos.');
    console.log('   Comandos úteis:');
    console.log('   - node src/backend/cli/autopost.js autoblog-start');
    console.log('   - node src/backend/cli/autopost.js schedule --post-id 1 --date 2026-05-05T14:00:00');
    console.log('   - node src/backend/cli/autopost.js schedule-list');

    await database.close();
}

runTest().catch(err => {
    console.error('Erro fatal:', err);
    process.exit(1);
});
