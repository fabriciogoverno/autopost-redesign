#!/usr/bin/env node
/**
 * AutoPost Ururau — Test Runner
 * Fase 8 — Testes
 */

import { spawn } from 'child_process';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const TESTS = [
    { name: 'Hash Module', file: 'tests/unit/hash.test.js' },
    { name: 'Database', file: 'tests/unit/database.test.js' },
    { name: 'Collector', file: 'tests/unit/collector.test.js' },
    { name: 'Template Loader', file: 'tests/unit/template-loader.test.js' },
    { name: 'Caption Generator', file: 'tests/unit/caption.test.js' },
    { name: 'API Integration', file: 'tests/integration/api.test.js' },
    { name: 'E2E Pipeline', file: 'tests/e2e/pipeline.test.js' }
];

async function runTest(test) {
    return new Promise((resolve) => {
        console.log(`\n🧪 ${test.name}...`);
        const child = spawn('node', ['--test', test.file], {
            stdio: 'pipe',
            env: { ...process.env, NODE_ENV: 'test', LOG_LEVEL: 'error' }
        });

        let output = '';
        child.stdout.on('data', data => { output += data.toString(); });
        child.stderr.on('data', data => { output += data.toString(); });

        child.on('close', code => {
            const passed = code === 0;
            console.log(passed ? `   ✅ ${test.name} PASSOU` : `   ❌ ${test.name} FALHOU`);
            resolve({ name: test.name, passed, output, exitCode: code });
        });
    });
}

async function main() {
    console.log('🚀 AutoPost Ururau — Suite de Testes\n');
    console.log(`Total: ${TESTS.length} suites\n`);

    const results = [];
    for (const test of TESTS) {
        const result = await runTest(test);
        results.push(result);
    }

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    console.log('\n' + '='.repeat(50));
    console.log('📊 RESULTADOS');
    console.log('='.repeat(50));
    console.log(`✅ Passaram: ${passed}/${TESTS.length}`);
    console.log(`❌ Falharam: ${failed}/${TESTS.length}`);
    console.log(`📈 Taxa de sucesso: ${((passed/TESTS.length)*100).toFixed(1)}%`);
    console.log('='.repeat(50));

    if (failed > 0) {
        console.log('\n❌ Detalhes das falhas:');
        for (const r of results.filter(r => !r.passed)) {
            console.log(`\n--- ${r.name} ---`);
            console.log(r.output);
        }
    }

    const reportDir = join(process.cwd(), 'output', 'reports');
    if (!existsSync(reportDir)) mkdirSync(reportDir, { recursive: true });

    const report = `# Relatório de Testes — AutoPost Ururau

**Data:** ${new Date().toLocaleString('pt-BR')}
**Total:** ${TESTS.length}
**Passaram:** ${passed}
**Falharam:** ${failed}
**Taxa:** ${((passed/TESTS.length)*100).toFixed(1)}%

## Resultados

| Suite | Status |
|-------|--------|
${results.map(r => `| ${r.name} | ${r.passed ? '✅ PASSOU' : '❌ FALHOU'} |`).join('\n')}
`;

    writeFileSync(join(reportDir, 'test-report.md'), report);
    console.log(`\n📄 Relatório: output/reports/test-report.md`);

    process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
    console.error('Erro:', err);
    process.exit(1);
});
