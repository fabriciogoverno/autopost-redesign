/**
 * AutoPost Ururau — LinkedIn Publisher
 * Publica via LinkedIn REST API
 * Fase 4 — Publisher
 */

import { readFileSync } from 'fs';
import fetch from 'node-fetch';
import { logInfo, logSuccess, logError } from '../modules/logger.js';
import config from '../core/config.js';

class LinkedInPublisher {
    constructor() {
        this.name = 'linkedin';
        this.accessToken = config.get('platforms.linkedin.accessToken') || process.env.LINKEDIN_ACCESS_TOKEN;
        this.personUrn = null;
    }

    isConfigured() {
        return !!this.accessToken;
    }

    async publish(params) {
        const { imagePath, caption } = params;

        if (!this.isConfigured()) {
            return { success: false, error: 'LinkedIn não configurado. Defina LINKEDIN_ACCESS_TOKEN no .env' };
        }

        try {
            logInfo('💼 Publicando no LinkedIn...');

            // 1. Upload da imagem
            const imageBuffer = readFileSync(imagePath);
            const uploadResult = await this.uploadImage(imageBuffer);

            if (!uploadResult.success) {
                return uploadResult;
            }

            // 2. Cria post com a imagem
            const postResult = await this.createPost(caption || '', uploadResult.asset);

            if (postResult.success) {
                logSuccess(`✅ LinkedIn: ${postResult.postUrl}`);
            }

            return postResult;

        } catch (err) {
            logError('❌ Erro no LinkedIn', err);
            return { success: false, error: err.message };
        }
    }

    async uploadImage(imageBuffer) {
        // Registra upload
        const registerUrl = 'https://api.linkedin.com/v2/assets?action=registerUpload';
        const registerBody = {
            registerUploadRequest: {
                recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
                owner: await this.getPersonUrn(),
                serviceRelationships: [{
                    relationshipType: 'OWNER',
                    identifier: 'urn:li:userGeneratedContent'
                }]
            }
        };

        const registerRes = await fetch(registerUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(registerBody)
        });

        const registerData = await registerRes.json();

        if (registerData.status !== 200) {
            return { success: false, error: 'LinkedIn: Falha ao registrar upload' };
        }

        const uploadUrl = registerData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
        const asset = registerData.value.asset;

        // Faz upload
        const uploadRes = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'image/jpeg'
            },
            body: imageBuffer
        });

        if (!uploadRes.ok) {
            return { success: false, error: `LinkedIn upload: ${uploadRes.status}` };
        }

        return { success: true, asset };
    }

    async createPost(text, assetUrn) {
        const url = 'https://api.linkedin.com/v2/ugcPosts';
        const personUrn = await this.getPersonUrn();

        const body = {
            author: personUrn,
            lifecycleState: 'PUBLISHED',
            specificContent: {
                'com.linkedin.ugc.ShareContent': {
                    shareCommentary: { text },
                    shareMediaCategory: 'IMAGE',
                    media: [{
                        status: 'READY',
                        description: { text: 'Ururau Notícias' },
                        media: assetUrn,
                        title: { text: 'Post do Ururau' }
                    }]
                }
            },
            visibility: {
                'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
            return { success: false, error: `LinkedIn: ${data.message || response.statusText}` };
        }

        return {
            success: true,
            postId: data.id,
            postUrl: `https://linkedin.com/feed/update/${data.id}`
        };
    }

    async getPersonUrn() {
        if (this.personUrn) return this.personUrn;

        const response = await fetch('https://api.linkedin.com/v2/me', {
            headers: { 'Authorization': `Bearer ${this.accessToken}` }
        });

        const data = await response.json();
        this.personUrn = `urn:li:person:${data.id}`;
        return this.personUrn;
    }

    async testConnection() {
        if (!this.isConfigured()) return { ok: false, error: 'Não configurado' };

        try {
            const response = await fetch('https://api.linkedin.com/v2/me', {
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });
            const data = await response.json();

            if (!response.ok) {
                return { ok: false, error: data.message || 'Token inválido' };
            }

            return { ok: true, name: `${data.localizedFirstName} ${data.localizedLastName}` };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    }
}

export default LinkedInPublisher;
export { LinkedInPublisher };
