/**
 * AutoPost Ururau — Hash Module
 * Geração de hash SHA-256 para bloqueio rígido de duplicidade
 * Fase 1 — Core
 */

import crypto from 'crypto';

/**
 * Gera hash único para uma notícia baseado em URL + título normalizado
 * Impossível publicar a mesma notícia 2x
 * 
 * @param {Object} post - Objeto da notícia
 * @param {string} post.url - URL da notícia
 * @param {string} post.title - Título da notícia
 * @returns {string} - Hash SHA-256 hex (64 caracteres)
 */
export function generatePostHash(post) {
    if (!post.url || !post.title) {
        throw new Error('URL e título são obrigatórios para gerar hash');
    }

    // Normalização para evitar variações insignificantes gerarem hashes diferentes
    const normalizedUrl = post.url.trim().toLowerCase().replace(/\/$/, '');
    const normalizedTitle = post.title
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ') // múltiplos espaços -> um espaço
        .replace(/[^a-z0-9\s]/g, ''); // remove pontuação

    const seed = `${normalizedUrl}::${normalizedTitle}`;
    return crypto.createHash('sha256').update(seed).digest('hex');
}

/**
 * Gera hash para cache de legendas (conteúdo da notícia)
 * @param {Object} post 
 * @returns {string}
 */
export function generateCaptionHash(post) {
    const content = `${post.title}::${post.summary || ''}::${post.category || 'geral'}`;
    return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Gera hash para arquivo de imagem (verificação de integridade)
 * @param {Buffer} buffer 
 * @returns {string}
 */
export function generateFileHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Verifica se um hash é válido (formato SHA-256)
 * @param {string} hash 
 * @returns {boolean}
 */
export function isValidHash(hash) {
    return typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash);
}

/**
 * Gera hash curto para nomes de arquivo (primeiros 12 chars do SHA-256)
 * @param {string} fullHash 
 * @returns {string}
 */
export function shortHash(fullHash) {
    return fullHash.substring(0, 12);
}

// Testes rápidos se executado diretamente
if (process.argv.includes('--test')) {
    const testPost = {
        url: 'https://g1.globo.com/rj/rio-de-janeiro/noticia/2026/05/03/teste.ghtml',
        title: '  Teste de HASH do Ururau!  '
    };

    const hash1 = generatePostHash(testPost);
    const hash2 = generatePostHash({ ...testPost, title: 'teste de hash do ururau' });

    console.log('Hash 1:', hash1);
    console.log('Hash 2:', hash2);
    console.log('São iguais (normalização funciona):', hash1 === hash2);
    console.log('Validação:', isValidHash(hash1));
    console.log('Short:', shortHash(hash1));
}
