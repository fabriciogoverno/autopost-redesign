const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { loadTemplate } = require('./template');

const OUTPUT_DIR = path.join(__dirname, '..', 'output', 'reels');
const TEMPLATE_BASE = path.join(__dirname, '..', 'public', 'assets', 'template-base.png');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function downloadImage(url, dest) {
  const response = await axios({ url, responseType: 'stream', timeout: 10000 });
  const writer = fs.createWriteStream(dest);
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

function wrapText(text, maxCharsPerLine) {
  if (!text) return [];
  const words = text.split(' ');
  const lines = [];
  let current = '';
  words.forEach(word => {
    if ((current + ' ' + word).trim().length > maxCharsPerLine) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = (current + ' ' + word).trim();
    }
  });
  if (current) lines.push(current.trim());
  return lines;
}

function escapeXML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function generateReelsImage({ title, summary, category, imageUrl }) {
  const tpl = loadTemplate();
  const timestamp = Date.now();
  const outputPath = path.join(OUTPUT_DIR, `reels_${timestamp}.png`);
  const tempImage = path.join(OUTPUT_DIR, `temp_bg_${timestamp}.jpg`);

  const catColor = tpl.categoryColors[category?.toUpperCase()] || tpl.categoryColors['GERAL'];
  const catLabel = category?.toUpperCase() || 'GERAL';

  let bgBuffer;

  try {
    if (imageUrl) {
      await downloadImage(imageUrl, tempImage);
      bgBuffer = await sharp(tempImage)
        .resize(1080, 1920, { fit: 'cover', position: 'center' })
        .toBuffer();
      try { fs.unlinkSync(tempImage); } catch(e){}
    } else {
      if (fs.existsSync(TEMPLATE_BASE)) {
        bgBuffer = await sharp(TEMPLATE_BASE).toBuffer();
      } else {
        bgBuffer = await sharp({
          create: { width: 1080, height: 1920, channels: 4, background: { r: 5, g: 5, b: 16, alpha: 1 } }
        }).png().toBuffer();
      }
    }
  } catch (e) {
    console.error('Background error:', e.message);
    if (fs.existsSync(TEMPLATE_BASE)) {
      bgBuffer = await sharp(TEMPLATE_BASE).toBuffer();
    } else {
      bgBuffer = await sharp({
        create: { width: 1080, height: 1920, channels: 4, background: { r: 5, g: 5, b: 16, alpha: 1 } }
      }).png().toBuffer();
    }
  }

  const svgWidth = tpl.source.width;
  const svgHeight = tpl.source.height;
  const layers = tpl.layers;

  // Build SVG elements array
  const elements = [];

  // CATEGORY BADGE
  const cat = layers.category;
  const badgeWidth = Math.max(catLabel.length * 18 + cat.paddingX * 2, 150);
  elements.push(`<rect x="${cat.x}" y="${cat.y}" width="${badgeWidth}" height="${cat.height}" rx="${cat.radius}" fill="${catColor}"/>`);
  elements.push(`<text x="${cat.x + cat.paddingX}" y="${cat.y + cat.height - 14}" font-family="${cat.fontFamily}" font-size="${cat.fontSize}" font-weight="${cat.fontWeight}" fill="${cat.color}">${escapeXML(catLabel)}</text>`);

  // TITLE
  const tit = layers.title;
  const titleLines = wrapText(title, tit.maxCharsPerLine);
  let titleEndY = tit.y;
  titleLines.forEach((line, i) => {
    const y = tit.y + (i * tit.lineHeight);
    elements.push(`<text x="${tit.x}" y="${y}" font-family="${tit.fontFamily}" font-size="${tit.fontSize}" font-weight="${tit.fontWeight}" fill="${tit.color}">${escapeXML(line)}</text>`);
    titleEndY = y;
  });

  // SEPARATOR (linha decorativa)
  const sep = layers.separator;
  const sepY = titleEndY + sep.marginTopAfterTitle;
  elements.push(`<rect x="${sep.x}" y="${sepY}" width="${sep.width}" height="${sep.height}" rx="${sep.radius}" fill="${sep.color}"/>`);

  // SUMMARY
  const sum = layers.summary;
  const summaryLines = wrapText(summary, sum.maxCharsPerLine);
  let summaryStartY = sepY + sep.height + sum.marginTopAfterLine;
  summaryLines.forEach((line, i) => {
    const y = summaryStartY + (i * sum.lineHeight);
    elements.push(`<text x="${sum.x}" y="${y}" font-family="${sum.fontFamily}" font-size="${sum.fontSize}" fill="${sum.color}">${escapeXML(line)}</text>`);
  });

  // WATERMARK
  const wm = layers.watermark;
  elements.push(`<text x="${wm.x}" y="${wm.y}" font-family="${wm.fontFamily}" font-size="${wm.fontSize}" fill="${wm.color}" opacity="${wm.opacity}">${escapeXML(wm.text)}</text>`);

  let fullSVG = '';

  if (imageUrl) {
    // MODO COM IMAGEM: overlay gradiente + logo/topo + camadas dinamicas
    fullSVG = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="overlayGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#050510" stop-opacity="0"/>
          <stop offset="45%" stop-color="#050510" stop-opacity="0.1"/>
          <stop offset="55%" stop-color="#050510" stop-opacity="0.7"/>
          <stop offset="65%" stop-color="#050510" stop-opacity="0.94"/>
          <stop offset="100%" stop-color="#050510" stop-opacity="0.98"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="url(#overlayGrad)"/>

      <!-- Logo ururau topo direito -->
      <text x="700" y="58" font-family="Aileron, Arial, Helvetica, sans-serif" font-size="48" font-weight="bold" fill="#FFFFFF">ururau</text>
      <rect x="700" y="98" width="45" height="3" rx="1" fill="#FFD700"/>
      <text x="755" y="105" font-family="Aileron, Arial, Helvetica, sans-serif" font-size="18" font-weight="bold" fill="#FFD700">19 ANOS</text>
      <rect x="755" y="98" width="45" height="3" rx="1" fill="#FFD700"/>
      <circle cx="1010" cy="72" r="38" fill="#E63946"/>
      <text x="1010" y="84" font-family="Aileron, Arial, Helvetica, sans-serif" font-size="40" font-weight="bold" fill="#FFFFFF" text-anchor="middle">U</text>

      ${elements.join('\n')}
    </svg>`;
  } else {
    // MODO SEM IMAGEM: usa template base do Canva + sobrescreve camadas dinamicas
    fullSVG = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
      ${elements.join('\n')}
    </svg>`;
  }

  const svgBuffer = Buffer.from(fullSVG);

  await sharp(bgBuffer)
    .composite([{ input: svgBuffer, top: 0, left: 0 }])
    .png({ quality: 95 })
    .toFile(outputPath);

  return outputPath;
}

module.exports = { generateReelsImage };
