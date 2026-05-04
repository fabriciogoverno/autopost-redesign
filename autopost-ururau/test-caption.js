#!/usr/bin/env node
/**
 * AutoPost Ururau — Teste de Legendas (Standalone)
 * Gera legendas com IA sem precisar do banco ou scrapers
 * Fase 3 — Teste
 */

import captionGenerator from './src/backend/modules/caption.js';
import database from './src/backend/core/database.js';

async function runTest() {
    console.log('🧠 AutoPost Ururau — Teste de Geração de Legendas\n');

    await database.init();

    // Notícia de teste realista
    const testPost = {
        id: 999,
        hash: 'caption_test_001',
        source: 'g1_rj',
        url: 'https://g1.globo.com/rj/rio-de-janeiro/noticia/2026/05/03/teste.ghtml',
        title: 'Trânsito em Campos dos Goytacazes tem mudanças a partir de segunda-feira',
        summary: 'Novos semáforos inteligentes serão instalados em 8 cruzamentos da zona Norte. Prefeitura promete redução de 30% no tempo de espera.',
        category: 'geral',
        image_url: null,
        priority: 0
    };

    console.log('📰 Notícia de teste:');
    console.log(`   Título: ${testPost.title}`);
    console.log(`   Categoria: ${testPost.category}`);
    console.log('');
    console.log('🤖 Gerando legendas com IA...\n');

    const result = await captionGenerator.generate(testPost);

    if (result.success) {
        console.log(`✅ LEGENDAS GERADAS!`);
        console.log(`   ⏱️  Tempo: ${result.duration}ms`);
        console.log(`   🧠 Modelo: ${result.model}`);
        console.log(`   💾 Cache: ${result.cached ? 'SIM (recuperado)' : 'NÃO (novo)'}`);
        console.log('');

        const platforms = ['instagram', 'facebook', 'twitter', 'linkedin', 'threads', 'tiktok', 'whatsapp'];

        for (const platform of platforms) {
            const caption = result.captions[platform];
            console.log(`📱 ${platform.toUpperCase()} (${caption.length} chars):`);
            console.log(`   ${caption}`);
            console.log('');
        }

        // Teste de cache
        console.log('🔄 Testando cache (segunda chamada)...');
        const cachedResult = await captionGenerator.generate(testPost);
        console.log(`   Cache hit: ${cachedResult.cached ? '✅ SIM' : '❌ NÃO'}`);
        console.log(`   Tempo cache: ${cachedResult.duration}ms`);

        console.log('\n🚀 Fase 3 concluída!');
    } else {
        console.error('❌ Falha:', result.error);
        process.exit(1);
    }

    await database.close();
}

runTest().catch(err => {
    console.error('Erro fatal:', err);
    process.exit(1);
});
