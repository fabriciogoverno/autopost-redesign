/**
 * AutoPost Ururau — Logger Module
 * Logging estruturado com níveis e cores
 * Fase 1 — Core
 */

import chalk from 'chalk';

const LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    success: 4
};

const currentLevel = LEVELS[process.env.LOG_LEVEL || 'info'] || 1;

function timestamp() {
    return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export function logDebug(msg, meta = {}) {
    if (currentLevel <= LEVELS.debug) {
        console.log(chalk.gray(`[${timestamp()}] 🔍 DEBUG: ${msg}`), meta);
    }
}

export function logInfo(msg, meta = {}) {
    if (currentLevel <= LEVELS.info) {
        console.log(chalk.blue(`[${timestamp()}] ℹ️  INFO: ${msg}`), meta);
    }
}

export function logWarn(msg, meta = {}) {
    if (currentLevel <= LEVELS.warn) {
        console.log(chalk.yellow(`[${timestamp()}] ⚠️  WARN: ${msg}`), meta);
    }
}

export function logError(msg, error = null) {
    if (currentLevel <= LEVELS.error) {
        console.error(chalk.red(`[${timestamp()}] ❌ ERROR: ${msg}`));
        if (error) {
            console.error(chalk.red('   Stack:'), error.stack || error.message);
        }
    }
}

export function logSuccess(msg, meta = {}) {
    if (currentLevel <= LEVELS.success) {
        console.log(chalk.green(`[${timestamp()}] ✅ SUCCESS: ${msg}`), meta);
    }
}

export function logAudit(action, details = '') {
    console.log(chalk.magenta(`[${timestamp()}] 📋 AUDIT [${action}]: ${details}`));
}
