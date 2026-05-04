/**
 * AutoPost Ururau — Config Module
 * Carrega e valida configurações do sistema
 * Fase 1 — Core
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_CONFIG = {
    // Sistema
    timezone: 'America/Sao_Paulo',
    locale: 'pt-BR',

    // Autoblog
    autoblog: {
        enabled: false,
        schedule: {
            weekdays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
            timeSlots: ['07:00', '09:00', '12:00', '15:00', '18:00', '21:00']
        },
        limits: {
            maxPerDay: 25,
            maxPerHour: 4,
            platformLimits: {
                instagram: 25,
                facebook: 30,
                twitter: 50,
                linkedin: 10,
                threads: 25,
                tiktok: 10,
                whatsapp: 50
            }
        },
        filters: {
            categories: ['politica', 'esporte', 'seguranca', 'economia', 'geral'],
            excludeKeywords: ['falecimento', 'luto', 'morte', 'obito'],
            minImageQuality: true
        },
        templateRotation: ['ururau-reels', 'ururau-classic', 'ururau-light']
    },

    // Templates
    templates: {
        default: 'ururau-reels',
        outputDir: './output/artes'
    },

    // IA / Legendas
    caption: {
        primaryModel: 'ollama', // 'ollama' | 'gemini' | 'template'
        ollama: {
            baseUrl: 'http://localhost:11434',
            model: 'llama3.2',
            timeout: 30000
        },
        gemini: {
            apiKey: process.env.GEMINI_API_KEY || '',
            model: 'gemini-pro'
        },
        fallback: 'template' // se IA falhar, usa template estático
    },

    // Plataformas (credenciais via env vars)
    platforms: {
        instagram: {
            enabled: false,
            accountId: process.env.INSTAGRAM_ACCOUNT_ID || '',
            accessToken: process.env.INSTAGRAM_ACCESS_TOKEN || ''
        },
        facebook: {
            enabled: false,
            pageId: process.env.FACEBOOK_PAGE_ID || '',
            accessToken: process.env.FACEBOOK_ACCESS_TOKEN || ''
        },
        twitter: {
            enabled: false,
            apiKey: process.env.TWITTER_API_KEY || '',
            apiSecret: process.env.TWITTER_API_SECRET || '',
            accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
            accessSecret: process.env.TWITTER_ACCESS_SECRET || ''
        },
        linkedin: {
            enabled: false,
            clientId: process.env.LINKEDIN_CLIENT_ID || '',
            clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
            accessToken: process.env.LINKEDIN_ACCESS_TOKEN || ''
        },
        threads: {
            enabled: false
        },
        tiktok: {
            enabled: false
        },
        whatsapp: {
            enabled: true,
            sessionPath: './.wwebjs_auth',
            channels: [], // preenchido dinamicamente
            groups: []
        }
    },

    // Rollback
    rollback: {
        evidenceDir: './output/rollback_evidence',
        blockHours: 24 // horas que uma notícia fica bloqueada após rollback
    },

    // Dashboard
    dashboard: {
        port: 3000,
        host: '0.0.0.0'
    },

    // Logging
    log: {
        level: process.env.LOG_LEVEL || 'info', // debug | info | warn | error
        screenshotOnPublish: true,
        screenshotOnError: true
    }
};

class Config {
    constructor() {
        this.data = { ...DEFAULT_CONFIG };
        this.loadFromFile();
    }

    loadFromFile() {
        const configPath = join(process.cwd(), 'config', 'autoblog.json');
        if (existsSync(configPath)) {
            try {
                const fileConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
                this.data = this.deepMerge(this.data, fileConfig);
            } catch (err) {
                console.warn('⚠️ Erro ao carregar config/autoblog.json:', err.message);
            }
        }
    }

    deepMerge(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(target[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        return result;
    }

    get(path) {
        return path.split('.').reduce((obj, key) => obj?.[key], this.data);
    }

    set(path, value) {
        const keys = path.split('.');
        let current = this.data;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) current[keys[i]] = {};
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
    }

    getAll() {
        return this.data;
    }

    isPlatformEnabled(platform) {
        return this.data.platforms[platform]?.enabled === true;
    }

    getEnabledPlatforms() {
        return Object.entries(this.data.platforms)
            .filter(([_, cfg]) => cfg.enabled)
            .map(([name]) => name);
    }
}

const config = new Config();
export default config;
export { Config, DEFAULT_CONFIG };
