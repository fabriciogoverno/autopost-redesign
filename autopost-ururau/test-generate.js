#!/usr/bin/env node
/**
 * AutoPost Ururau — Teste de Geração (Standalone)
 * Gera uma arte de demonstração sem precisar do banco
 * Fase 2 — Teste
 */

import generator from './src/backend/modules/generator.js';
import database from './src/backend/core/database.js';

async function runTest() {
    console.log('🎨 AutoPost Ururau — Teste de Geração de Arte\n');

    // Inicializa DB
    await database.init();

    // Notícia de teste (mesma da arte real do Canva)
    const testPost = {
        id: 1,
        hash: 'demo123abc',
        source: 'ururau_test',
        url: 'https://ururau.com.br/teste',
        title: 'A maldição da legislação eleitoral no Brasil e o efeito Shakira',
        summary: 'Show em Copacabana mostra como a lei eleitoral convive com distorções, showmícios indiretos e disputa desigual',
        category: 'opiniao',
        image_url: null, // usará fallback
        priority: 0
    };

    // Insere no DB
    await database.insertPost(testPost);

    console.log('📰 Notícia de teste inserida');
    console.log('🎨 Gerando arte com template ururau-reels...\n');

    const result = await generator.generate(testPost, 'ururau-reels', ['reels']);

    if (result.success) {
        console.log('✅ ARTE GERADA COM SUCESSO!');
        console.log(`   ⏱️  Tempo: ${result.duration}ms`);
        console.log(`   📁 Arquivo: ${result.files[0].path}`);
        console.log(`   📐 Formato: ${result.files[0].format}`);
        console.log('\n🚀 Fase 2 concluída!');
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
