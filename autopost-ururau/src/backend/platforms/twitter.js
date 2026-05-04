/**
 * AutoPost Ururau — Twitter/X Publisher
 * Publica via Twitter API v2
 * Fase 4 — Publisher
 */

import { readFileSync } from 'fs';
import { TwitterApi } from 'twitter-api-v2';
import { logInfo, logSuccess, logError } from '../modules/logger.js';
import config from '../core/config.js';

class TwitterPublisher {
    constructor() {
        this.name = 'twitter';
        this.client = null;

        const apiKey = config.get('platforms.twitter.apiKey') || process.env.TWITTER_API_KEY;
        const apiSecret = config.get('platforms.twitter.apiSecret') || process.env.TWITTER_API_SECRET;
        const accessToken = config.get('platforms.twitter.accessToken') || process.env.TWITTER_ACCESS_TOKEN;
        const accessSecret = config.get('platforms.twitter.accessSecret') || process.env.TWITTER_ACCESS_SECRET;

        if (apiKey && apiSecret && accessToken && accessSecret) {
            this.client = new TwitterApi({
                appKey: apiKey,
                appSecret: apiSecret,
                accessToken: accessToken,
                accessSecret: accessSecret
            });
        }
    }

    isConfigured() {
        return !!this.client;
    }

    async publish(params) {
        const { imagePath, caption } = params;

        if (!this.isConfigured()) {
            return { success: false, error: 'Twitter não configurado. Defina TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN e TWITTER_ACCESS_SECRET no .env' };
        }

        try {
            logInfo('🐦 Publicando no Twitter/X...');

            const mediaId = await this.client.v1.uploadMedia(imagePath);
            const tweet = await this.client.v2.tweet(caption || '', {
                media: { media_ids: [mediaId] }
            });

            const postUrl = `https://twitter.com/i/web/status/${tweet.data.id}`;
            logSuccess(`✅ Twitter: ${postUrl}`);

            return {
                success: true,
                postId: tweet.data.id,
                postUrl
            };

        } catch (err) {
            logError('❌ Erro no Twitter', err);
            return { success: false, error: err.message };
        }
    }

    async testConnection() {
        if (!this.isConfigured()) return { ok: false, error: 'Não configurado' };

        try {
            const user = await this.client.v2.me();
            return { ok: true, username: user.data.username };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    }
}

export default TwitterPublisher;
export { TwitterPublisher };
