/**
 * AutoPost Ururau — Caption Generator (IA)
 * Gera legendas otimizadas para cada rede social usando IA
 * Fase 3 — Legendas
 * 
 * Estratégia:
 *   1. Ollama local (llama3.2) — primário, zero custo
 *   2. Gemini API — secundário, gratuito tier
 *   3. Template estático — fallback final
 */

import database from '../core/database.js';
import { generateCaptionHash } from '../core/hash.js';
import { logInfo, logSuccess, logError, logDebug } from './logger.js';
import config from '../core/config.js';

/**
 * Classe principal do gerador de legendas
 */
class CaptionGenerator {
    constructor() {
        this.stats = {
            generated: 0,
            cached: 0,
            failed: 0,
            avgTime: 0
        };
        this.modelUsed = 'unknown';
    }

    /**
     * Gera legendas para uma notícia (todas as plataformas)
     * @param {Object} post - Dados da notícia
     * @param {Object} options - { forceRegenerate: boolean }
     * @returns {Object} - { success, captions, model, duration, cached }
     */
    async generate(post, options = {}) {
        const startTime = Date.now();
        const hash = generateCaptionHash(post);

        // 1. Verifica cache (a menos que forceRegenerate)
        if (!options.forceRegenerate) {
            const cached = await database.getCachedCaption(hash);
            if (cached) {
                this.stats.cached++;
                logDebug(`♻️ Legenda recuperada do cache (hash: ${hash.substring(0, 12)})`);
                return {
                    success: true,
                    captions: JSON.parse(cached.captions),
                    model: cached.model_used,
                    duration: Date.now() - startTime,
                    cached: true
                };
            }
        }

        // 2. Tenta Ollama (primário)
        let captions = null;
        let modelUsed = 'ollama';

        try {
            captions = await this.generateWithOllama(post);
            logSuccess(`🧠 Ollama gerou legendas para: "${post.title?.substring(0, 50)}..."`);
        } catch (err) {
            logWarn(`⚠️ Ollama falhou: ${err.message}. Tentando Gemini...`);

            // 3. Fallback: Gemini
            try {
                captions = await this.generateWithGemini(post);
                modelUsed = 'gemini';
                logSuccess(`🔮 Gemini gerou legendas (fallback)`);
            } catch (err2) {
                logError(`❌ Gemini também falhou: ${err2.message}. Usando template.`);

                // 4. Fallback final: template estático
                captions = this.generateTemplateFallback(post);
                modelUsed = 'template';
            }
        }

        // Validação
        const validated = this.validateCaptions(captions);
        if (!validated.valid) {
            logWarn(`⚠️ Legendas inválidas da IA. Usando template fallback.`);
            captions = this.generateTemplateFallback(post);
            modelUsed = 'template_fallback';
        }

        // Cache no SQLite
        await database.cacheCaption(hash, captions, modelUsed);

        const duration = Date.now() - startTime;
        this.stats.generated++;
        this.stats.avgTime = (this.stats.avgTime * (this.stats.generated - 1) + duration) / this.stats.generated;

        logInfo(`✅ Legendas geradas em ${duration}ms | Modelo: ${modelUsed}`);

        return {
            success: true,
            captions,
            model: modelUsed,
            duration,
            cached: false
        };
    }

    /**
     * Gera legendas usando Ollama local
     */
    async generateWithOllama(post) {
        const ollamaConfig = config.get('caption.ollama') || {
            baseUrl: 'http://localhost:11434',
            model: 'llama3.2',
            timeout: 30000
        };

        const prompt = this.buildPrompt(post);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), ollamaConfig.timeout);

        try {
            const response = await fetch(`${ollamaConfig.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: ollamaConfig.model,
                    prompt: prompt,
                    stream: false,
                    format: 'json',
                    options: {
                        temperature: 0.7,
                        num_predict: 800
                    }
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Ollama HTTP ${response.status}: ${await response.text()}`);
            }

            const data = await response.json();
            const rawResponse = data.response || data.message?.content || '';

            // Parse JSON da resposta
            return this.parseJsonResponse(rawResponse);

        } catch (err) {
            clearTimeout(timeoutId);
            throw err;
        }
    }

    /**
     * Gera legendas usando Gemini API
     */
    async generateWithGemini(post) {
        const geminiConfig = config.get('caption.gemini') || {};
        const apiKey = geminiConfig.apiKey || process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error('GEMINI_API_KEY não configurada');
        }

        const prompt = this.buildPrompt(post);
        const model = geminiConfig.model || 'gemini-1.5-flash';

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        role: 'user',
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 1024,
                        responseMimeType: 'application/json'
                    }
                })
            }
        );

        if (!response.ok) {
            throw new Error(`Gemini HTTP ${response.status}: ${await response.text()}`);
        }

        const data = await response.json();
        const rawResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        return this.parseJsonResponse(rawResponse);
    }

    /**
     * Fallback: template estático com placeholders
     */
    generateTemplateFallback(post) {
        const title = post.title || '';
        const summary = post.summary || '';
        const category = (post.category || 'geral').toUpperCase();
        const url = post.url || '';

        const base = `📰 ${title}

${summary}

#Ururau #NoticiasRJ #CamposDosGoytacazes #${category}`;

        const cta = '

💬 O que você acha? Comente abaixo!';
        const ctaShort = ' 💬 Comente!';

        return {
            instagram: base + cta + '

🔗 Leia mais: ' + url,
            facebook: base + cta + '

🔗 ' + url,
            twitter: (title + ctaShort).substring(0, 260) + ' #Ururau',
            linkedin: `📰 ${title}

${summary}

#jornalismo #Ururau #RJ`,
            threads: base.substring(0, 480) + '...',
            tiktok: title + ' #Ururau #NoticiasRJ #fyp',
            whatsapp: `📰 *${title}*

${summary}

🔗 ${url}`
        };
    }

    /**
     * Constrói o prompt system para a IA
     */
    buildPrompt(post) {
        return `Você é um editor de redes sociais do portal de notícias URURAU, focado em Campos dos Goytacazes/RJ e região.
Gere legendas em português brasileiro para a seguinte notícia:

TÍTULO: ${post.title}
RESUMO: ${post.summary || 'Não disponível'}
CATEGORIA: ${post.category || 'geral'}

REGRAS OBRIGATÓRIAS:
1. Tom: direto, jornalístico, mas engajador
2. NUNCA invente fatos não presentes no resumo
3. Inclua 3-5 hashtags relevantes (ex: #CamposDosGoytacazes #NoticiasRJ #Ururau)
4. Inclua CTA (call-to-action): "Comente", "Compartilhe", "O que acha?"
5. Adicione emoji relevante no início
6. Mantenha o tom profissional do jornalismo investigativo

LIMITES POR PLATAFORMA:
- instagram: máximo 2200 caracteres (use resumo completo + CTA + hashtags)
- facebook: máximo 5000 caracteres (mais detalhado que Instagram)
- twitter: máximo 280 caracteres (só o essencial + hashtags)
- linkedin: máximo 3000 caracteres (tom mais formal, profissional)
- threads: máximo 500 caracteres (conversacional, direto)
- tiktok: máximo 100 caracteres (curto, impactante, com hashtags)
- whatsapp: máximo 4000 caracteres (título em negrito *texto*, resumo, link)

FORMATO DE SAÍDA (JSON obrigatório):
{
  "instagram": "...",
  "facebook": "...",
  "twitter": "...",
  "linkedin": "...",
  "threads": "...",
  "tiktok": "...",
  "whatsapp": "..."
}

Gere APENAS o JSON, sem explicações adicionais.`;
    }

    /**
     * Parse da resposta JSON da IA (com tratamento de erros)
     */
    parseJsonResponse(raw) {
        if (!raw || typeof raw !== 'string') {
            throw new Error('Resposta vazia da IA');
        }

        // Limpa markdown code blocks
        let cleaned = raw
            .replace(/^```json\s*/, '')
            .replace(/```\s*$/, '')
            .trim();

        // Tenta parse direto
        try {
            const parsed = JSON.parse(cleaned);
            return this.normalizeCaptions(parsed);
        } catch (err) {
            // Tenta extrair JSON de texto misturado
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    return this.normalizeCaptions(parsed);
                } catch (err2) {
                    throw new Error(`JSON inválido da IA: ${err2.message}`);
                }
            }
            throw new Error(`Não foi possível extrair JSON da resposta: ${cleaned.substring(0, 100)}`);
        }
    }

    /**
     * Normaliza e valida as legendas parseadas
     */
    normalizeCaptions(parsed) {
        const platforms = ['instagram', 'facebook', 'twitter', 'linkedin', 'threads', 'tiktok', 'whatsapp'];
        const result = {};

        for (const platform of platforms) {
            let caption = parsed[platform];

            if (!caption || typeof caption !== 'string') {
                caption = '';
            }

            // Aplica limites por plataforma
            const limits = {
                instagram: 2200,
                facebook: 5000,
                twitter: 280,
                linkedin: 3000,
                threads: 500,
                tiktok: 100,
                whatsapp: 4000
            };

            const limit = limits[platform];
            if (caption.length > limit) {
                caption = caption.substring(0, limit - 3) + '...';
            }

            // Validação mínima
            if (caption.length < 10) {
                caption = `📰 ${parsed.title || 'Notícia'} #Ururau`;
            }

            result[platform] = caption;
        }

        return result;
    }

    /**
     * Valida se as legendas atendem critérios mínimos
     */
    validateCaptions(captions) {
        if (!captions || typeof captions !== 'object') {
            return { valid: false, reason: 'não é objeto' };
        }

        const platforms = ['instagram', 'facebook', 'twitter', 'linkedin', 'threads', 'tiktok', 'whatsapp'];

        for (const platform of platforms) {
            const caption = captions[platform];
            if (!caption || typeof caption !== 'string') {
                return { valid: false, reason: `plataforma ${platform} ausente` };
            }
            if (caption.length < 10) {
                return { valid: false, reason: `plataforma ${platform} muito curta` };
            }
        }

        return { valid: true };
    }

    getStats() {
        return { ...this.stats };
    }
}

// Singleton
const captionGenerator = new CaptionGenerator();
export default captionGenerator;
export { CaptionGenerator };

// Helper para logWarn (não importado no topo para evitar circular)
function logWarn(msg) {
    console.warn(`[${new Date().toLocaleString('pt-BR')}] ⚠️ WARN: ${msg}`);
}
