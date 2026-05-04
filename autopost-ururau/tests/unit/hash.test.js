/**
 * AutoPost Ururau — Testes Unitários: Hash Module
 * Fase 8 — Testes
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generatePostHash, generateCaptionHash, isValidHash, shortHash, generateFileHash } from '../src/backend/core/hash.js';

describe('Hash Module', () => {
    describe('generatePostHash', () => {
        it('deve gerar hash SHA-256 válido de 64 caracteres', () => {
            const post = { url: 'https://example.com/test', title: 'Teste' };
            const hash = generatePostHash(post);
            assert.strictEqual(hash.length, 64);
            assert.strictEqual(isValidHash(hash), true);
        });

        it('deve normalizar título (case insensitive, sem pontuação)', () => {
            const post1 = { url: 'https://example.com/test', title: '  Teste de HASH!  ' };
            const post2 = { url: 'https://example.com/test', title: 'teste de hash' };
            const hash1 = generatePostHash(post1);
            const hash2 = generatePostHash(post2);
            assert.strictEqual(hash1, hash2, 'Hashes devem ser iguais após normalização');
        });

        it('deve normalizar URL (remove trailing slash)', () => {
            const post1 = { url: 'https://example.com/test/', title: 'Teste' };
            const post2 = { url: 'https://example.com/test', title: 'Teste' };
            const hash1 = generatePostHash(post1);
            const hash2 = generatePostHash(post2);
            assert.strictEqual(hash1, hash2, 'URLs com/sem barra final devem gerar mesmo hash');
        });

        it('deve gerar hashes diferentes para URLs diferentes', () => {
            const post1 = { url: 'https://example.com/a', title: 'Teste' };
            const post2 = { url: 'https://example.com/b', title: 'Teste' };
            const hash1 = generatePostHash(post1);
            const hash2 = generatePostHash(post2);
            assert.notStrictEqual(hash1, hash2);
        });

        it('deve lançar erro se URL ou título faltam', () => {
            assert.throws(() => generatePostHash({ url: 'https://example.com' }), /obrigatórios/);
            assert.throws(() => generatePostHash({ title: 'Teste' }), /obrigatórios/);
            assert.throws(() => generatePostHash({}), /obrigatórios/);
        });

        it('deve ser determinístico (mesma entrada = mesmo hash)', () => {
            const post = { url: 'https://g1.globo.com/rj/noticia/2026/05/04/teste.ghtml', title: 'Notícia de Teste do Ururau' };
            const h1 = generatePostHash(post);
            const h2 = generatePostHash(post);
            assert.strictEqual(h1, h2);
        });
    });

    describe('generateCaptionHash', () => {
        it('deve gerar hash diferente do post hash', () => {
            const post = { url: 'https://example.com', title: 'Teste', summary: 'Resumo' };
            const h1 = generatePostHash(post);
            const h2 = generateCaptionHash(post);
            assert.notStrictEqual(h1, h2);
        });

        it('deve ser determinístico', () => {
            const post = { title: 'Teste', summary: 'Resumo', category: 'geral' };
            const h1 = generateCaptionHash(post);
            const h2 = generateCaptionHash(post);
            assert.strictEqual(h1, h2);
        });
    });

    describe('isValidHash', () => {
        it('deve validar hash SHA-256 correto', () => {
            assert.strictEqual(isValidHash('a'.repeat(64)), true);
            assert.strictEqual(isValidHash('0'.repeat(64)), true);
            assert.strictEqual(isValidHash('abc123def456' + '0'.repeat(52)), true);
        });

        it('deve rejeitar hashes inválidos', () => {
            assert.strictEqual(isValidHash(''), false);
            assert.strictEqual(isValidHash('short'), false);
            assert.strictEqual(isValidHash('g'.repeat(64)), false); // g não é hex
            assert.strictEqual(isValidHash(null), false);
            assert.strictEqual(isValidHash(undefined), false);
            assert.strictEqual(isValidHash(123), false);
        });
    });

    describe('shortHash', () => {
        it('deve retornar 12 caracteres', () => {
            const full = 'a'.repeat(64);
            const short = shortHash(full);
            assert.strictEqual(short.length, 12);
            assert.strictEqual(isValidHash(short), false);
        });
    });

    describe('generateFileHash', () => {
        it('deve gerar hash de Buffer', () => {
            const buf = Buffer.from('teste do ururau');
            const hash = generateFileHash(buf);
            assert.strictEqual(hash.length, 64);
            assert.strictEqual(isValidHash(hash), true);
        });

        it('deve ser determinístico', () => {
            const buf = Buffer.from('conteúdo fixo');
            const h1 = generateFileHash(buf);
            const h2 = generateFileHash(buf);
            assert.strictEqual(h1, h2);
        });
    });
});
