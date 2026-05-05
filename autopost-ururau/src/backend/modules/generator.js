/**
 * AutoPost Ururau — Art Generator Engine (Sharp version)
 * Renderiza templates JSON em PNG usando Sharp (sem Canvas/Node-gyp)
 * Fase 2 — Gerador de Artes
 * 
 * Dependencias: npm install sharp
 */

import sharp from 'sharp';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname, resolve, isAbsolute } from 'path';
import { fileURLToPath } from 'url';
import { loadTemplate, fillTemplate, wrapTitle, getTemplateBasePath, getTemplateHash } from './template-loader.js';
import { logInfo, logSuccess, logError, logDebug } from './logger.js';
import database from '../core/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OUTPUT_DIR = join(process.cwd(), 'output', 'artes');
const DASHBOARD_PUBLIC_DIR = join(__dirname, '../../dashboard/public');
const AILERON_FONT_DIR = join(DASHBOARD_PUBLIC_DIR, 'assets', 'fonts', 'aileron');

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
        const basePath = getTemplateBasePath();
        const base = existsSync(basePath)
            ? await sharp(basePath).resize(width, height).toBuffer()
            : await sharp({ create: { width, height, channels: 4, background: '#050510' } }).png().toBuffer();
        const svg = await this.buildLayerTemplateSvg(template, data, width, height);

        await sharp(base)
            .composite([{ input: Buffer.from(svg) }])
            .png({ quality: 95 })
            .toFile(filePath);

        return filePath;
    }

    async buildLayerTemplateSvg(template, data, width, height) {
        const l = template.layers || {};
        const categoryLayer = l.category || {};
        const titleLayer = l.title || {};
        const summaryLayer = l.summary || {};
        const separatorLayer = l.separator || {};
        const watermarkLayer = l.watermark || {};
        const articleLayer = l.articleImage || {};
        const articleSource = articleLayer.src || articleLayer.image || articleLayer.url || data.imageUrl || '';

        const category = this.applyTextTransform(data.category || categoryLayer.text || 'GERAL', categoryLayer.textTransform || 'uppercase');
        const normalizedCategory = this.normalizeCategoryKey(category);
        const color = categoryLayer.background || template.categoryColors?.[category] ||
            template.categoryColors?.[normalizedCategory] || template.categoryColors?.GERAL || '#6c757d';

        const categoryX = this.numberValue(categoryLayer.x, 55);
        const categoryY = this.numberValue(categoryLayer.y, 1100);
        const categoryFontSize = this.numberValue(categoryLayer.fontSize, 22);
        const categoryPaddingX = this.numberValue(categoryLayer.paddingX, 24);
        const categoryHeight = this.numberValue(categoryLayer.height, 52);
        const categoryLetterSpacing = this.numberValue(categoryLayer.letterSpacing, 0);
        const categoryWidth = categoryLayer.autoWidth === false
            ? this.numberValue(categoryLayer.width, 150)
            : this.calculateBadgeWidth(category, categoryFontSize, categoryPaddingX, categoryLetterSpacing);

        const titleX = this.numberValue(titleLayer.x, 55);
        const summaryX = this.numberValue(summaryLayer.x, 55);
        const titleLines = this.wrapMultiline(data.title || '', titleLayer.maxWidth || titleLayer.width || 970, titleLayer.fontSize || 60, 4);
        const summaryLines = this.wrapMultiline(data.summary || '', summaryLayer.maxWidth || summaryLayer.width || 970, summaryLayer.fontSize || 32, 5);
        const titleText = titleLines.map((line, i) => `<tspan x="${titleX}" dy="${i === 0 ? 0 : (titleLayer.lineHeight || 72)}">${this.escapeXml(line)}</tspan>`).join('');
        const summaryText = summaryLines.map((line, i) => `<tspan x="${summaryX}" dy="${i === 0 ? 0 : (summaryLayer.lineHeight || 46)}">${this.escapeXml(line)}</tspan>`).join('');
        const articleImageSvg = articleSource
            ? await this.renderSvgImageLayer(articleLayer, articleSource, width, height, { width, height, opacity: 0.92 }, 'articleImage')
            : '';
        const overlaySvg = this.getLayerEntriesByType(l, ['overlay'])
            .map(([key, layer]) => this.renderOverlaySvg(key, layer))
            .join('');
        const floatingImageEntries = this.getLayerEntriesByType(l, ['image', 'logo'])
            .filter(([key]) => key !== 'articleImage');
        const floatingImageSvg = (await Promise.all(floatingImageEntries
            .map(([key, layer]) => this.renderSvgImageLayer(layer, layer.src || layer.image || layer.url, width, height, {}, key))))
            .join('');
        const lockedHeaderSvg = floatingImageEntries.some(([, layer]) => this.getLayerType('', layer) === 'logo')
            ? ''
            : await this.renderLockedHeaderSvg(width);

        return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <defs><style type="text/css"><![CDATA[
${this.getAileronFontFaceCss()}
          ]]></style></defs>
          ${articleImageSvg}
          ${overlaySvg}
          <g opacity="${this.opacityValue(categoryLayer.opacity, 1)}">
            <rect x="${categoryX}" y="${categoryY}" width="${categoryWidth}" height="${categoryHeight}" rx="${categoryLayer.borderRadius || categoryLayer.radius || 6}" fill="${this.escapeXmlAttr(color)}"/>
            <text x="${categoryX + categoryPaddingX}" y="${categoryY + categoryHeight / 2}" font-size="${categoryFontSize}" fill="${this.escapeXmlAttr(categoryLayer.textColor || categoryLayer.color || '#fff')}" ${this.svgTextAttrs(categoryLayer, 'bold')} dominant-baseline="central">${this.escapeXml(category)}</text>
          </g>
          <text x="${titleX}" y="${titleLayer.y || 1180}" font-size="${titleLayer.fontSize || 60}" fill="${this.escapeXmlAttr(titleLayer.color || '#fff')}" opacity="${this.opacityValue(titleLayer.opacity, 1)}" ${this.svgTextAttrs(titleLayer, 'bold')}>${titleText}</text>
          <rect x="${separatorLayer.x || 55}" y="${separatorLayer.y || ((titleLayer.y || 1180) + 80)}" width="${separatorLayer.width || 220}" height="${separatorLayer.height || 5}" fill="${this.escapeXmlAttr(separatorLayer.color || '#c11f25')}" opacity="${this.opacityValue(separatorLayer.opacity, 1)}"/>
          <text x="${summaryX}" y="${summaryLayer.y || 1400}" font-size="${summaryLayer.fontSize || 32}" fill="${this.escapeXmlAttr(summaryLayer.color || '#E0E0E0')}" opacity="${this.opacityValue(summaryLayer.opacity, 1)}" ${this.svgTextAttrs(summaryLayer, 'normal')}>${summaryText}</text>
          ${lockedHeaderSvg}
          ${floatingImageSvg}
          <text x="${watermarkLayer.x || 55}" y="${watermarkLayer.y || 1880}" font-size="${watermarkLayer.fontSize || 18}" fill="${this.escapeXmlAttr(watermarkLayer.color || '#fff')}" opacity="${this.opacityValue(watermarkLayer.opacity, 0.5)}" ${this.svgTextAttrs(watermarkLayer, 'normal')}>${this.escapeXml(watermarkLayer.text || 'URURAU.COM.BR')}</text>
        </svg>`;
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

    calculateBadgeWidth(label, fontSize, paddingX, letterSpacing = 0) {
        const text = String(label || '');
        const approximateTextWidth = text.length * Math.max(12, fontSize * 0.62);
        const trackingWidth = Math.max(0, text.length - 1) * this.numberValue(letterSpacing, 0);
        return Math.max(150, Math.ceil(approximateTextWidth + trackingWidth + paddingX * 2));
    }

    numberValue(value, fallback) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    opacityValue(value, fallback = 1) {
        const opacity = this.numberValue(value, fallback);
        return Math.max(0, Math.min(1, opacity));
    }

    async renderSvgImageLayer(layer = {}, src, canvasWidth, canvasHeight, fallback = {}, key = '') {
        if (!src) return '';
        const dataUrl = await this.imageSourceToDataUrl(src);
        const x = this.numberValue(layer.x, fallback.x || 0);
        const y = this.numberValue(layer.y, fallback.y || 0);
        const width = Math.max(1, this.numberValue(layer.width, fallback.width || canvasWidth));
        const height = Math.max(1, this.numberValue(layer.height, fallback.height || canvasHeight));
        const opacity = this.opacityValue(layer.opacity, fallback.opacity ?? 1);
        return `<image data-layer="${this.escapeXmlAttr(key)}" x="${x}" y="${y}" width="${width}" height="${height}" href="${this.escapeXmlAttr(dataUrl)}" preserveAspectRatio="xMidYMid slice" opacity="${opacity}"/>`;
    }

    renderOverlaySvg(key, layer = {}) {
        const x = this.numberValue(layer.x, 0);
        const y = this.numberValue(layer.y, 0);
        const width = Math.max(1, this.numberValue(layer.width, 1080));
        const height = Math.max(1, this.numberValue(layer.height, 1920));
        const color = layer.fill || layer.color || layer.background || '#000000';
        const radius = this.numberValue(layer.borderRadius ?? layer.radius, 0);
        const opacity = this.opacityValue(layer.opacity, 0.35);
        return `<rect data-layer="${this.escapeXmlAttr(key)}" x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${this.escapeXmlAttr(color)}" opacity="${opacity}"/>`;
    }

    async renderLockedHeaderSvg(canvasWidth) {
        const basePath = getTemplateBasePath();
        if (!existsSync(basePath)) return '';
        const headerHeight = 260;
        const metadata = await sharp(basePath).metadata();
        const sourceWidth = Math.min(metadata.width || canvasWidth, canvasWidth);
        const sourceHeight = Math.min(metadata.height || headerHeight, headerHeight);
        const buffer = await sharp(basePath)
            .extract({ left: 0, top: 0, width: sourceWidth, height: sourceHeight })
            .resize(canvasWidth, sourceHeight)
            .png()
            .toBuffer();
        const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`;
        return `<image data-layer="lockedHeader" x="0" y="0" width="${canvasWidth}" height="${sourceHeight}" href="${this.escapeXmlAttr(dataUrl)}" preserveAspectRatio="none" opacity="1"/>`;
    }

    getLayerEntriesByType(layers = {}, types = []) {
        return Object.entries(layers).filter(([key, layer]) => types.includes(this.getLayerType(key, layer)));
    }

    getLayerType(key, layer = {}) {
        if (layer.type) return layer.type;
        if (key === 'category') return 'badge';
        if (key === 'separator') return 'shapeLine';
        if (key === 'title' || key === 'summary' || key === 'watermark') return 'textBox';
        if (/overlay/i.test(key)) return 'overlay';
        if (/logo/i.test(key)) return 'logo';
        if (layer.src || layer.image || layer.url) return 'image';
        if (typeof layer.width === 'number' && typeof layer.height === 'number') return 'overlay';
        return 'textBox';
    }

    async imageSourceToDataUrl(src) {
        if (!src) return '';
        if (/^data:/i.test(src)) return src;

        let buffer;
        let mime = this.mimeFromPath(src);
        if (/^https?:\/\//i.test(src)) {
            const response = await fetch(src);
            if (!response.ok) throw new Error(`Falha ao carregar imagem da materia: HTTP ${response.status}`);
            buffer = Buffer.from(await response.arrayBuffer());
            mime = response.headers.get('content-type') || mime;
        } else {
            const imagePath = this.resolveImagePath(src);
            if (!existsSync(imagePath)) throw new Error(`Imagem nao encontrada: ${imagePath}`);
            buffer = readFileSync(imagePath);
            mime = this.mimeFromPath(imagePath);
        }

        return `data:${mime};base64,${buffer.toString('base64')}`;
    }

    resolveImagePath(src) {
        const normalized = String(src || '').replace(/\\/g, '/');
        if (isAbsolute(normalized)) return normalized;
        const relative = normalized.replace(/^\/+/, '');
        const candidates = [
            resolve(process.cwd(), relative),
            resolve(DASHBOARD_PUBLIC_DIR, relative),
            resolve(DASHBOARD_PUBLIC_DIR, relative.replace(/^assets\//, 'assets/')),
            resolve(DASHBOARD_PUBLIC_DIR, relative.replace(/^public\//, '')),
            resolve(__dirname, '../../../', relative)
        ];
        return candidates.find(candidate => existsSync(candidate)) || candidates[0];
    }

    mimeFromPath(pathValue) {
        const lower = String(pathValue || '').split('?')[0].toLowerCase();
        if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
        if (lower.endsWith('.webp')) return 'image/webp';
        if (lower.endsWith('.gif')) return 'image/gif';
        if (lower.endsWith('.svg')) return 'image/svg+xml';
        return 'image/png';
    }

    svgTextAttrs(layer = {}, fallbackWeight = 'normal') {
        const fontFamily = this.normalizeFontFamily(layer.fontFamily || 'Aileron');
        const fontWeight = this.normalizeFontWeight(layer.fontWeight || fallbackWeight || 'normal');
        const letterSpacing = this.numberValue(layer.letterSpacing, 0);
        return `font-family="${this.escapeXmlAttr(fontFamily)}" font-weight="${this.escapeXmlAttr(fontWeight)}" letter-spacing="${letterSpacing}"`;
    }

    normalizeFontFamily(value) {
        const family = String(value || 'Aileron').split(',')[0].trim();
        if (!family) return 'Aileron';
        if (/^Aileron(Regular|Bold)?$/i.test(family)) return 'Aileron';
        if (/^(Arial|Helvetica|sans-serif)$/i.test(family)) return 'Aileron';
        return family;
    }

    normalizeFontWeight(value) {
        const weight = String(value || 'normal').trim().toLowerCase();
        if (weight === '700') return 'bold';
        if (weight === '400') return 'normal';
        if (weight === 'bold' || weight === 'normal') return weight;
        return weight || 'normal';
    }

    getAileronFontFaceCss() {
        if (this.aileronFontFaceCss) return this.aileronFontFaceCss;
        const regular = this.fontDataUrl('AileronRegular.otf');
        const bold = this.fontDataUrl('AileronBold.otf');
        this.aileronFontFaceCss = `
@font-face { font-family: 'Aileron'; src: url("${regular}") format("opentype"); font-weight: 400; font-style: normal; }
@font-face { font-family: 'Aileron'; src: url("${bold}") format("opentype"); font-weight: 700; font-style: normal; }`;
        return this.aileronFontFaceCss;
    }

    fontDataUrl(fileName) {
        const fontPath = join(AILERON_FONT_DIR, fileName);
        if (!existsSync(fontPath)) {
            throw new Error(`Fonte obrigatoria ausente: ${fontPath}`);
        }
        return `data:font/otf;base64,${readFileSync(fontPath).toString('base64')}`;
    }

    applyTextTransform(value, transform = 'none') {
        const text = String(value || '');
        const normalized = this.normalizeTextTransform(transform);
        if (normalized === 'uppercase') return text.toUpperCase();
        if (normalized === 'lowercase') return text.toLowerCase();
        if (normalized === 'capitalize') {
            return text.toLowerCase().replace(/(^|\s)(\S)/g, (_, lead, letter) => lead + letter.toUpperCase());
        }
        return text;
    }

    normalizeTextTransform(value) {
        const transform = String(value || 'none').trim().toLowerCase();
        if (transform === 'uppercase' || transform === 'lowercase' || transform === 'capitalize') return transform;
        return 'none';
    }

    normalizeCategoryKey(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase();
    }

    escapeXml(v = '') { return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

    escapeXmlAttr(v = '') { return this.escapeXml(v).replace(/"/g, '&quot;'); }

    getStats() {
        return { ...this.stats };
    }
}

const generator = new ArtGenerator();
export default generator;
export { ArtGenerator };
