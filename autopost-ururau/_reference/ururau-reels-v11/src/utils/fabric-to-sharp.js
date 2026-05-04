/**
 * fabric-to-sharp.js
 * Converte JSON do Fabric.js em SVG, depois renderiza com Sharp
 * Mantém Sharp como renderizador final de alta qualidade
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

class FabricToSharp {
    constructor(options = {}) {
        this.width = options.width || 1080;
        this.height = options.height || 1920;
        this.templateBase = options.templateBase || path.join(process.cwd(), 'public', 'assets', 'template-base.png');
    }

    /**
     * Renderiza JSON Fabric.js → PNG via SVG intermediário
     */
    async render(fabricJSON, outputPath) {
        // 1. Gera SVG a partir do JSON
        const svg = this.fabricJSONToSVG(fabricJSON);

        // 2. Renderiza SVG com Sharp
        const svgBuffer = Buffer.from(svg, 'utf-8');

        // 3. Carrega template base
        let baseImage;
        try {
            baseImage = await sharp(this.templateBase)
                .resize(this.width, this.height, { fit: 'fill' })
                .toBuffer();
        } catch (err) {
            // Se template-base não existir, cria canvas preto
            baseImage = await sharp({
                create: {
                    width: this.width,
                    height: this.height,
                    channels: 4,
                    background: { r: 0, g: 0, b: 0, alpha: 1 }
                }
            }).png().toBuffer();
        }

        // 4. Composita SVG sobre template base
        const result = await sharp(baseImage)
            .composite([{
                input: svgBuffer,
                top: 0,
                left: 0
            }])
            .png({ quality: 95 })
            .toFile(outputPath);

        return outputPath;
    }

    /**
     * Converte JSON Fabric.js em SVG string
     */
    fabricJSONToSVG(json) {
        const objects = json.objects || [];

        let svgElements = '';

        // Ordena por z-index (ordem do array = ordem de renderização)
        objects.forEach(obj => {
            const el = this.objectToSVG(obj);
            if (el) svgElements += el;
        });

        return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}">
    <defs>
        <filter id="dropshadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="0" flood-color="#000"/>
        </filter>
    </defs>
    ${svgElements}
</svg>`;
    }

    objectToSVG(obj) {
        if (!obj.visible) return '';

        const transform = this.buildTransform(obj);
        const style = this.buildStyle(obj);
        const shadow = this.buildShadow(obj);

        let element = '';

        switch(obj.type) {
            case 'rect':
                element = `<rect x="${-obj.width/2}" y="${-obj.height/2}" 
                    width="${obj.width}" height="${obj.height}" 
                    rx="${obj.rx || 0}" ry="${obj.ry || 0}"
                    transform="${transform}" style="${style}" ${shadow}/>`;
                break;

            case 'circle':
                element = `<circle cx="0" cy="0" r="${obj.radius}"
                    transform="${transform}" style="${style}" ${shadow}/>`;
                break;

            case 'image':
                // Para imagens, precisamos do src. Se for base64, usamos direto.
                // Se for URL, precisamos carregar. No SVG, usamos xlink:href.
                const src = obj.src || '';
                if (src) {
                    element = `<image x="${-obj.width*obj.scaleX/2}" y="${-obj.height*obj.scaleY/2}" 
                        width="${obj.width*obj.scaleX}" height="${obj.height*obj.scaleY}"
                        xlink:href="${this.escapeXml(src)}"
                        transform="${transform}" style="${style}" ${shadow}/>`;
                }
                break;

            case 'text':
            case 'i-text':
            case 'textbox':
                const text = this.escapeXml(obj.text || '');
                const lines = text.split('\n');
                const lineHeight = (obj.fontSize || 40) * (obj.lineHeight || 1.16);
                const startY = -(lines.length - 1) * lineHeight / 2;

                if (lines.length === 1) {
                    element = `<text x="0" y="0" 
                        text-anchor="${this.mapTextAlign(obj.textAlign)}" 
                        dominant-baseline="middle"
                        transform="${transform}" style="${style}; font-family: ${obj.fontFamily || 'Arial'}; font-size: ${obj.fontSize || 40}px; font-weight: ${obj.fontWeight || 'normal'};"
                        ${shadow}>${text}</text>`;
                } else {
                    // Multi-line: usar tspan
                    let tspans = '';
                    lines.forEach((line, i) => {
                        const y = startY + i * lineHeight;
                        tspans += `<tspan x="0" dy="${i === 0 ? startY : lineHeight}">${this.escapeXml(line)}</tspan>`;
                    });
                    element = `<text text-anchor="${this.mapTextAlign(obj.textAlign)}"
                        transform="${transform}" style="${style}; font-family: ${obj.fontFamily || 'Arial'}; font-size: ${obj.fontSize || 40}px; font-weight: ${obj.fontWeight || 'normal'};"
                        ${shadow}>${tspans}</text>`;
                }
                break;

            case 'group':
                // Grupo: aplica transform no <g> e renderiza filhos
                let children = '';
                if (obj.objects) {
                    obj.objects.forEach(child => {
                        const childSVG = this.objectToSVG(child);
                        if (childSVG) children += childSVG;
                    });
                }
                element = `<g transform="${transform}" style="${style}" ${shadow}>${children}</g>`;
                break;

            case 'path':
                if (obj.path) {
                    const d = this.pathToSVG(obj.path);
                    element = `<path d="${d}" transform="${transform}" style="${style}" ${shadow}/>`;
                }
                break;

            case 'line':
                element = `<line x1="${obj.x1}" y1="${obj.y1}" x2="${obj.x2}" y2="${obj.y2}"
                    transform="${transform}" style="${style}" ${shadow}/>`;
                break;

            case 'polygon':
                if (obj.points) {
                    const points = obj.points.map(p => `${p.x},${p.y}`).join(' ');
                    element = `<polygon points="${points}" transform="${transform}" style="${style}" ${shadow}/>`;
                }
                break;

            default:
                // Tipo não suportado — ignora silenciosamente
                break;
        }

        return element;
    }

    buildTransform(obj) {
        const parts = [];

        // Posição
        const x = obj.left || 0;
        const y = obj.top || 0;

        // Origem (Fabric.js usa originX/originY)
        const originX = obj.originX || 'center';
        const originY = obj.originY || 'center';

        // Calcula offset de origem
        let offsetX = 0, offsetY = 0;
        if (originX === 'center') offsetX = 0;
        else if (originX === 'left') offsetX = (obj.width * (obj.scaleX || 1)) / 2;
        else if (originX === 'right') offsetX = -(obj.width * (obj.scaleX || 1)) / 2;

        if (originY === 'center') offsetY = 0;
        else if (originY === 'top') offsetY = (obj.height * (obj.scaleY || 1)) / 2;
        else if (originY === 'bottom') offsetY = -(obj.height * (obj.scaleY || 1)) / 2;

        // Ordem de transformação: translate → rotate → scale
        parts.push(`translate(${x + offsetX}, ${y + offsetY})`);

        if (obj.angle) {
            parts.push(`rotate(${obj.angle})`);
        }

        if (obj.scaleX !== 1 || obj.scaleY !== 1) {
            parts.push(`scale(${obj.scaleX || 1}, ${obj.scaleY || 1})`);
        }

        // Flip
        if (obj.flipX) {
            parts.push('scale(-1, 1)');
        }
        if (obj.flipY) {
            parts.push('scale(1, -1)');
        }

        return parts.join(' ');
    }

    buildStyle(obj) {
        const styles = [];

        if (obj.fill && obj.fill !== 'transparent') {
            styles.push(`fill: ${obj.fill}`);
        } else {
            styles.push('fill: none');
        }

        if (obj.stroke && obj.stroke !== 'transparent' && obj.strokeWidth > 0) {
            styles.push(`stroke: ${obj.stroke}`);
            styles.push(`stroke-width: ${obj.strokeWidth}`);
        }

        if (obj.opacity !== undefined && obj.opacity !== 1) {
            styles.push(`opacity: ${obj.opacity}`);
        }

        return styles.join('; ');
    }

    buildShadow(obj) {
        if (!obj.shadow) return '';

        let shadow = obj.shadow;
        if (typeof shadow === 'string') {
            // Parse string shadow do Fabric.js: "rgba(0,0,0,0.3) 5px 5px 10px"
            const match = shadow.match(/rgba?\([^)]+\)\s+(-?\d+)px\s+(-?\d+)px\s+(\d+)px/);
            if (match) {
                return `filter="drop-shadow(${match[1]}px ${match[2]}px ${match[3]}px ${match[0].split(')')[0]})"`;
            }
            return '';
        }

        // Objeto shadow
        const color = shadow.color || '#000000';
        const blur = shadow.blur || 0;
        const offsetX = shadow.offsetX || 0;
        const offsetY = shadow.offsetY || 0;

        if (blur === 0 && offsetX === 0 && offsetY === 0) return '';

        return `filter="drop-shadow(${offsetX}px ${offsetY}px ${blur/2}px ${color})"`;
    }

    mapTextAlign(align) {
        const map = { left: 'start', center: 'middle', right: 'end', justify: 'start' };
        return map[align] || 'start';
    }

    escapeXml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    pathToSVG(path) {
        if (!path || !Array.isArray(path)) return '';
        return path.map(cmd => cmd.join(' ')).join(' ');
    }
}

module.exports = FabricToSharp;
