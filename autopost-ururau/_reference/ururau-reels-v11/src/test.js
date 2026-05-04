const db = require('./db');
const { generateReelsImage } = require('./generator');
const { generateCaption } = require('./caption');
const { generateHash } = require('./hash');

async function runTests() {
  console.log('=== URURAU REELS - TESTS ===');

  console.log('\n1. Testing database...');
  const row = db.prepare('SELECT 1 as test').get();
  console.log('   DB OK:', row.test === 1 ? 'PASS' : 'FAIL');

  console.log('\n2. Testing hash...');
  const h1 = generateHash('teste');
  const h2 = generateHash('teste');
  console.log('   Hash consistent:', h1 === h2 ? 'PASS' : 'FAIL');
  console.log('   Hash length:', h1.length === 64 ? 'PASS' : 'FAIL');

  console.log('\n3. Testing image generation...');
  try {
    const path = await generateReelsImage({
      title: 'Teste Ururau Reels',
      summary: 'Este e um teste de geracao de arte para Instagram Reels do portal Ururau em Campos dos Goytacazes.',
      category: 'GERAL',
      imageUrl: ''
    });
    console.log('   Image generated:', path ? 'PASS' : 'FAIL');
    console.log('   Path:', path);
  } catch (e) {
    console.log('   Image generation FAIL:', e.message);
  }

  console.log('\n4. Testing caption (fallback)...');
  try {
    const caption = await generateCaption('Teste', 'Resumo teste', 'GERAL');
    console.log('   Caption generated:', caption ? 'PASS' : 'FAIL');
    console.log('   Preview:', caption.substring(0, 80) + '...');
  } catch (e) {
    console.log('   Caption FAIL:', e.message);
  }

  console.log('\n=== ALL TESTS COMPLETED ===');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
