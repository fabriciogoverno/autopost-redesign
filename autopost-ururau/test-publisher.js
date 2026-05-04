#!/usr/bin/env node
/**
 * AutoPost Ururau — Teste de Publicação (Standalone)
 * Testa conexão com plataformas e simula publicação
 * Fase 4 — Teste
 */

import publisher from './src/backend/modules/publisher.js';
import database from './src/backend/core/database.js';
import generator from './src/backend/modules/generator.js';
import captionGenerator from './src/backend/modules/caption.js';

async function runTest() {
    console.log('🚀 AutoPost Ururau — Teste de Publisher\n');

    await database.init();

    // 1. Testa conexões
    console.log('🔌 Testando conexões com plataformas...\n');
    const connections = await publisher.testAllConnections();

    for (const [platform, result] of Object.entries(connections)) {
        const status = result.ok ? '✅ CONECTADO' : '❌ NÃO CONFIGURADO';
        const detail = result.ok ? (result.username || result.pageName || result.name || 'OK') : result.error;
        console.log(`  ${status} ${platform.toUpperCase()}: ${detail}`);
    }

    console.log('\n📋 Para publicar de verdade, configure as credenciais no .env');
    console.log('   Veja .env.example para os nomes das variáveis.\n');

    // 2. Simula pipeline completo (sem publicar real)
    console.log('🧪 Simulando pipeline completo (geração + legenda)...\n');

    const testPost = {
        id: 888,
        hash: 'pub_test_001',
        source: 'g1_rj',
        url: 'https://g1.globo.com/rj/rio-de-janeiro/noticia/2026/05/03/teste.ghtml',
        title: 'Novo hospital regional é inaugurado em Campos dos Goytacazes',
        summary: 'Unidade terá 200 leitos e atenderá 15 municípios da região Norte Fluminense. Investimento de R$ 80 milhões.',
        category: 'geral',
        image_url: null,
        priority: 1
    };

    await database.insertPost(testPost);
    const post = await database.getPostById(888);

    // Gera arte
    console.log('🎨 Gerando arte...');
    const genResult = await generator.generate(post, 'ururau-reels', ['reels']);
    console.log(`   ${genResult.success ? '✅' : '❌'} Arte: ${genResult.files?.[0]?.path || genResult.error}`);

    // Gera legendas
    console.log('🧠 Gerando legendas...');
    const capResult = await captionGenerator.generate(post);
    console.log(`   ${capResult.success ? '✅' : '❌'} Legendas: ${capResult.model} (${capResult.duration}ms)`);

    if (capResult.success) {
        console.log('\n📱 Amostras de legendas:');
        console.log(`   Instagram: ${capResult.captions.instagram.substring(0, 80)}...`);
        console.log(`   Twitter:   ${capResult.captions.twitter.substring(0, 80)}...`);
        console.log(`   WhatsApp:  ${capResult.captions.whatsapp.substring(0, 80)}...`);
    }

    console.log('\n🚀 Fase 4 concluída! Publisher pronto para publicar.');
    console.log('   Próximo: configure .env e rode: node src/backend/cli/autopost.js publish --post-id 888');

    await database.close();
}

runTest().catch(err => {
    console.error('Erro fatal:', err);
    process.exit(1);
});
