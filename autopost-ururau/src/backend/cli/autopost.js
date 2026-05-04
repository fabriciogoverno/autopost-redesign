#!/usr/bin/env node
/**
 * AutoPost Ururau — CLI Principal
 * Interface de linha de comando para todas as operações
 * Fase 1 — Core
 * 
 * Comandos:
 *   node autoblog.js --mode autoblog          # Executa ciclo Autoblog
 *   node autoblog.js --post-id 123 --platforms instagram,facebook,whatsapp
 *   node autoblog.js --generate-only --post-id 123 --template ururau-reels
 *   node autoblog.js --consume-file ./noticias.json
 *   node autoblog.js --consume-dir ./scraped/
 *   node autoblog.js --stats
 *   node autoblog.js --db-init
 *   node autoblog.js --db-backup
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import database from '../core/database.js';
import { generatePostHash } from '../core/hash.js';
import collector from '../modules/collector.js';
import { logInfo, logSuccess, logError } from '../modules/logger.js';
import generator from '../modules/generator.js';
import captionGenerator from '../modules/caption.js';
import publisher from '../modules/publisher.js';
import autoblog from '../modules/autoblog.js';
import scheduler from '../modules/scheduler.js';
import rollback from '../modules/rollback.js';
import { loadTemplate, fillTemplate } from '../modules/template-loader.js';

const program = new Command();

program
    .name('autopost')
    .description('AutoPost Ururau — CLI de automação de redes sociais')
    .version('1.0.0');

// ============================================================
// COMANDO: db-init
// ============================================================
program
    .command('db-init')
    .description('Inicializa o banco de dados SQLite')
    .action(async () => {
        const spinner = ora('Inicializando database...').start();
        try {
            await database.init();
            spinner.succeed('Database inicializado com sucesso!');
        } catch (err) {
            spinner.fail(`Erro: ${err.message}`);
            process.exit(1);
        } finally {
            await database.close();
        }
    });

// ============================================================
// COMANDO: db-backup
// ============================================================
program
    .command('db-backup')
    .description('Cria backup do banco de dados')
    .action(async () => {
        const spinner = ora('Criando backup...').start();
        try {
            const path = await database.backup();
            spinner.succeed(`Backup criado: ${path}`);
        } catch (err) {
            spinner.fail(`Erro: ${err.message}`);
        } finally {
            await database.close();
        }
    });

// ============================================================
// COMANDO: consume-file
// ============================================================
program
    .command('consume-file <file>')
    .description('Consome arquivo JSON de notícias dos scrapers')
    .action(async (file) => {
        const spinner = ora(`Consumindo ${file}...`).start();
        try {
            await database.init();
            const result = await collector.consumeJsonFile(file);
            spinner.succeed(
                `Processado: ${result.inserted} inseridas, ${result.duplicates} duplicadas, ${result.errors} erros`
            );
            console.log(chalk.cyan('📊 Detalhes:'));
            result.results.forEach((r, i) => {
                const icon = r.success ? '✅' : (r.reason === 'duplicate' ? '🔒' : '❌');
                console.log(`  ${icon} #${i + 1}: ${r.reason || 'ok'}`);
            });
        } catch (err) {
            spinner.fail(`Erro: ${err.message}`);
            logError('Falha no consume-file', err);
        } finally {
            await database.close();
        }
    });

// ============================================================
// COMANDO: consume-dir
// ============================================================
program
    .command('consume-dir <dir>')
    .description('Consome diretório de arquivos JSON')
    .action(async (dir) => {
        const spinner = ora(`Consumindo diretório ${dir}...`).start();
        try {
            await database.init();
            const results = await collector.consumeDirectory(dir);
            const totalInserted = results.reduce((s, r) => s + r.inserted, 0);
            const totalDupes = results.reduce((s, r) => s + r.duplicates, 0);
            spinner.succeed(
                `${results.length} arquivos | ${totalInserted} novas | ${totalDupes} duplicadas`
            );
        } catch (err) {
            spinner.fail(`Erro: ${err.message}`);
            logError('Falha no consume-dir', err);
        } finally {
            await database.close();
        }
    });

// ============================================================
// COMANDO: stats
// ============================================================
program
    .command('stats')
    .description('Mostra estatísticas do sistema')
    .action(async () => {
        try {
            await database.init();
            const stats = await database.getQueueStats();
            console.log(chalk.cyan.bold('\n📊 ESTATÍSTICAS DO AUTOPOST URURAU\n'));
            console.log(`  ⏳ Pendentes:    ${chalk.yellow(stats.pending)}`);
            console.log(`  ✅ Publicadas:   ${chalk.green(stats.published)}`);
            console.log(`  ❌ Falhas:       ${chalk.red(stats.failed)}`);
            console.log(`  ↩️  Rollbacks:    ${chalk.magenta(stats.rolled_back)}`);
            console.log(`  📁 Total:        ${chalk.white(stats.total)}`);
            console.log('');
        } catch (err) {
            logError('Erro ao buscar stats', err);
        } finally {
            await database.close();
        }
    });

// ============================================================
// COMANDO: queue-list
// ============================================================
program
    .command('queue-list')
    .description('Lista notícias na fila (pending)')
    .option('-l, --limit <n>', 'Limite de resultados', '10')
    .action(async (options) => {
        try {
            await database.init();
            const posts = await database.getPendingPosts(parseInt(options.limit));
            console.log(chalk.cyan.bold(`\n📋 FILA DE NOTÍCIAS (${posts.length})\n`));
            posts.forEach((p, i) => {
                const title = p.title.length > 60 ? p.title.substring(0, 60) + '...' : p.title;
                const priority = p.priority > 0 ? chalk.red(`[P${p.priority}]`) : '';
                console.log(`  ${i + 1}. ${priority} ${chalk.white(title)}`);
                console.log(`     ${chalk.gray(p.source)} | ${p.category} | ${p.created_at}`);
                console.log('');
            });
        } catch (err) {
            logError('Erro ao listar fila', err);
        } finally {
            await database.close();
        }
    });

// ============================================================
// COMANDO: queue-ignore
// ============================================================
program
    .command('queue-ignore <id>')
    .description('Marca notícia como ignorada')
    .option('-r, --reason <text>', 'Motivo do ignore', 'manual_ignore')
    .action(async (id, options) => {
        try {
            await database.init();
            await database.ignorePost(parseInt(id), options.reason);
            console.log(chalk.yellow(`🚫 Notícia #${id} marcada como ignorada. Motivo: ${options.reason}`));
        } catch (err) {
            logError('Erro ao ignorar', err);
        } finally {
            await database.close();
        }
    });

// ============================================================
// COMANDO: audit
// ============================================================
program
    .command('audit')
    .description('Mostra log de auditoria')
    .option('-l, --limit <n>', 'Limite', '20')
    .option('-a, --action <type>', 'Filtrar por ação')
    .action(async (options) => {
        try {
            await database.init();
            const logs = await database.getAuditLog(
                parseInt(options.limit),
                options.action || null
            );
            console.log(chalk.cyan.bold(`\n📋 AUDIT LOG (${logs.length})\n`));
            logs.forEach(log => {
                const color = log.action === 'error' ? chalk.red : 
                              log.action === 'publish' ? chalk.green :
                              log.action === 'rollback' ? chalk.magenta : chalk.blue;
                console.log(`  ${color(`[${log.action.toUpperCase()}]`)} ${log.timestamp}`);
                console.log(`     Q#${log.queue_id || '-'} | ${log.platform || '-'} | ${log.details}`);
            });
        } catch (err) {
            logError('Erro no audit', err);
        } finally {
            await database.close();
        }
    });

// ============================================================
// COMANDO: hash-test
// ============================================================
program
    .command('hash-test')
    .description('Testa geração de hash')
    .action(() => {
        const testPost = {
            url: 'https://g1.globo.com/rj/rio-de-janeiro/noticia/2026/05/03/teste.ghtml',
            title: '  Teste de HASH do Ururau!  '
        };
        const hash1 = generatePostHash(testPost);
        const hash2 = generatePostHash({ ...testPost, title: 'teste de hash do ururau' });
        console.log(chalk.cyan('\n🔐 TESTE DE HASH SHA-256\n'));
        console.log(`  Hash 1: ${hash1}`);
        console.log(`  Hash 2: ${hash2}`);
        console.log(`  São iguais (normalização OK): ${hash1 === hash2 ? chalk.green('SIM ✅') : chalk.red('NÃO ❌')}`);
        console.log(`  Válido: ${/^[a-f0-9]{64}$/.test(hash1) ? chalk.green('SIM ✅') : chalk.red('NÃO ❌')}`);
        console.log(`  Short:  ${hash1.substring(0, 12)}`);
        console.log('');
    });

// Parse args

// ============================================================
// COMANDO: generate
// ============================================================
program
    .command('generate')
    .description('Gera arte para uma notícia da fila')
    .option('-p, --post-id <id>', 'ID da notícia na fila', '1')
    .option('-t, --template <id>', 'Template a usar', 'ururau-reels')
    .option('-f, --formats <list>', 'Formatos (reels,feed,story)', 'reels')
    .action(async (options) => {
        const spinner = ora('Gerando arte...').start();
        try {
            await database.init();
            const post = await database.getPostById(parseInt(options.post_id));

            if (!post) {
                spinner.fail(`Notícia #${options.post_id} não encontrada`);
                return;
            }

            const formats = options.formats.split(',');
            const result = await generator.generate(post, options.template, formats);

            if (result.success) {
                spinner.succeed(`Arte gerada em ${result.duration}ms`);
                console.log(chalk.cyan('\n📁 Arquivos gerados:'));
                result.files.forEach(f => {
                    console.log(`   ${chalk.green('✓')} ${f.format}: ${f.path}`);
                });
            } else {
                spinner.fail(`Erro: ${result.error}`);
            }
        } catch (err) {
            spinner.fail(`Erro: ${err.message}`);
            logError('Falha no generate', err);
        } finally {
            await database.close();
        }
    });


// ============================================================
// COMANDO: caption-test
// ============================================================
program
    .command('caption-test')
    .description('Testa geração de legendas com IA para uma notícia')
    .option('-p, --post-id <id>', 'ID da notícia', '1')
    .option('-f, --force', 'Força regeneração (ignora cache)')
    .option('-m, --model <model>', 'Força modelo: ollama | gemini | template', 'auto')
    .action(async (options) => {
        const spinner = ora('Gerando legendas com IA...').start();
        try {
            await database.init();
            const post = await database.getPostById(parseInt(options.post_id));

            if (!post) {
                // Cria notícia de teste se não existir
                spinner.text = 'Notícia não encontrada. Criando notícia de teste...';
                const testPost = {
                    hash: 'test123abc',
                    source: 'test',
                    url: 'https://ururau.com.br/teste',
                    title: 'Prefeitura de Campos anuncia novo projeto de mobilidade urbana',
                    summary: 'Investimento de R$ 50 milhões prevê construção de corredores de ônibus e ciclovias em 12 bairros da cidade. Obra deve começar em agosto.',
                    category: 'politica',
                    priority: 0
                };
                const result = await database.insertPost(testPost);
                if (result.inserted) {
                    post = await database.getPostById(result.id);
                }
            }

            spinner.text = 'Consultando IA...';
            const result = await captionGenerator.generate(post, { 
                forceRegenerate: options.force 
            });

            if (result.success) {
                spinner.succeed(`Legendas geradas em ${result.duration}ms | Modelo: ${result.model} ${result.cached ? '(cache)' : ''}`);

                console.log(chalk.cyan('\n📱 LEGENDAS POR PLATAFORMA:\n'));

                const platforms = {
                    instagram: { icon: '📸', color: chalk.magenta },
                    facebook: { icon: '👥', color: chalk.blue },
                    twitter: { icon: '🐦', color: chalk.cyan },
                    linkedin: { icon: '💼', color: chalk.blueBright },
                    threads: { icon: '🧵', color: chalk.white },
                    tiktok: { icon: '🎵', color: chalk.red },
                    whatsapp: { icon: '💬', color: chalk.green }
                };

                for (const [platform, cfg] of Object.entries(platforms)) {
                    const caption = result.captions[platform];
                    const len = caption.length;
                    const color = cfg.color;
                    console.log(color(`${cfg.icon} ${platform.toUpperCase()} (${len} chars):`));
                    console.log(chalk.gray(`   ${caption.substring(0, 120)}${caption.length > 120 ? '...' : ''}`));
                    console.log('');
                }

                console.log(chalk.yellow('💾 Legendas salvas no cache SQLite (caption_cache)'));
            } else {
                spinner.fail(`Erro: ${result.error}`);
            }
        } catch (err) {
            spinner.fail(`Erro: ${err.message}`);
            logError('Falha no caption-test', err);
        } finally {
            await database.close();
        }
    });


// ============================================================
// COMANDO: publish
// ============================================================
program
    .command('publish')
    .description('Publica notícia em redes sociais')
    .option('-p, --post-id <id>', 'ID da notícia na fila', '1')
    .option('--platforms <list>', 'Plataformas (instagram,facebook,twitter,linkedin,whatsapp)', 'instagram,facebook,whatsapp')
    .option('-t, --template <id>', 'Template', 'ururau-reels')
    .option('-f, --formats <list>', 'Formatos', 'reels')
    .action(async (options) => {
        const spinner = ora('Iniciando publicação...').start();
        try {
            await database.init();

            const platforms = options.platforms.split(',').map(p => p.trim());
            const formats = options.formats.split(',').map(f => f.trim());

            spinner.text = `Publicando em ${platforms.length} plataforma(s)...`;

            const result = await publisher.publish({
                postId: parseInt(options.post_id),
                platforms,
                template: options.template,
                formats
            });

            if (result.success) {
                spinner.succeed(`Publicação concluída em ${result.duration}ms`);

                console.log(chalk.cyan('\n📱 RESULTADOS POR PLATAFORMA:\n'));
                for (const r of result.platforms) {
                    const icon = r.success ? chalk.green('✅') : chalk.red('❌');
                    const color = r.success ? chalk.green : chalk.red;
                    console.log(`  ${icon} ${color(r.platform.toUpperCase())}`);
                    if (r.success && r.postUrl) {
                        console.log(`     ${chalk.gray(r.postUrl)}`);
                    } else if (!r.success) {
                        console.log(`     ${chalk.red(r.error)}`);
                    }
                    console.log('');
                }

                if (result.publications.length > 0) {
                    console.log(chalk.yellow('💾 Publicações registradas no banco de dados'));
                }
            } else {
                spinner.fail(`Falha: ${result.error}`);
            }
        } catch (err) {
            spinner.fail(`Erro: ${err.message}`);
            logError('Falha no publish', err);
        } finally {
            await database.close();
        }
    });

// ============================================================
// COMANDO: test-connection
// ============================================================
program
    .command('test-connection')
    .description('Testa conexão com todas as plataformas configuradas')
    .action(async () => {
        const spinner = ora('Testando conexões...').start();
        try {
            await database.init();
            const results = await publisher.testAllConnections();

            spinner.succeed('Teste de conexão concluído');

            console.log(chalk.cyan('\n🔌 STATUS DAS PLATAFORMAS:\n'));

            const icons = {
                instagram: '📸',
                facebook: '👥',
                twitter: '🐦',
                linkedin: '💼',
                whatsapp: '💬'
            };

            for (const [platform, result] of Object.entries(results)) {
                const icon = icons[platform] || '📱';
                if (result.ok) {
                    const detail = result.username || result.pageName || result.name || result.state || 'OK';
                    console.log(`  ${icon} ${chalk.green(platform.toUpperCase())}: ${chalk.white(detail)}`);
                } else {
                    console.log(`  ${icon} ${chalk.red(platform.toUpperCase())}: ${chalk.gray(result.error)}`);
                }
            }
            console.log('');
        } catch (err) {
            spinner.fail(`Erro: ${err.message}`);
        } finally {
            await database.close();
        }
    });


// ============================================================
// COMANDO: autoblog-run
// ============================================================
program
    .command('autoblog-run')
    .description('Executa um ciclo do Autoblog (publicação automática)')
    .action(async () => {
        const spinner = ora('Executando ciclo do Autoblog...').start();
        try {
            await database.init();
            spinner.text = 'Verificando time slots e publicando...';
            await autoblog.runCycle();
            spinner.succeed('Ciclo do Autoblog concluído');

            const stats = autoblog.getStats();
            console.log(chalk.cyan('\n📊 Estatísticas do Autoblog:'));
            console.log(`   Ciclos: ${stats.cycles}`);
            console.log(`   Publicadas: ${stats.published}`);
            console.log(`   Puladas: ${stats.skipped}`);
            console.log(`   Erros: ${stats.errors}`);
        } catch (err) {
            spinner.fail(`Erro: ${err.message}`);
            logError('Falha no autoblog-run', err);
        } finally {
            await database.close();
        }
    });

// ============================================================
// COMANDO: autoblog-start
// ============================================================
program
    .command('autoblog-start')
    .description('Inicia o Autoblog em modo daemon (checa a cada minuto)')
    .action(async () => {
        console.log(chalk.cyan('🤖 Iniciando Autoblog daemon...'));
        console.log(chalk.gray('   Pressione Ctrl+C para parar\n'));

        await database.init();
        autoblog.start();

        // Mantém processo vivo
        process.on('SIGINT', async () => {
            console.log(chalk.yellow('\n🛑 Parando Autoblog...'));
            autoblog.stop();
            await database.close();
            process.exit(0);
        });
    });

// ============================================================
// COMANDO: schedule
// ============================================================
program
    .command('schedule')
    .description('Agenda publicação de uma notícia')
    .requiredOption('-p, --post-id <id>', 'ID da notícia')
    .requiredOption('-d, --date <datetime>', 'Data/hora (ISO 8601, ex: 2026-05-05T14:00:00)')
    .option('--platforms <list>', 'Plataformas', 'instagram,whatsapp')
    .option('-t, --template <id>', 'Template', 'ururau-reels')
    .option('--caption <text>', 'Legenda customizada')
    .action(async (options) => {
        const spinner = ora('Agendando...').start();
        try {
            await database.init();

            const platforms = options.platforms.split(',').map(p => p.trim());
            const result = await scheduler.schedule(
                parseInt(options.postId),
                options.date,
                platforms,
                { template: options.template, customCaption: options.caption }
            );

            if (result.success) {
                spinner.succeed(`Agendamento #${result.scheduleId} criado`);
                console.log(chalk.cyan('\n📅 Detalhes:'));
                console.log(`   Data: ${result.scheduledFor}`);
                console.log(`   Plataformas: ${result.platforms.join(', ')}`);
            } else {
                spinner.fail(`Erro: ${result.error}`);
            }
        } catch (err) {
            spinner.fail(`Erro: ${err.message}`);
        } finally {
            await database.close();
        }
    });

// ============================================================
// COMANDO: schedule-list
// ============================================================
program
    .command('schedule-list')
    .description('Lista agendamentos')
    .option('-s, --status <status>', 'Filtrar por status', 'scheduled')
    .option('-l, --limit <n>', 'Limite', '20')
    .action(async (options) => {
        try {
            await database.init();
            const items = await scheduler.list(options.status, parseInt(options.limit));

            console.log(chalk.cyan(`\n📅 AGENDAMENTOS (${items.length})\n`));

            for (const item of items) {
                const color = item.status === 'scheduled' ? chalk.yellow :
                              item.status === 'published' ? chalk.green :
                              item.status === 'cancelled' ? chalk.gray : chalk.red;

                const date = new Date(item.scheduled_for).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
                console.log(`  ${color(`[${item.status.toUpperCase()}]`)} #${item.id} — ${date}`);
                console.log(`     "${item.title?.substring(0, 60)}..." (${item.source})`);
                console.log(`     Plataformas: ${JSON.parse(item.platforms).join(', ')}`);
                console.log('');
            }
        } catch (err) {
            logError('Erro ao listar', err);
        } finally {
            await database.close();
        }
    });

// ============================================================
// COMANDO: schedule-cancel
// ============================================================
program
    .command('schedule-cancel <id>')
    .description('Cancela um agendamento')
    .action(async (id) => {
        try {
            await database.init();
            const result = await scheduler.cancel(parseInt(id));

            if (result.success) {
                console.log(chalk.yellow(`🚫 Agendamento #${id} cancelado`));
            } else {
                console.log(chalk.red(`❌ Erro: ${result.error}`));
            }
        } catch (err) {
            logError('Erro ao cancelar', err);
        } finally {
            await database.close();
        }
    });

// ============================================================
// COMANDO: scheduler-check
// ============================================================
program
    .command('scheduler-check')
    .description('Verifica e executa agendamentos vencidos')
    .action(async () => {
        const spinner = ora('Checando agendamentos...').start();
        try {
            await database.init();
            await scheduler.checkScheduled();
            spinner.succeed('Check concluído');
        } catch (err) {
            spinner.fail(`Erro: ${err.message}`);
        } finally {
            await database.close();
        }
    });

// ============================================================
// COMANDO: whatsapp-list-chats
// ============================================================
program
    .command('whatsapp-list-chats')
    .description('Lista chats do WhatsApp para descobrir IDs de canais/grupos')
    .action(async () => {
        const spinner = ora('Conectando ao WhatsApp...').start();
        try {
            const { WhatsAppPublisher } = await import('../platforms/whatsapp.js');
            const wa = new WhatsAppPublisher();
            await wa.init();

            spinner.text = 'Buscando chats...';
            const chats = await wa.listChats();

            spinner.succeed(`${chats.length} chats encontrados`);

            console.log(chalk.cyan('\n💬 CHATS DO WHATSAPP:\n'));

            for (const chat of chats) {
                const type = chat.isGroup ? chalk.blue('[GRUPO]') : chalk.green('[PRIVADO]');
                console.log(`  ${type} ${chat.name}`);
                console.log(`     ID: ${chalk.yellow(chat.id)}`);
                console.log(`     Não lidas: ${chat.unreadCount}`);
                console.log('');
            }

            console.log(chalk.yellow('💡 Copie o ID e adicione em config/whatsapp-destinations.json'));

            await wa.destroy();
        } catch (err) {
            spinner.fail(`Erro: ${err.message}`);
            console.log(chalk.red('   Verifique se o Chrome está instalado e o QR code foi escaneado.'));
        }
    });


// ============================================================
// COMANDO: rollback
// ============================================================
program
    .command('rollback <publication-id>')
    .description('Executa rollback de uma publicação')
    .option('-r, --reason <text>', 'Motivo do rollback', 'manual_rollback')
    .action(async (publicationId, options) => {
        const spinner = ora('Executando rollback...').start();
        try {
            await database.init();
            const result = await rollback.execute(publicationId, options.reason);

            if (result.success) {
                spinner.succeed(`Rollback #${publicationId} concluído`);
                console.log(chalk.cyan('\n↩️ DETALHES DO ROLLBACK:\n'));
                console.log(`   Plataforma: ${result.platform}`);
                console.log(`   Motivo: ${result.reason}`);
                console.log(`   Deletado: ${result.deleteResult.success ? chalk.green('SIM') : chalk.red('NÃO')}`);
                console.log(`   Artes arquivadas: ${result.archivedPaths.length}`);
                console.log(`   Evidência: ${result.evidenceFile}`);
                console.log(`   Bloqueado até: ${result.blockUntil}`);
                console.log('');
            } else {
                spinner.fail(`Rollback falhou: ${result.error}`);
            }
        } catch (err) {
            spinner.fail(`Erro: ${err.message}`);
            logError('Falha no rollback', err);
        } finally {
            await database.close();
        }
    });

// ============================================================
// COMANDO: server
// ============================================================
program
    .command('server')
    .description('Inicia o servidor API REST')
    .option('-p, --port <n>', 'Porta', '3001')
    .action(async (options) => {
        process.env.API_PORT = options.port;
        const { startServer } = await import('../api/server.js');
        startServer();
    });


// ============================================================
// COMANDO: test
// ============================================================
program
    .command('test')
    .description('Executa suite completa de testes')
    .option('-u, --unit', 'Apenas testes unitários')
    .option('-i, --integration', 'Apenas testes de integração')
    .option('-e, --e2e', 'Apenas testes E2E')
    .action(async (options) => {
        console.log(chalk.cyan('🧪 Executando testes...\n'));

        const { spawn } = await import('child_process');
        const args = ['--test'];

        if (options.unit) args.push('tests/unit/*.test.js');
        else if (options.integration) args.push('tests/integration/*.test.js');
        else if (options.e2e) args.push('tests/e2e/*.test.js');
        else {
            console.log(chalk.yellow('Use o runner completo: node test-runner.js'));
            return;
        }

        const child = spawn('node', args, { stdio: 'inherit' });
        child.on('close', code => process.exit(code));
    });

program.parse();

// Se nenhum comando fornecido, mostra help
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
