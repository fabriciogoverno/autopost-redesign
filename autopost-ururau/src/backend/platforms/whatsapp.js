/**
 * AutoPost Ururau — WhatsApp Publisher Avançado
 * Integração profunda com whatsapp-web.js
 * Fase 5 — WhatsApp Avançado
 * 
 * Funcionalidades:
 *   - QR Code automático (salva em arquivo/terminal)
 *   - Persistência de sessão (LocalAuth)
 *   - Envio para canais e grupos configuráveis
 *   - Envio de mídia com caption formatada (negrito, emojis)
 *   - Status de entrega/leitura
 *   - Reconexão automática
 */

import whatsappPkg from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { logInfo, logSuccess, logError, logWarn } from '../modules/logger.js';
import config from '../core/config.js';
import database from '../core/database.js';

const QR_PATH = join(process.cwd(), 'output', 'screenshots', 'whatsapp-qr.png');
const SESSION_PATH = join(process.cwd(), '.wwebjs_auth');
const { Client, LocalAuth, MessageMedia } = whatsappPkg;

class WhatsAppPublisher {
    constructor() {
        this.name = 'whatsapp';
        this.client = null;
        this.ready = false;
        this.qrGenerated = false;
        this.reconnectAttempts = 0;
        this.maxReconnects = 5;

        // Destinos configuráveis
        this.channels = this.loadDestinations('channels');
        this.groups = this.loadDestinations('groups');
    }

    loadDestinations(type) {
        const configPath = join(process.cwd(), 'config', 'whatsapp-destinations.json');
        if (existsSync(configPath)) {
            try {
                const data = JSON.parse(readFileSync(configPath, 'utf-8'));
                return data[type] || [];
            } catch (err) {
                logWarn(`Erro ao carregar destinos WhatsApp: ${err.message}`);
            }
        }
        return [];
    }

    isConfigured() {
        return true; // WhatsApp sempre disponível
    }

    /**
     * Inicializa o client WhatsApp com QR automático
     */
    async init() {
        if (this.client) return;

        logInfo('💬 Inicializando WhatsApp client...');

        this.client = new Client({
            authStrategy: new LocalAuth({ dataPath: SESSION_PATH }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',
                    '--disable-gpu'
                ]
            }
        });

        // Eventos
        this.client.on('qr', (qr) => {
            this.qrGenerated = true;
            logInfo('📱 QR Code gerado. Escaneie com seu WhatsApp:');

            // Mostra no terminal
            qrcode.generate(qr, { small: true });

            // Salva como texto para referência
            writeFileSync(
                join(process.cwd(), 'output', 'screenshots', 'whatsapp-qr-text.txt'),
                qr
            );

            logWarn('⚠️ Escaneie o QR code acima com seu WhatsApp (Configurações > Dispositivos Conectados)');
        });

        this.client.on('ready', () => {
            this.ready = true;
            this.reconnectAttempts = 0;
            logSuccess('✅ WhatsApp client pronto e autenticado!');
        });

        this.client.on('authenticated', () => {
            logSuccess('🔐 WhatsApp autenticado. Sessão salva.');
        });

        this.client.on('auth_failure', (msg) => {
            logError('❌ WhatsApp auth falhou', new Error(msg));
            this.ready = false;
        });

        this.client.on('disconnected', (reason) => {
            logWarn(`⚠️ WhatsApp desconectado: ${reason}`);
            this.ready = false;
            this.attemptReconnect();
        });

        this.client.on('message_ack', (msg, ack) => {
            // ack: 1=enviado, 2=recebido, 3=lido, 4=play
            const status = ['pendente', 'enviado', 'recebido', 'lido', 'play'][ack] || 'desconhecido';
            logDebug(`📨 WhatsApp msg ${msg.id.id}: ${status}`);
        });

        await this.client.initialize();

        // Aguarda ready (timeout 60s)
        let attempts = 0;
        while (!this.ready && attempts < 60) {
            await new Promise(r => setTimeout(r, 1000));
            attempts++;
        }

        if (!this.ready && !this.qrGenerated) {
            throw new Error('WhatsApp não iniciou. Verifique se o Chrome está instalado.');
        }
    }

    async attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnects) {
            logError('❌ Máximo de reconexões atingido. Reinicie manualmente.');
            return;
        }

        this.reconnectAttempts++;
        logInfo(`🔄 Tentando reconectar... (${this.reconnectAttempts}/${this.maxReconnects})`);

        await new Promise(r => setTimeout(r, 5000));
        this.client = null;
        await this.init();
    }

    /**
     * Publica em canais e grupos configurados
     */
    async publish(params) {
        const { imagePath, caption } = params;

        try {
            if (!this.ready) {
                await this.init();
            }

            if (!this.ready) {
                return { 
                    success: false, 
                    error: 'WhatsApp não está pronto. Escaneie o QR code primeiro.' 
                };
            }

            logInfo('💬 Publicando no WhatsApp...');

            const media = MessageMedia.fromFilePath(imagePath);
            const targets = [...this.channels, ...this.groups];

            if (targets.length === 0) {
                logWarn('⚠️ Nenhum canal/grupo configurado.');
                logInfo('   Configure em: config/whatsapp-destinations.json');
                return { success: false, error: 'Nenhum destino configurado' };
            }

            const results = [];
            let allSuccess = true;

            for (const target of targets) {
                try {
                    // Formata caption para WhatsApp (negrito com asteriscos)
                    const formattedCaption = this.formatWhatsAppCaption(caption);

                    const msg = await this.client.sendMessage(
                        target.id, 
                        media, 
                        { caption: formattedCaption }
                    );

                    results.push({ 
                        target: target.name || target.id, 
                        success: true, 
                        messageId: msg.id.id 
                    });

                    logSuccess(`✅ WhatsApp: ${target.name || target.id}`);

                    // Delay entre envios para não floodar
                    await new Promise(r => setTimeout(r, 1500));

                } catch (err) {
                    allSuccess = false;
                    results.push({ 
                        target: target.name || target.id, 
                        success: false, 
                        error: err.message 
                    });
                    logError(`❌ WhatsApp falha em ${target.name || target.id}`, err);
                }
            }

            return {
                success: allSuccess,
                postId: `whatsapp_${Date.now()}`,
                postUrl: null,
                details: results
            };

        } catch (err) {
            logError('❌ Erro no WhatsApp', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Formata caption para WhatsApp (negrito, quebras de linha)
     */
    formatWhatsAppCaption(caption) {
        if (!caption) return '';

        // Converte markdown básico para WhatsApp
        let formatted = caption
            .replace(/\*\*(.+?)\*\*/g, '*$1*')  // negrito
            .replace(/__(.+?)__/g, '_$1_')      // itálico
            .replace(/~~(.+?)~~/g, '~$1~')      // tachado
            .replace(/```(.+?)```/g, '```$1```'); // monospace

        return formatted;
    }

    /**
     * Adiciona destino (canal/grupo)
     */
    async addDestination(type, id, name) {
        const configPath = join(process.cwd(), 'config', 'whatsapp-destinations.json');
        let data = { channels: [], groups: [] };

        if (existsSync(configPath)) {
            data = JSON.parse(readFileSync(configPath, 'utf-8'));
        }

        // Evita duplicados
        const exists = data[type].some(d => d.id === id);
        if (exists) {
            return { success: false, error: 'Destino já existe' };
        }

        data[type].push({ id, name, addedAt: new Date().toISOString() });
        writeFileSync(configPath, JSON.stringify(data, null, 2));

        // Recarrega
        if (type === 'channels') this.channels = data.channels;
        else this.groups = data.groups;

        return { success: true };
    }

    /**
     * Lista chats disponíveis (para descobrir IDs)
     */
    async listChats() {
        if (!this.ready) {
            await this.init();
        }

        const chats = await this.client.getChats();
        return chats.map(c => ({
            id: c.id._serialized,
            name: c.name,
            isGroup: c.isGroup,
            unreadCount: c.unreadCount
        }));
    }

    async testConnection() {
        if (!this.ready) {
            return { ok: false, error: 'Client não inicializado' };
        }

        try {
            const state = await this.client.getState();
            return { 
                ok: state === 'CONNECTED', 
                state,
                targets: this.channels.length + this.groups.length 
            };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    }

    async destroy() {
        if (this.client) {
            await this.client.destroy();
            this.client = null;
            this.ready = false;
        }
    }
}

export default WhatsAppPublisher;
export { WhatsAppPublisher };

// Helper
function logDebug(msg) {
    if (process.env.LOG_LEVEL === 'debug') {
        console.log(`[${new Date().toLocaleString('pt-BR')}] 🔍 DEBUG: ${msg}`);
    }
}
