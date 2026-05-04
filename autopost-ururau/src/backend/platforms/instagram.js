/**
 * AutoPost Ururau — Instagram Publisher
 * Publica via Instagram Graph API (Business/Creator accounts)
 * Fase 4 — Publisher
 */

import { readFileSync } from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { logInfo, logSuccess, logError, logDebug } from '../modules/logger.js';
import config from '../core/config.js';

class InstagramPublisher {
    constructor() {
        this.name = 'instagram';
        this.accountId = config.get('platforms.instagram.accountId') || process.env.INSTAGRAM_ACCOUNT_ID;
        this.accessToken = config.get('platforms.instagram.accessToken') || process.env.INSTAGRAM_ACCESS_TOKEN;
    }

    isConfigured() {
        return !!(this.accountId && this.accessToken);
    }

    /**
     * Publica imagem no feed do Instagram
     * @param {Object} params - { imagePath, caption }
     * @returns {Object} - { success, postId, postUrl, error }
     */
    async publish(params) {
        const { imagePath, caption } = params;

        if (!this.isConfigured()) {
            return { success: false, error: 'Instagram não configurado. Defina INSTAGRAM_ACCOUNT_ID e INSTAGRAM_ACCESS_TOKEN no .env' };
        }

        try {
            logInfo('📸 Publicando no Instagram...');

            // 1. Upload da imagem
            const imageBuffer = readFileSync(imagePath);
            const uploadResult = await this.uploadImage(imageBuffer, caption);

            if (!uploadResult.success) {
                return uploadResult;
            }

            // 2. Publica o container
            const publishResult = await this.publishContainer(uploadResult.mediaId);

            if (publishResult.success) {
                logSuccess(`✅ Instagram: ${publishResult.postUrl}`);
                return {
                    success: true,
                    postId: publishResult.postId,
                    postUrl: publishResult.postUrl
                };
            }

            return publishResult;

        } catch (err) {
            logError('❌ Erro no Instagram', err);
            return { success: false, error: err.message };
        }
    }

    async uploadImage(imageBuffer, caption) {
        const url = `https://graph.facebook.com/v18.0/${this.accountId}/media`;

        const form = new FormData();
        form.append('image', imageBuffer, { filename: 'post.jpg', contentType: 'image/jpeg' });
        form.append('caption', caption || '');
        form.append('access_token', this.accessToken);

        const response = await fetch(url, { method: 'POST', body: form });
        const data = await response.json();

        if (data.error) {
            return { success: false, error: `Instagram upload: ${data.error.message}` };
        }

        return { success: true, mediaId: data.id };
    }

    async publishContainer(mediaId) {
        const url = `https://graph.facebook.com/v18.0/${this.accountId}/media_publish`;

        const params = new URLSearchParams({
            creation_id: mediaId,
            access_token: this.accessToken
        });

        const response = await fetch(url, {
            method: 'POST',
            body: params
        });

        const data = await response.json();

        if (data.error) {
            return { success: false, error: `Instagram publish: ${data.error.message}` };
        }

        return {
            success: true,
            postId: data.id,
            postUrl: `https://instagram.com/p/${data.id}`
        };
    }

    async testConnection() {
        if (!this.isConfigured()) return { ok: false, error: 'Não configurado' };

        try {
            const url = `https://graph.facebook.com/v18.0/${this.accountId}?fields=username&access_token=${this.accessToken}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.error) {
                return { ok: false, error: data.error.message };
            }

            return { ok: true, username: data.username };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    }
}

export default InstagramPublisher;
export { InstagramPublisher };
