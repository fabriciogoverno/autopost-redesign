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
        // Ordena layers por zIndex (asc) e respeita visible !== false.
        // Cada tipo e' renderizado por seu helper especifico para SVG.
        // articleImage usa data.imageUrl como fallback se nao houver src.
        const layers = template.layers || {};
        const ordered = Object.entries(layers)
            .filter(([, layer]) => layer && layer.visible !== false)
            .map(([key, layer]) => ({
                key,
                layer,
                zIndex: typeof layer.zIndex === 'number' ? layer.zIndex : this.defaultZIndexFor(key, layer)
            }))
            .sort((a, b) => a.zIndex - b.zIndex);

        const renderedFragments = [];
        for (const { key, layer } of ordered) {
            const type = this.getLayerType(key, layer);
            let fragment = '';
            if (type === 'shape') {
                fragment = this.renderShapeSvg(key, layer);
            } else if (type === 'overlay') {
                fragment = this.renderOverlaySvg(key, layer);
            } else if (type === 'gradientOverlay') {
                fragment = this.renderGradientOverlaySvg(key, layer);
            } else if (type === 'image') {
                const src = layer.src || layer.image || layer.url || (key === 'articleImage' ? (data.imageUrl || '') : '');
                if (src) fragment = await this.renderSvgImageLayer(layer, src, width, height, { x: 0, y: 0, width, height, opacity: 1 }, key);
            } else if (type === 'logo') {
                const src = layer.src || layer.image || layer.url;
                if (src) fragment = await this.renderSvgImageLayer(layer, src, width, height, {}, key);
            } else if (type === 'lockedImage') {
                fragment = await this.renderLockedImageSvg(key, layer, width);
            } else if (type === 'badge') {
                fragment = this.renderBadgeSvg(key, layer, template, data);
            } else if (type === 'shapeLine') {
                fragment = this.renderSeparatorSvg(key, layer);
            } else if (type === 'textBox') {
                fragment = this.renderTextBoxSvg(key, layer, data);
            }
            if (fragment) renderedFragments.push(fragment);
        }

        return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <defs><style type="text/css"><![CDATA[
${this.getAileronFontFaceCss()}
          ]]></style></defs>
          ${renderedFragments.join('\n          ')}
        </svg>`;
    }

    defaultZIndexFor(key, layer) {
        const map = {
            blackBackground: 0, articleImage: 10, bottomGradient: 20,
            category: 40, title: 50, separator: 55, summary: 60,
            lockedHeader: 90, watermark: 100
        };
        if (map[key] != null) return map[key];
        const type = this.getLayerType(key, layer);
        if (type === 'shape') return 0;
        if (type === 'image') return 10;
        if (type === 'overlay' || type === 'gradientOverlay') return 20;
        if (type === 'badge') return 40;
        if (type === 'lockedImage' || type === 'logo') return 90;
        return 50;
    }

    renderShapeSvg(key, layer = {}) {
        const x = this.numberValue(layer.x, 0);
        const y = this.numberValue(layer.y, 0);
        const w = Math.max(1, this.numberValue(layer.width, 1080));
        const h = Math.max(1, this.numberValue(layer.height, 1920));
        const color = layer.color || layer.background || layer.fill || '#000000';
        const opacity = this.opacityValue(layer.opacity, 1);
        return `<rect data-layer="${this.escapeXmlAttr(key)}" x="${x}" y="${y}" width="${w}" height="${h}" fill="${this.escapeXmlAttr(color)}" opacity="${opacity}"/>`;
    }

    renderGradientOverlaySvg(key, layer = {}) {
        // Gera <defs><linearGradient/></defs> + <rect fill="url(#id)"/>
        const x = this.numberValue(layer.x, 0);
        const y = this.numberValue(layer.y, 0);
        const w = Math.max(1, this.numberValue(layer.width, 1080));
        const h = Math.max(1, this.numberValue(layer.height, 600));
        const angle = this.numberValue(layer.angle, 90);
        const opacity = this.opacityValue(layer.opacity, 1);
        const stops = Array.isArray(layer.colorStops) && layer.colorStops.length
            ? layer.colorStops.slice().sort((a, b) => (a.offset || 0) - (b.offset || 0))
            : [{ offset: 0, color: 'rgba(0,0,0,0)' }, { offset: 1, color: 'rgba(0,0,0,1)' }];

        // SVG linearGradient usa x1/y1/x2/y2 em userSpaceOnUse para suportar angulo arbitrario.
        // Convencao igual ao Konva: 0deg = horizontal->direita, 90deg = vertical->baixo.
        const rad = (angle * Math.PI) / 180;
        const cx = x + w / 2;
        const cy = y + h / 2;
        const dx = Math.cos(rad);
        const dy = Math.sin(rad);
        const half = Math.abs(dx) * (w / 2) + Math.abs(dy) * (h / 2);
        const x1 = cx - dx * half;
        const y1 = cy - dy * half;
        const x2 = cx + dx * half;
        const y2 = cy + dy * half;
        const gradId = 'grad-' + this.escapeXmlAttr(key);
        const stopsXml = stops.map(s => {
            const off = Math.max(0, Math.min(1, this.numberValue(s.offset, 0)));
            const color = String(s.color || 'rgba(0,0,0,1)');
            // Se a cor for rgba, separamos em stop-color + stop-opacity
            const rgba = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/i);
            if (rgba) {
                const r = rgba[1], g = rgba[2], b = rgba[3];
                const a = rgba[4] != null ? rgba[4] : '1';
                return `<stop offset="${off}" stop-color="rgb(${r},${g},${b})" stop-opacity="${a}"/>`;
            }
            return `<stop offset="${off}" stop-color="${this.escapeXmlAttr(color)}"/>`;
        }).join('');

        return `<defs><linearGradient id="${gradId}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stopsXml}</linearGradient></defs>
          <rect data-layer="${this.escapeXmlAttr(key)}" x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${gradId})" opacity="${opacity}"/>`;
    }

    renderBadgeSvg(key, layer, template, data) {
        const category = this.applyTextTransform(data.category || layer.text || 'GERAL', layer.textTransform || 'uppercase');
        const normalized = this.normalizeCategoryKey(category);
        // Resolve style: 1) categoryStyles[categoria atual] vence se existir
        //                2) layer.background (cor salva no template)
        //                3) categoryColors legacy
        //                4) GERAL fallback
        const styles = template.categoryStyles || {};
        const colors = template.categoryColors || {};
        const styleByCategory = styles[category] || styles[normalized];
        const background = (styleByCategory && styleByCategory.background)
            || layer.background
            || colors[category] || colors[normalized] || colors.GERAL || '#6c757d';
        const textColor = (styleByCategory && styleByCategory.textColor)
            || layer.textColor || layer.color
            || '#fff';
        const x = this.numberValue(layer.x, 55);
        const y = this.numberValue(layer.y, 1100);
        const fontSize = this.numberValue(layer.fontSize, 22);
        const paddingX = this.numberValue(layer.paddingX, 24);
        const height = this.numberValue(layer.height, 52);
        const letterSpacing = this.numberValue(layer.letterSpacing, 0);
        const width = layer.autoWidth === false
            ? this.numberValue(layer.width, 150)
            : this.calculateBadgeWidth(category, fontSize, paddingX, letterSpacing);
        const opacity = this.opacityValue(layer.opacity, 1);
        const radius = layer.borderRadius || layer.radius || 6;
        return `<g data-layer="${this.escapeXmlAttr(key)}" opacity="${opacity}">
            <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${this.escapeXmlAttr(background)}"/>
            <text x="${x + paddingX}" y="${y + height / 2}" font-size="${fontSize}" fill="${this.escapeXmlAttr(textColor)}" ${this.svgTextAttrs(layer, 'bold')} dominant-baseline="central">${this.escapeXml(category)}</text>
          </g>`;
    }

    renderSeparatorSvg(key, layer = {}) {
        const x = this.numberValue(layer.x, 55);
        const y = this.numberValue(layer.y, 1340);
        const w = this.numberValue(layer.width, 220);
        const h = this.numberValue(layer.height, 5);
        const color = layer.color || '#c11f25';
        const opacity = this.opacityValue(layer.opacity, 1);
        return `<rect data-layer="${this.escapeXmlAttr(key)}" x="${x}" y="${y}" width="${w}" height="${h}" fill="${this.escapeXmlAttr(color)}" opacity="${opacity}"/>`;
    }

    renderTextBoxSvg(key, layer, data) {
        const x = this.numberValue(layer.x, 55);
        const y = this.numberValue(layer.y, 1180);
        const fontSize = this.numberValue(layer.fontSize, 32);
        const lineHeight = this.numberValue(layer.lineHeight, fontSize * 1.2);
        const opacity = this.opacityValue(layer.opacity, 1);
        const color = layer.color || '#FFFFFF';
        const maxWidth = this.numberValue(layer.maxWidth || layer.width, 970);

        let textContent = '';
        if (key === 'title') {
            const lines = this.wrapMultiline(data.title || layer.text || '', maxWidth, fontSize, 4);
            textContent = lines.map((line, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : lineHeight}">${this.escapeXml(line)}</tspan>`).join('');
        } else if (key === 'summary') {
            const lines = this.wrapMultiline(data.summary || layer.text || '', maxWidth, fontSize, 5);
            textContent = lines.map((line, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : lineHeight}">${this.escapeXml(line)}</tspan>`).join('');
        } else if (key === 'watermark') {
            textContent = this.escapeXml(layer.text || 'URURAU.COM.BR');
        } else {
            // textBox generico (custom): respeita layer.text
            textContent = this.escapeXml(layer.text || '');
        }

        const fallbackWeight = (key === 'title' || key === 'category') ? 'bold' : 'normal';
        return `<text data-layer="${this.escapeXmlAttr(key)}" x="${x}" y="${y}" font-size="${fontSize}" fill="${this.escapeXmlAttr(color)}" opacity="${opacity}" ${this.svgTextAttrs(layer, fallbackWeight)}>${textContent}</text>`;
    }

    async renderLockedImageSvg(key, layer, canvasWidth) {
        // Para lockedHeader, mantemos o comportamento de cropped header do PNG.
        // Se o layer tem src + crop, renderizamos so a area cropada.
        const src = layer.src || layer.image || layer.url || getTemplateBasePath();
        const x = this.numberValue(layer.x, 0);
        const y = this.numberValue(layer.y, 0);
        const targetWidth = Math.max(1, this.numberValue(layer.width, canvasWidth));
        const targetHeight = Math.max(1, this.numberValue(layer.height, 260));
        const opacity = this.opacityValue(layer.opacity, 1);

        try {
            const fileSrc = /^https?:\/\//i.test(src) ? src : (src.startsWith('/') ? this.resolveImagePath(src) : src);
            // Se for absoluto/local, usamos sharp para extrair crop e converter para base64
            if (!/^https?:\/\//i.test(src)) {
                const localPath = isAbsolute(fileSrc) ? fileSrc : this.resolveImagePath(src);
                if (existsSync(localPath)) {
                    const metadata = await sharp(localPath).metadata();
                    const crop = layer.crop || { x: 0, y: 0, width: metadata.width, height: metadata.height };
                    const safeCrop = {
                        left: Math.max(0, Math.round(this.numberValue(crop.x, 0))),
                        top: Math.max(0, Math.round(this.numberValue(crop.y, 0))),
                        width: Math.min(metadata.width, Math.round(this.numberValue(crop.width, metadata.width))),
                        height: Math.min(metadata.height, Math.round(this.numberValue(crop.height, metadata.height)))
                    };
                    const extracted = await sharp(localPath)
                        .extract(safeCrop)
                        .resize(targetWidth, targetHeight)
                        .ensureAlpha()
                        .raw()
                        .toBuffer({ resolveWithObject: true });
                    const buffer = await this.blackToTransparentPng(extracted.data, extracted.info);
                    const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`;
                    return `<image data-layer="${this.escapeXmlAttr(key)}" x="${x}" y="${y}" width="${targetWidth}" height="${targetHeight}" href="${this.escapeXmlAttr(dataUrl)}" preserveAspectRatio="none" opacity="${opacity}"/>`;
                }
            }
        } catch (err) {
            // fallback: nao renderiza
        }
        // Fallback: tentar renderizar como image normal
        return await this.renderSvgImageLayer(layer, src, canvasWidth, targetHeight + y, { width: targetWidth, height: targetHeight, opacity }, key);
    }

    async blackToTransparentPng(data, info) {
        const channels = info.channels || 4;
        for (let i = 0; i < data.length; i += channels) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            if (r < 16 && g < 16 && b < 16) data[i + 3] = 0;
        }
        return sharp(data, { raw: info }).png().toBuffer();
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
        if (key === 'blackBackground') return 'shape';
        if (key === 'lockedHeader') return 'lockedImage';
        if (/gradient/i.test(key) || Array.isArray(layer.colorStops)) return 'gradientOverlay';
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
        const candidates = [];
        if (isAbsolute(normalized)) candidates.push(normalized);
        const relative = normalized.replace(/^\/+/, '');
        candidates.push(
            resolve(process.cwd(), relative),
            resolve(DASHBOARD_PUBLIC_DIR, relative),
            resolve(DASHBOARD_PUBLIC_DIR, relative.replace(/^assets\//, 'assets/')),
            resolve(DASHBOARD_PUBLIC_DIR, relative.replace(/^public\//, '')),
            resolve(__dirname, '../../../', relative)
        );
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
        if (weight === '700' || weight === 'bold') return '700';
        if (weight === '400' || weight === 'normal') return '400';
        return weight || '400';
    }

    getAileronFontFaceCss() {
        if (this.aileronFontFaceCss) return this.aileronFontFaceCss;
        const regular = this.fontDataUrl('AileronRegular.otf');
        const bold = this.fontDataUrl('AileronBold.otf');
        this.aileronFontFaceCss = `
@font-face { font-family: 'Aileron'; src: url("${regular}") format("opentype"); font-weight: 400; font-style: normal; font-display: block; }
@font-face { font-family: 'Aileron'; src: url("${bold}") format("opentype"); font-weight: 700; font-style: normal; font-display: block; }`;
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
