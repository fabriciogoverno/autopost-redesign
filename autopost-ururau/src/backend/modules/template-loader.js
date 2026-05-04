/**
 * AutoPost Ururau — Template Loader
 * Carrega, valida e prepara templates JSON para renderização
 * Fase 2 — Gerador
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEMPLATES_DIR = join(__dirname, '../../../templates');

/**
 * Carrega template JSON do disco
 * @param {string} templateId - ID do template (ex: 'ururau-reels')
 * @returns {Object} - Template parseado e validado
 */
export function loadTemplate(templateId) {
    const templatePath = join(TEMPLATES_DIR, `${templateId}.json`);

    if (!existsSync(templatePath)) {
        throw new Error(`Template não encontrado: ${templatePath}`);
    }

    const template = JSON.parse(readFileSync(templatePath, 'utf-8'));
    validateTemplate(template);

    return template;
}

/**
 * Valida estrutura do template
 * @param {Object} template 
 */
function validateTemplate(template) {
    const required = ['id', 'name', 'dimensions', 'elements'];
    for (const key of required) {
        if (!template[key]) {
            throw new Error(`Template inválido: campo obrigatório '${key}' ausente`);
        }
    }

    if (!template.dimensions.width || !template.dimensions.height) {
        throw new Error('Template inválido: dimensions deve ter width e height');
    }

    if (!Array.isArray(template.elements) || template.elements.length === 0) {
        throw new Error('Template inválido: elements deve ser array não-vazio');
    }

    // Valida elementos
    for (const el of template.elements) {
        if (!el.id || !el.type) {
            throw new Error(`Elemento inválido: id e type são obrigatórios`);
        }

        const validTypes = ['text', 'shape', 'badge', 'line', 'image'];
        if (!validTypes.includes(el.type)) {
            throw new Error(`Elemento '${el.id}': tipo '${el.type}' não suportado`);
        }
    }
}

/**
 * Lista todos os templates disponíveis
 * @returns {Array} - Lista de {id, name, description}
 */
export function listTemplates() {
    const { readdirSync } = await import('fs');
    const files = readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.json'));

    return files.map(f => {
        const template = JSON.parse(readFileSync(join(TEMPLATES_DIR, f), 'utf-8'));
        return {
            id: template.id,
            name: template.name,
            description: template.description,
            dimensions: template.dimensions
        };
    });
}

/**
 * Preenche placeholders no template com dados da notícia
 * @param {Object} template - Template original
 * @param {Object} post - Dados da notícia
 * @returns {Object} - Template com valores substituídos
 */
export function fillTemplate(template, post) {
    const filled = JSON.parse(JSON.stringify(template)); // deep clone

    // Mapeia categoria para badge
    const categoryKey = (post.category || 'geral').toLowerCase();
    const catConfig = template.categories?.[categoryKey] || template.categories?.['geral'];

    for (const el of filled.elements) {
        // Substitui placeholders {{title}}, {{summary}}, {{category}}
        if (el.text && typeof el.text === 'string') {
            el.text = el.text
                .replace(/{{title}}/g, post.title || '')
                .replace(/{{summary}}/g, post.summary || '')
                .replace(/{{category}}/g, catConfig?.badgeText || categoryKey.toUpperCase());
        }

        // Aplica cor do badge baseado na categoria
        if (el.type === 'badge' && el.id === 'category_badge' && catConfig) {
            el.background = catConfig.badgeColor;
        }
    }

    return filled;
}

/**
 * Trunca texto para caber no template
 * @param {string} text 
 * @param {number} maxLength 
 * @returns {string}
 */
export function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text || '';
    return text.substring(0, maxLength - 3) + '...';
}

/**
 * Quebra título em múltiplas linhas respeitando largura máxima
 * @param {string} title 
 * @param {number} maxWidth - Largura máxima em pixels
 * @param {number} fontSize - Tamanho da fonte
 * @returns {Array} - Array de strings (linhas)
 */
export function wrapTitle(title, maxWidth, fontSize) {
    if (!title) return [''];

    // Estimativa: ~0.55 da largura do fontSize por caractere (sans-serif bold)
    const avgCharWidth = fontSize * 0.55;
    const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth);

    const words = title.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
            currentLine = (currentLine + ' ' + word).trim();
        } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
        }
    }

    if (currentLine) lines.push(currentLine);

    // Limita a 5 linhas
    if (lines.length > 5) {
        return lines.slice(0, 4).concat([lines[4].substring(0, maxCharsPerLine - 3) + '...']);
    }

    return lines;
}
