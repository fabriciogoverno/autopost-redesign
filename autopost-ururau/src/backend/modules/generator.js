/**
 * AutoPost Ururau — Art Generator Engine (Sharp version)
 * Renderiza templates JSON em PNG usando Sharp (sem Canvas/Node-gyp)
 * Fase 2 — Gerador de Artes
 * 
 * Dependencias: npm install sharp
 */

import sharp from 'sharp';
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadTemplate, fillTemplate, wrapTitle, getTemplateBasePath, getTemplateHash } from './template-loader.js';
import { logInfo, logSuccess, logError, logDebug } from './logger.js';
import database from '../core/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OUTPUT_DIR = join(process.cwd(), 'output', 'artes');

/**
 * Classe principal do gerador de artes
 */
class ArtGenerator {
    constructor() {
        this.stats = {
            generated: 0,
            failed: 0,
            avgTime: 0
        };
    }

    /**
     * Gera arte completa para uma noticia
     */
    async generate(post, templateId = 'ururau-reels', formats = ['reels']) {
        const startTime = Date.now();
        const files = [];

        try {
            logInfo(`🎨 Gerando arte para: "${post.title?.substring(0, 50)}..." | Template: ${templateId}`);

            const template = loadTemplate(templateId);
            const filled = fillTemplate(template, post);
            const templateHash = getTemplateHash(template);

            for (const format of formats) {
                const filePath = await this.renderFromTemplate(filled, post, format, templateId);
                files.push({ format, path: filePath });
            }

            const duration = Date.now() - startTime;
            this.stats.generated++;
            this.stats.avgTime = (this.stats.avgTime * (this.stats.generated - 1) + duration) / this.stats.generated;

            if (post.id) {
                await database.updatePostStatus(post.id, 'generated');
            }

            logSuccess(`✅ Arte gerada em ${duration}ms: ${files.map(f => f.format).join(', ')}`);

            return { success: true, files, duration, template: templateId, templateHash };

        } catch (err) {
            this.stats.failed++;
            logError(`❌ Falha na geracao de arte`, err);
            if (post.id) {
                await database.updatePostStatus(post.id, 'failed', err.message);
            }
            return { success: false, error: err.message, files: [] };
        }
    }

    async renderFromTemplate(template, post, format, templateId) {
        if (template.layers) return this.renderLayerTemplate(template, post, format, templateId);
        return this.renderFormat(template, post, format, templateId);
    }

    /**
     * Renderiza um formato usando Sharp
     */
    async renderFormat(template, post, format, templateId) {
        const { width, height } = template.dimensions;

        // Cria canvas RGBA
        const canvas = Buffer.alloc(width * height * 4, 0);

        // 1. BACKGROUND
        await this.renderBackground(canvas, template, post, width, height);

        // 2. ELEMENTOS
        for (const el of template.elements) {
            await this.renderElement(canvas, el, template, width, height);
        }

        // 3. SALVAR COM SHARP
        const dateDir = new Date().toISOString().slice(0, 10);
        const outDir = join(OUTPUT_DIR, dateDir);
        if (!existsSync(outDir)) {
            mkdirSync(outDir, { recursive: true });
        }

        const hash = post.hash || 'demo';
        const fileName = `${hash.substring(0, 12)}_${format}.png`;
        const filePath = join(outDir, fileName);

        await sharp(canvas, { raw: { width, height, channels: 4 } })
            .png({ quality: 95, compressionLevel: 6 })
            .toFile(filePath);

        return filePath;
    }

    async renderBackground(canvas, template, post, width, height) {
        const bg = template.background || {};

        // Cor de fallback
        const fallbackColor = this.hexToRgba(bg.fallbackColor || '#0a0a1a');

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                canvas[idx] = fallbackColor.r;
                canvas[idx + 1] = fallbackColor.g;
                canvas[idx + 2] = fallbackColor.b;
                canvas[idx + 3] = fallbackColor.a;
            }
        }

        // Overlay gradiente simples
        if (bg.overlay) {
            const fromColor = this.parseRgba(bg.overlay.from || 'rgba(10, 10, 30, 0.15)');
            const toColor = this.parseRgba(bg.overlay.to || 'rgba(5, 3, 25, 0.88)');

            for (let y = 0; y < height; y++) {
                const ratio = y / height;
                const r = Math.round(fromColor.r + (toColor.r - fromColor.r) * ratio);
                const g = Math.round(fromColor.g + (toColor.g - fromColor.g) * ratio);
                const b = Math.round(fromColor.b + (toColor.b - fromColor.b) * ratio);
                const a = Math.round(fromColor.a + (toColor.a - fromColor.a) * ratio);

                for (let x = 0; x < width; x++) {
                    const idx = (y * width + x) * 4;
                    const alpha = a / 255;
                    canvas[idx] = Math.round(canvas[idx] * (1 - alpha) + r * alpha);
                    canvas[idx + 1] = Math.round(canvas[idx + 1] * (1 - alpha) + g * alpha);
                    canvas[idx + 2] = Math.round(canvas[idx + 2] * (1 - alpha) + b * alpha);
                }
            }
        }
    }

    async renderElement(canvas, el, template, width, height) {
        let x = el.position?.x || 0;
        let y = el.position?.y || 0;

        if (el.relativeTo) {
            const refEl = template.elements.find(e => e.id === el.relativeTo);
            if (refEl && refEl._renderedBounds) {
                x += refEl._renderedBounds.x;
                y += refEl._renderedBounds.y + (refEl._renderedBounds.height || 0);
            }
            if (el.relativeY) {
                y += el.relativeY;
            }
        }

        switch (el.type) {
            case 'text':
                this.renderTextElement(canvas, el, x, y, width, height);
                break;
            case 'shape':
                this.renderShapeElement(canvas, el, x, y, width, height);
                break;
            case 'badge':
                this.renderBadgeElement(canvas, el, x, y, width, height);
                break;
            case 'line':
                this.renderLineElement(canvas, el, x, y, width, height);
                break;
        }
    }

    renderTextElement(canvas, el, x, y, width, height) {
        const font = el.font || {};
        const color = this.parseRgba(font.color || '#FFFFFF');
        const text = el.text || '';

        // Renderizacao simplificada: desenha retangulos como "pixels" de texto
        // Para producao real, usar biblioteca como @napi-rs/canvas ou jimp

        const maxWidth = el.maxWidth || (width - x * 2);
        const fontSize = font.size || 32;

        // Estimativa: cada caractere = ~0.6 * fontSize de largura
        const charWidth = fontSize * 0.6;
        const charsPerLine = Math.floor(maxWidth / charWidth);

        let lines = [];
        if (el.id === 'title_main') {
            lines = wrapTitle(text, maxWidth, fontSize);
        } else {
            const words = text.split(' ');
            let current = '';
            for (const word of words) {
                if ((current + ' ' + word).trim().length <= charsPerLine) {
                    current = (current + ' ' + word).trim();
                } else {
                    if (current) lines.push(current);
                    current = word;
                }
            }
            if (current) lines.push(current);
        }

        const lineHeight = fontSize * (font.lineHeight || 1.2);
        let currentY = y;

        for (const line of lines.slice(0, el.maxLines || 10)) {
            // Desenha cada caractere como um bloco (simplificado)
            for (let i = 0; i < line.length && i < charsPerLine; i++) {
                const cx = x + i * charWidth;
                if (cx + charWidth < width && currentY + fontSize < height) {
                    this.drawRect(canvas, cx, currentY, charWidth * 0.8, fontSize, color, width, height);
                }
            }
            currentY += lineHeight;
        }

        el._renderedBounds = { x, y, width: maxWidth, height: lines.length * lineHeight };
    }

    renderShapeElement(canvas, el, x, y, width, height) {
        const w = el.position?.width || 50;
        const h = el.position?.height || 50;
        const color = this.parseRgba(el.fill || '#000000');

        if (el.shape === 'circle') {
            this.drawCircle(canvas, x + w/2, y + h/2, w/2, color, width, height);
        } else {
            this.drawRect(canvas, x, y, w, h, color, width, height);
        }
    }

    renderBadgeElement(canvas, el, x, y, width, height) {
        const text = el.text || '';
        const font = el.font || {};
        const fontSize = font.size || 24;
        const padding = el.padding || { top: 8, bottom: 8, left: 16, right: 16 };

        const charWidth = fontSize * 0.6;
        const textW = text.length * charWidth;
        const textH = fontSize;
        const badgeW = textW + padding.left + padding.right;
        const badgeH = textH + padding.top + padding.bottom;

        const bgColor = this.parseRgba(el.background || '#E63946');
        this.drawRect(canvas, x, y, badgeW, badgeH, bgColor, width, height);

        el._renderedBounds = { x, y, width: badgeW, height: badgeH };
    }

    renderLineElement(canvas, el, x, y, width, height) {
        const w = el.width || 200;
        const h = el.height || 4;
        const color = this.parseRgba(el.color || '#E63946');
        this.drawRect(canvas, x, y, w, h, color, width, height);
        el._renderedBounds = { x, y, width: w, height: h };
    }

    drawRect(canvas, x, y, w, h, color, canvasWidth, canvasHeight) {
        for (let py = Math.max(0, y); py < Math.min(canvasHeight, y + h); py++) {
            for (let px = Math.max(0, x); px < Math.min(canvasWidth, x + w); px++) {
                const idx = (py * canvasWidth + px) * 4;
                const alpha = color.a / 255;
                canvas[idx] = Math.round(canvas[idx] * (1 - alpha) + color.r * alpha);
                canvas[idx + 1] = Math.round(canvas[idx + 1] * (1 - alpha) + color.g * alpha);
                canvas[idx + 2] = Math.round(canvas[idx + 2] * (1 - alpha) + color.b * alpha);
                canvas[idx + 3] = 255;
            }
        }
    }

    drawCircle(canvas, cx, cy, radius, color, canvasWidth, canvasHeight) {
        for (let py = Math.max(0, cy - radius); py < Math.min(canvasHeight, cy + radius); py++) {
            for (let px = Math.max(0, cx - radius); px < Math.min(canvasWidth, cx + radius); px++) {
                const dx = px - cx;
                const dy = py - cy;
                if (dx * dx + dy * dy <= radius * radius) {
                    const idx = (py * canvasWidth + px) * 4;
                    const alpha = color.a / 255;
                    canvas[idx] = Math.round(canvas[idx] * (1 - alpha) + color.r * alpha);
                    canvas[idx + 1] = Math.round(canvas[idx + 1] * (1 - alpha) + color.g * alpha);
                    canvas[idx + 2] = Math.round(canvas[idx + 2] * (1 - alpha) + color.b * alpha);
                    canvas[idx + 3] = 255;
                }
            }
        }
    }

    hexToRgba(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return { r, g, b, a: 255 };
    }

    parseRgba(colorStr) {
        if (!colorStr) return { r: 0, g: 0, b: 0, a: 255 };

        if (colorStr.startsWith('#')) {
            return this.hexToRgba(colorStr);
        }

        if (colorStr.startsWith('rgba')) {
            const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
            if (match) {
                return {
                    r: parseInt(match[1]),
                    g: parseInt(match[2]),
                    b: parseInt(match[3]),
                    a: match[4] ? Math.round(parseFloat(match[4]) * 255) : 255
                };
            }
        }

        return { r: 255, g: 255, b: 255, a: 255 };
    }

    async renderLayerTemplate(template, post, format) {
        const width = template.source.width;
        const height = template.source.height;
        const outDir = join(OUTPUT_DIR, new Date().toISOString().slice(0, 10));
        if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
        const hash = post.hash || 'preview';
        const filePath = join(outDir, `${hash.substring(0, 12)}_${format}.png`);
        const data = template._renderData || {};
        const category = (data.category || 'GERAL').toUpperCase();
        const color = template.categoryColors?.[category] || template.categoryColors?.GERAL || '#6c757d';
        const l = template.layers || {};
        const titleLines = this.wrapMultiline(data.title || '', l.title?.maxWidth || 970, l.title?.fontSize || 60, 4);
        const summaryLines = this.wrapMultiline(data.summary || '', l.summary?.maxWidth || 970, l.summary?.fontSize || 32, 5);
        const titleText = titleLines.map((line, i) => `<tspan x="${l.title?.x || 55}" dy="${i === 0 ? 0 : (l.title?.lineHeight || 72)}">${this.escapeXml(line)}</tspan>`).join('');
        const summaryText = summaryLines.map((line, i) => `<tspan x="${l.summary?.x || 55}" dy="${i === 0 ? 0 : (l.summary?.lineHeight || 46)}">${this.escapeXml(line)}</tspan>`).join('');
        const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect x="${l.category?.x || 55}" y="${l.category?.y || 1100}" width="${Math.max(150, category.length * 18 + (l.category?.paddingX || 24) * 2)}" height="${l.category?.height || 52}" rx="${l.category?.radius || 6}" fill="${color}"/>
          <text x="${(l.category?.x || 55) + (l.category?.paddingX || 24)}" y="${(l.category?.y || 1100) + (l.category?.fontSize || 22)}" font-size="${l.category?.fontSize || 22}" fill="${l.category?.color || '#fff'}" font-family="Arial" font-weight="bold">${category}</text>
          <text x="${l.title?.x || 55}" y="${l.title?.y || 1180}" font-size="${l.title?.fontSize || 60}" fill="${l.title?.color || '#fff'}" font-family="Arial" font-weight="bold">${titleText}</text>
          <rect x="${l.separator?.x || 55}" y="${l.separator?.y || ((l.title?.y || 1180) + 80)}" width="${l.separator?.width || 220}" height="${l.separator?.height || 5}" fill="${l.separator?.color || '#c11f25'}"/>
          <text x="${l.summary?.x || 55}" y="${l.summary?.y || 1400}" font-size="${l.summary?.fontSize || 32}" fill="${l.summary?.color || '#E0E0E0'}" font-family="Arial">${summaryText}</text>
          <text x="${l.watermark?.x || 55}" y="${l.watermark?.y || 1880}" font-size="${l.watermark?.fontSize || 18}" fill="${l.watermark?.color || '#fff'}" opacity="${l.watermark?.opacity || 0.5}" font-family="Arial">${this.escapeXml(l.watermark?.text || 'URURAU.COM.BR')}</text>
        </svg>`;
        const basePath = getTemplateBasePath();
        const base = existsSync(basePath)
            ? await sharp(basePath).resize(width, height).toBuffer()
            : await sharp({ create: { width, height, channels: 4, background: '#050510' } }).png().toBuffer();
        await sharp(base).composite([{ input: Buffer.from(svg) }]).png({ quality: 95 }).toFile(filePath);
        return filePath;
    }

    wrapMultiline(text, maxWidth, fontSize, maxLines = 4) {
        const chars = Math.max(8, Math.floor((maxWidth || 970) / Math.max(10, fontSize * 0.56)));
        const words = String(text || '').split(/\s+/);
        const lines = [];
        let cur = '';
        for (const w of words) {
            const t = (cur + ' ' + w).trim();
            if (t.length <= chars) cur = t;
            else { if (cur) lines.push(cur); cur = w; }
            if (lines.length >= maxLines) break;
        }
        if (cur && lines.length < maxLines) lines.push(cur);
        return lines;
    }

    escapeXml(v = '') { return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

    getStats() {
        return { ...this.stats };
    }
}

const generator = new ArtGenerator();
export default generator;
export { ArtGenerator };
