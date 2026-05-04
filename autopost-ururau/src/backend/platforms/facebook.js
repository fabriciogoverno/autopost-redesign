/**
 * AutoPost Ururau — Facebook Publisher
 * Publica via Facebook Graph API
 * Fase 4 — Publisher
 */

import { readFileSync } from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { logInfo, logSuccess, logError } from '../modules/logger.js';
import config from '../core/config.js';

class FacebookPublisher {
    constructor() {
        this.name = 'facebook';
        this.pageId = config.get('platforms.facebook.pageId') || process.env.FACEBOOK_PAGE_ID;
        this.accessToken = config.get('platforms.facebook.accessToken') || process.env.FACEBOOK_ACCESS_TOKEN;
    }

    isConfigured() {
        return !!(this.pageId && this.accessToken);
    }

    async publish(params) {
        const { imagePath, caption } = params;

        if (!this.isConfigured()) {
            return { success: false, error: 'Facebook não configurado. Defina FACEBOOK_PAGE_ID e FACEBOOK_ACCESS_TOKEN no .env' };
        }

        try {
            logInfo('👥 Publicando no Facebook...');

            const imageBuffer = readFileSync(imagePath);
            const form = new FormData();
            form.append('source', imageBuffer, { filename: 'post.jpg', contentType: 'image/jpeg' });
            form.append('message', caption || '');
            form.append('access_token', this.accessToken);

            const url = `https://graph.facebook.com/v18.0/${this.pageId}/photos`;
            const response = await fetch(url, { method: 'POST', body: form });
            const data = await response.json();

            if (data.error) {
                return { success: false, error: `Facebook: ${data.error.message}` };
            }

            const postUrl = `https://facebook.com/${data.post_id}`;
            logSuccess(`✅ Facebook: ${postUrl}`);

            return {
                success: true,
                postId: data.post_id,
                postUrl
            };

        } catch (err) {
            logError('❌ Erro no Facebook', err);
            return { success: false, error: err.message };
        }
    }

    async testConnection() {
        if (!this.isConfigured()) return { ok: false, error: 'Não configurado' };

        try {
            const url = `https://graph.facebook.com/v18.0/${this.pageId}?fields=name&access_token=${this.accessToken}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.error) {
                return { ok: false, error: data.error.message };
            }

            return { ok: true, pageName: data.name };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    }
}

export default FacebookPublisher;
export { FacebookPublisher };
