#!/usr/bin/env node
/**
 * AutoPost Ururau — Setup Script
 * Configuração interativa inicial
 * Fase 9 — Deploy
 */

import { createInterface } from 'readline';
import { writeFileSync, existsSync, copyFileSync } from 'fs';
import { execSync } from 'child_process';

const rl = createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function main() {
  console.log('🚀 AutoPost Ururau — Setup Inicial\n');
  console.log('Este script vai configurar seu ambiente.\n');

  // 1. Verificar Node.js
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf-8' }).trim();
    console.log(`✅ Node.js: ${nodeVersion}`);
  } catch {
    console.error('❌ Node.js não encontrado. Instale em https://nodejs.org');
    process.exit(1);
  }

  // 2. Instalar dependências
  console.log('\n📦 Instalando dependências...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Backend instalado');
  } catch (err) {
    console.error('❌ Falha ao instalar backend');
    process.exit(1);
  }

  try {
    execSync('cd src/dashboard && npm install', { stdio: 'inherit' });
    console.log('✅ Dashboard instalado');
  } catch (err) {
    console.warn('⚠️ Dashboard falhou (opcional)');
  }

  // 3. Inicializar DB
  console.log('\n🗄️  Inicializando banco de dados...');
  try {
    execSync('node src/backend/core/database.js --init', { stdio: 'inherit' });
    console.log('✅ Database criado');
  } catch (err) {
    console.error('❌ Falha ao criar database');
    process.exit(1);
  }

  // 4. Configurar .env
  console.log('\n⚙️  Configuração de APIs');

  if (!existsSync('.env')) {
    copyFileSync('.env.example', '.env');
  }

  const configureApi = await ask('Deseja configurar APIs agora? (s/n): ');

  if (configureApi.toLowerCase() === 's') {
    const instagram = await ask('Instagram Access Token (deixe vazio para pular): ');
    const facebook = await ask('Facebook Page Access Token (deixe vazio para pular): ');
    const twitterKey = await ask('Twitter API Key (deixe vazio para pular): ');
    const linkedin = await ask('LinkedIn Access Token (deixe vazio para pular): ');
    const gemini = await ask('Gemini API Key (deixe vazio para usar Ollama local): ');

    let envContent = '';
    if (instagram) envContent += `INSTAGRAM_ACCESS_TOKEN=${instagram}\n`;
    if (facebook) envContent += `FACEBOOK_ACCESS_TOKEN=${facebook}\n`;
    if (twitterKey) envContent += `TWITTER_API_KEY=${twitterKey}\n`;
    if (linkedin) envContent += `LINKEDIN_ACCESS_TOKEN=${linkedin}\n`;
    if (gemini) envContent += `GEMINI_API_KEY=${gemini}\n`;

    if (envContent) {
      writeFileSync('.env', envContent, { flag: 'a' });
      console.log('✅ Credenciais salvas em .env');
    }
  }

  // 5. Configurar WhatsApp
  console.log('\n💬 Configuração do WhatsApp');
  const waConfig = await ask('Deseja configurar destinos WhatsApp? (s/n): ');

  if (waConfig.toLowerCase() === 's') {
    console.log('\nPara descobrir IDs de canais/grupos, rode depois:');
    console.log('  node src/backend/cli/autopost.js whatsapp-list-chats');
    console.log('\nEdite config/whatsapp-destinations.json com os IDs.');
  }

  // 6. Testar
  console.log('\n🧪 Testando sistema...');
  try {
    execSync('node src/backend/cli/autopost.js hash-test', { stdio: 'inherit' });
    console.log('✅ Hash OK');
  } catch {
    console.warn('⚠️ Hash test falhou');
  }

  // 7. Final
  console.log('\n' + '='.repeat(50));
  console.log('✅ SETUP CONCLUÍDO!');
  console.log('='.repeat(50));
  console.log('\nComandos para começar:');
  console.log('  npm run server        → Iniciar API (porta 3001)');
  console.log('  npm run dashboard     → Iniciar Dashboard (porta 3000)');
  console.log('  npm run test          → Rodar testes');
  console.log('  npm run autoblog:start → Iniciar Autoblog 24/7');
  console.log('\nDocumentação: README.md');
  console.log('Deploy: DEPLOY.md');
  console.log('Suporte: output/reports/');

  rl.close();
}

main().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
