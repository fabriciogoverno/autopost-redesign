/**
 * Editor visual Konva — Ururau Reels
 *
 * Sistema real de camadas: cada layer tem id, type, x, y, width, height,
 * opacity, visible, locked, deletable, zIndex. A ordem visual no Konva e
 * no preview real (backend) e' determinada pelo zIndex.
 *
 * Stack canonico (zIndex padrao):
 *    0  blackBackground   (fundo preto solido — locked, nao deletavel)
 *   10  articleImage      (imagem da materia)
 *   20  bottomGradient    (overlay/gradiente sobre a imagem)
 *   40  category          (badge da editoria)
 *   50  title
 *   55  separator
 *   60  summary
 *   90  lockedHeader      (logo + 19 ANOS + icone U — extraido do PNG base)
 *  100  watermark
 *
 * UI de camadas: subir/descer, frente/tras, ocultar, bloquear, apagar.
 */

(function () {
  'use strict';

  let stage = null;
  let layer = null;
  let templateData = null;
  let konvaElements = {};        // key -> Konva node
  let layerMeta = {};            // key -> { id, type, zIndex, visible, locked, deletable, label }
  let selectedElement = null;
  let undoStack = [];
  let currentScale = 0.45;
  let transformer = null;        // Konva.Transformer global, anexado ao layer

  const CANVAS_WIDTH = 1080;
  const CANVAS_HEIGHT = 1920;
  const MIN_BADGE_WIDTH = 150;
  const SEPARATOR_HIT_HEIGHT = 34;
  const DEFAULT_FONT_FAMILY = 'Aileron';
  const REQUIRED_AILERON_FONT_QUERIES = [
    '400 24px Aileron',
    '700 24px Aileron'
  ];
  const TEMPLATE_BASE_URL = '/assets/template-base.png';

  const FALLBACK_CATEGORY_COLORS = {
    OPINIAO: '#e63946', POLITICA: '#1d3557', ESPORTE: '#2a9d8f',
    SEGURANCA: '#e9c46a', ECONOMIA: '#f4a261', GERAL: '#6c757d'
  };

  const DEFAULT_PREVIEW = {
    category: 'GERAL',
    title: 'Titulo de teste do template',
    summary: 'Subtitulo de teste para voce verificar posicoes.'
  };

  // zIndex padrao por chave (usado se a config nao trouxer zIndex)
  const DEFAULT_Z_INDEX = {
    blackBackground: 0,
    articleImage: 10,
    bottomGradient: 20,
    category: 40,
    title: 50,
    separator: 55,
    summary: 60,
    lockedHeader: 90,
    watermark: 100
  };

  // Tipo padrao por chave (usado se a config nao trouxer type)
  const DEFAULT_TYPES = {
    blackBackground: 'shape',
    articleImage: 'image',
    bottomGradient: 'gradientOverlay',
    category: 'badge',
    title: 'textBox',
    summary: 'textBox',
    watermark: 'textBox',
    separator: 'shapeLine',
    lockedHeader: 'lockedImage'
  };

  const DEFAULT_LABELS = {
    blackBackground: 'Fundo Preto',
    articleImage: 'Imagem da Materia',
    bottomGradient: 'Gradiente Inferior',
    category: 'Badge Categoria',
    title: 'Titulo',
    separator: 'Linha Decorativa',
    summary: 'Subtitulo',
    watermark: 'Watermark',
    lockedHeader: 'Cabecalho (logo + 19 anos + U)'
  };

  const FORCED_LOCKED_KEYS = new Set(['blackBackground', 'lockedHeader']);
  const FORCED_NON_DELETABLE = new Set(['blackBackground', 'lockedHeader', 'category', 'title', 'separator', 'summary', 'watermark']);

  // ============================================================
  // STATUS
  // ============================================================
  function showStatus(message, type) {
    const banner = document.getElementById('statusBanner');
    if (!banner) return;
    banner.textContent = message;
    banner.className = 'status-banner ' + (type || 'info');
    if (type !== 'error') {
      setTimeout(function () { banner.style.display = 'none'; }, 3500);
    }
  }

  function showStatusLink(message, url, type) {
    const banner = document.getElementById('statusBanner');
    if (!banner) return;
    banner.textContent = '';
    banner.className = 'status-banner ' + (type || 'info');
    banner.style.display = 'block';
    const span = document.createElement('span');
    span.textContent = message + ' ';
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Abrir preview';
    link.style.color = 'inherit';
    link.style.textDecoration = 'underline';
    banner.appendChild(span);
    banner.appendChild(link);
  }

  // ============================================================
  // INIT
  // ============================================================
  async function initEditor() {
    try {
      const res = await fetch('/api/template');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      templateData = await res.json();
    } catch (err) {
      showStatus('Erro ao carregar template. Backend (porta 3001) esta rodando?', 'error');
      return;
    }

    if (!templateData || !templateData.layers) {
      showStatus('Template invalido: campo "layers" ausente.', 'error');
      return;
    }

    await waitForTemplateFonts();

    stage = new Konva.Stage({
      container: 'konva-container',
      width: CANVAS_WIDTH * currentScale,
      height: CANVAS_HEIGHT * currentScale,
      scaleX: currentScale,
      scaleY: currentScale
    });

    layer = new Konva.Layer();
    stage.add(layer);

    // Transformer global para resize/rotate de elementos editaveis
    transformer = new Konva.Transformer({
      anchorSize: 14,
      anchorStroke: '#E63946',
      anchorFill: '#ffffff',
      borderStroke: '#E63946',
      borderDash: [6, 4],
      keepRatio: false,
      rotateEnabled: true,
      ignoreStroke: true,
      enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']
    });
    transformer.on('transformend', function () {
      if (!selectedElement) return;
      const node = konvaElements[selectedElement];
      if (!node) return;
      // Aplica scale na width/height e zera scale para manter coords limpos
      applyTransformerScaleToSize(node);
      saveUndo();
      updatePropertiesPanel(selectedElement);
      updateElementList();
      refreshSelectionIndicator();
    });
    layer.add(transformer);

    await createAllLayers();
    applyZIndexOrder();
    layer.draw();
    updateElementList();
    setupKeyboard();
    setupArticleImport();

    stage.on('click tap', function (e) {
      // Click no fundo preto ou stage = desselecionar
      const target = e.target;
      const targetKey = target ? target.id() || target.name() : '';
      if (e.target === stage || targetKey === 'blackBackground' || target === layer) {
        deselectAll();
      }
    });

    const scaleSlider = document.getElementById('scaleSlider');
    if (scaleSlider) {
      scaleSlider.addEventListener('input', function (e) {
        currentScale = parseFloat(e.target.value);
        applyStageScale();
        document.getElementById('scaleValue').textContent = Math.round(currentScale * 100) + '%';
      });
    }

    bindToolbarButtons();
  }

  // ============================================================
  // CRIACAO DAS CAMADAS
  // ============================================================
  async function createAllLayers() {
    const layers = templateData.layers || {};

    // Garante presenca das camadas obrigatorias mesmo se o JSON antigo nao tiver
    ensureLayer('blackBackground', { type: 'shape', x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT, color: '#000000', opacity: 1, visible: true, locked: true, deletable: false, zIndex: 0 });
    ensureLayer('articleImage', { type: 'image', x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT, src: '', fitMode: 'cover', objectFit: 'cover', opacity: 1, visible: true, locked: false, deletable: true, zIndex: 10 });
    ensureLayer('lockedHeader', { type: 'lockedImage', x: 0, y: 0, width: CANVAS_WIDTH, height: 260, src: TEMPLATE_BASE_URL, crop: { x: 0, y: 0, width: CANVAS_WIDTH, height: 260 }, opacity: 1, visible: true, locked: true, deletable: false, zIndex: 90 });

    // Cria cada layer no Konva. Aguarda imagens.
    const keys = Object.keys(templateData.layers);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const config = templateData.layers[key];
      const meta = readMeta(key, config);
      layerMeta[key] = meta;
      await createKonvaForLayer(key, config, meta);
    }
  }

  function ensureLayer(key, defaults) {
    if (!templateData.layers[key]) {
      templateData.layers[key] = { id: key, label: DEFAULT_LABELS[key] || key, ...defaults };
    } else {
      const cur = templateData.layers[key];
      Object.keys(defaults).forEach(function (k) {
        if (cur[k] === undefined) cur[k] = defaults[k];
      });
      if (!cur.id) cur.id = key;
      if (!cur.label) cur.label = DEFAULT_LABELS[key] || key;
    }
  }

  function readMeta(key, config) {
    return {
      id: config.id || key,
      key: key,
      type: config.type || DEFAULT_TYPES[key] || 'textBox',
      label: config.label || DEFAULT_LABELS[key] || key,
      zIndex: typeof config.zIndex === 'number' ? config.zIndex : (DEFAULT_Z_INDEX[key] != null ? DEFAULT_Z_INDEX[key] : 50),
      visible: config.visible !== false,
      locked: FORCED_LOCKED_KEYS.has(key) ? true : !!config.locked,
      deletable: FORCED_NON_DELETABLE.has(key) ? false : (config.deletable !== false)
    };
  }

  async function createKonvaForLayer(key, config, meta) {
    const type = meta.type;
    if (type === 'shape') return createShape(key, config, meta);
    if (type === 'image') return createImage(key, config, meta);
    if (type === 'lockedImage') return createLockedImage(key, config, meta);
    if (type === 'overlay') return createOverlay(key, config, meta);
    if (type === 'gradientOverlay') return createGradientOverlay(key, config, meta);
    if (type === 'badge') return createBadge(key, config, meta);
    if (type === 'shapeLine') return createShapeLine(key, config, meta);
    if (type === 'textBox') return createTextBox(key, config, meta);
    if (type === 'logo') return createImage(key, config, meta);
    return createTextBox(key, config, meta);
  }

  function createShape(key, config, meta) {
    const node = new Konva.Rect({
      x: numOr(config.x, 0),
      y: numOr(config.y, 0),
      width: Math.max(1, numOr(config.width, CANVAS_WIDTH)),
      height: Math.max(1, numOr(config.height, CANVAS_HEIGHT)),
      fill: config.color || config.background || '#000000',
      opacity: clamp01(numOr(config.opacity, 1)),
      visible: meta.visible,
      draggable: !meta.locked,
      listening: !meta.locked,
      name: key,
      id: key
    });
    node.setAttr('componentType', 'shape');
    setupElementEvents(node, key);
    layer.add(node);
    konvaElements[key] = node;
  }

  function createImage(key, config, meta) {
    return new Promise(function (resolve) {
      const placeholder = new Konva.Rect({
        x: numOr(config.x, 0),
        y: numOr(config.y, 0),
        width: Math.max(1, numOr(config.width, CANVAS_WIDTH)),
        height: Math.max(1, numOr(config.height, CANVAS_HEIGHT)),
        fill: 'rgba(255,255,255,0.04)',
        stroke: 'rgba(255,255,255,0.25)',
        dash: [10, 8],
        opacity: clamp01(numOr(config.opacity, 1)),
        visible: meta.visible,
        draggable: !meta.locked,
        listening: !meta.locked,
        name: key,
        id: key
      });
      placeholder.setAttr('componentType', 'image');
      setupElementEvents(placeholder, key);
      layer.add(placeholder);
      konvaElements[key] = placeholder;

      const src = config.src || config.image || config.url;
      if (!src) { resolve(); return; }

      loadImageNode(key, src, config, meta).then(resolve).catch(function () { resolve(); });
    });
  }

  function createLockedImage(key, config, meta) {
    return new Promise(function (resolve) {
      const src = config.src || TEMPLATE_BASE_URL;
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = function () {
        const node = new Konva.Image({
          x: numOr(config.x, 0),
          y: numOr(config.y, 0),
          width: Math.max(1, numOr(config.width, CANVAS_WIDTH)),
          height: Math.max(1, numOr(config.height, 260)),
          image: key === 'lockedHeader' ? makeBlackTransparentImage(image, config.crop) : image,
          opacity: clamp01(numOr(config.opacity, 1)),
          visible: meta.visible,
          draggable: false,
          listening: false,
          name: key,
          id: key
        });
        node.setAttr('componentType', 'lockedImage');
        if (config.crop && key !== 'lockedHeader') {
          node.crop({
            x: numOr(config.crop.x, 0),
            y: numOr(config.crop.y, 0),
            width: numOr(config.crop.width, image.naturalWidth || node.width()),
            height: numOr(config.crop.height, image.naturalHeight || node.height())
          });
        }
        node.setAttr('src', src);
        layer.add(node);
        konvaElements[key] = node;
        resolve();
      };
      image.onerror = function () {
        // sem cabecalho — tudo bem, apenas nao renderiza
        showStatus('Cabecalho ' + key + ' nao pode ser carregado de ' + src, 'info');
        resolve();
      };
      image.src = src;
    });
  }

  function loadImageNode(key, src, config, meta) {
    return new Promise(function (resolve, reject) {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      const onLoaded = function () {
        const placeholder = konvaElements[key];
        const node = new Konva.Image({
          x: placeholder ? placeholder.x() : numOr(config.x, 0),
          y: placeholder ? placeholder.y() : numOr(config.y, 0),
          width: placeholder ? placeholder.width() : numOr(config.width, CANVAS_WIDTH),
          height: placeholder ? placeholder.height() : numOr(config.height, CANVAS_HEIGHT),
          image: image,
          opacity: placeholder ? placeholder.opacity() : clamp01(numOr(config.opacity, 1)),
          visible: meta.visible,
          draggable: !meta.locked,
          listening: !meta.locked,
          name: key,
          id: key
        });
        node.setAttr('componentType', 'image');
        node.setAttr('src', src);
        applyImageCoverCrop(node, image);
        if (placeholder) placeholder.destroy();
        setupElementEvents(node, key);
        layer.add(node);
        konvaElements[key] = node;
        applyZIndexOrder();
        layer.draw();
        resolve();
      };
      const onError = function () {
        if (image.crossOrigin) {
          image.crossOrigin = null;
          image.src = src;
          return;
        }
        reject(new Error('Falha ao carregar ' + src));
      };
      image.onload = onLoaded;
      image.onerror = onError;
      image.src = src;
    });
  }

  function createOverlay(key, config, meta) {
    const node = new Konva.Rect({
      x: numOr(config.x, 0),
      y: numOr(config.y, 0),
      width: Math.max(1, numOr(config.width, CANVAS_WIDTH)),
      height: Math.max(1, numOr(config.height, 600)),
      fill: config.color || config.background || config.fill || '#050510',
      opacity: clamp01(numOr(config.opacity, 0.85)),
      cornerRadius: numOr(config.borderRadius != null ? config.borderRadius : config.radius, 0),
      visible: meta.visible,
      draggable: !meta.locked,
      listening: !meta.locked,
      name: key,
      id: key
    });
    node.setAttr('componentType', 'overlay');
    setupElementEvents(node, key);
    layer.add(node);
    konvaElements[key] = node;
  }

  function createGradientOverlay(key, config, meta) {
    const x = numOr(config.x, 0);
    const y = numOr(config.y, 0);
    const w = Math.max(1, numOr(config.width, CANVAS_WIDTH));
    const h = Math.max(1, numOr(config.height, 600));
    const angle = numOr(config.angle, 90);  // graus, 0=horizontal->direita, 90=vertical->baixo
    const stops = normalizeColorStops(config.colorStops);

    const gradientPoints = anglePointsForRect(angle, w, h);
    const node = new Konva.Rect({
      x: x, y: y,
      width: w, height: h,
      fillLinearGradientStartPoint: gradientPoints.start,
      fillLinearGradientEndPoint: gradientPoints.end,
      fillLinearGradientColorStops: stopsToKonva(stops),
      opacity: clamp01(numOr(config.opacity, 1)),
      rotation: numOr(config.rotation, 0),
      visible: meta.visible,
      draggable: !meta.locked,
      listening: !meta.locked,
      name: key,
      id: key
    });
    node.setAttr('componentType', 'gradientOverlay');
    node.setAttr('angle', angle);
    node.setAttr('colorStops', stops);
    setupElementEvents(node, key);
    layer.add(node);
    konvaElements[key] = node;
  }

  function normalizeColorStops(stops) {
    const arr = Array.isArray(stops) && stops.length ? stops : [
      { offset: 0, color: 'rgba(0,0,0,0)' },
      { offset: 1, color: 'rgba(0,0,0,1)' }
    ];
    return arr.map(function (s) {
      return { offset: clamp01(numOr(s.offset, 0)), color: String(s.color || 'rgba(0,0,0,1)') };
    }).sort(function (a, b) { return a.offset - b.offset; });
  }

  // Konva exige array plano [offset, color, offset, color, ...]
  function stopsToKonva(stops) {
    const out = [];
    stops.forEach(function (s) { out.push(s.offset, s.color); });
    return out;
  }

  // Calcula dois pontos (start, end) dentro do retangulo dado um angulo em graus
  // Convencao: 0deg = esquerda->direita; 90deg = topo->base; 180 = direita->esquerda
  function anglePointsForRect(angleDeg, w, h) {
    const rad = (angleDeg * Math.PI) / 180;
    const cx = w / 2, cy = h / 2;
    const dx = Math.cos(rad), dy = Math.sin(rad);
    // Tamanho da projecao dentro da caixa
    const half = Math.abs(dx) * (w / 2) + Math.abs(dy) * (h / 2);
    return {
      start: { x: cx - dx * half, y: cy - dy * half },
      end:   { x: cx + dx * half, y: cy + dy * half }
    };
  }

  function applyGradientUpdate(node) {
    const w = node.width();
    const h = node.height();
    const angle = numOr(node.getAttr('angle'), 90);
    const stops = node.getAttr('colorStops') || [];
    const pts = anglePointsForRect(angle, w, h);
    node.fillLinearGradientStartPoint(pts.start);
    node.fillLinearGradientEndPoint(pts.end);
    node.fillLinearGradientColorStops(stopsToKonva(stops));
  }

  function createBadge(key, config, meta) {
    const cat = config;
    const catLabel = formatCategoryLabel(cat.text || (templateData.defaults && templateData.defaults.category) || DEFAULT_PREVIEW.category, cat);
    const fontSize = numOr(cat.fontSize, 22);
    const paddingX = numOr(cat.paddingX, 24);
    const paddingY = numOr(cat.paddingY, 14);
    const autoWidth = cat.autoWidth !== false;
    const badgeHeight = Math.max(1, numOr(cat.height, fontSize + paddingY * 2));
    // Resolve cor do badge: 1) cat.background explicito 2) categoryStyles 3) fallback
    const resolvedStyle = resolveCategoryStyle(catLabel);
    const badgeColor = isHexColor(cat.background) ? cat.background : resolvedStyle.background;
    const textColor = cat.textColor || cat.color || resolvedStyle.textColor || '#FFFFFF';

    const group = new Konva.Group({
      x: numOr(cat.x, 67), y: numOr(cat.y, 1174),
      draggable: !meta.locked,
      listening: !meta.locked,
      visible: meta.visible,
      opacity: clamp01(numOr(cat.opacity, 1)),
      name: key,
      id: key
    });
    group.setAttr('componentType', 'badge');
    group.setAttr('autoWidth', autoWidth);
    group.setAttr('paddingX', paddingX);
    group.setAttr('paddingY', paddingY);
    group.setAttr('borderRadius', numOr(cat.borderRadius != null ? cat.borderRadius : cat.radius, 6));
    group.setAttr('fontFamily', normalizeFontFamily(cat.fontFamily));
    group.setAttr('fontWeight', normalizeFontWeight(cat.fontWeight, 'bold'));
    group.setAttr('letterSpacing', numOr(cat.letterSpacing, 0));
    group.setAttr('textTransform', normalizeTextTransform(cat.textTransform));

    const initialWidth = autoWidth
      ? Math.max(MIN_BADGE_WIDTH, calculateBadgeWidth(catLabel, fontSize, paddingX, numOr(cat.letterSpacing, 0)))
      : Math.max(1, numOr(cat.width, MIN_BADGE_WIDTH));

    const hit = new Konva.Rect({
      width: initialWidth, height: badgeHeight,
      fill: 'rgba(0,0,0,0)',
      name: 'badge-hit'
    });
    const bg = new Konva.Rect({
      width: initialWidth, height: badgeHeight,
      fill: badgeColor,
      cornerRadius: numOr(cat.borderRadius != null ? cat.borderRadius : cat.radius, 6),
      name: 'badge-bg'
    });
    const text = new Konva.Text({
      x: paddingX,
      y: (badgeHeight - fontSize) / 2 + 2,
      text: catLabel,
      fontSize: fontSize,
      fontFamily: normalizeFontFamily(cat.fontFamily),
      fontStyle: normalizeFontWeight(cat.fontWeight, 'bold'),
      letterSpacing: numOr(cat.letterSpacing, 0),
      fill: textColor,
      name: 'badge-text'
    });

    group.add(hit);
    group.add(bg);
    group.add(text);
    resizeBadgeToText(group);
    setupElementEvents(group, key);
    layer.add(group);
    konvaElements[key] = group;
  }

  function createShapeLine(key, config, meta) {
    const sep = config;
    const w = numOr(sep.width, 220);
    const h = numOr(sep.height, 5);
    const hitH = Math.max(SEPARATOR_HIT_HEIGHT, h);

    const group = new Konva.Group({
      x: numOr(sep.x, 75),
      y: numOr(sep.y, 1624),
      width: w,
      height: hitH,
      draggable: !meta.locked,
      listening: !meta.locked,
      visible: meta.visible,
      opacity: clamp01(numOr(sep.opacity, 1)),
      name: key,
      id: key
    });
    group.setAttr('componentType', 'shapeLine');

    const hit = new Konva.Rect({
      x: 0,
      y: -Math.round((hitH - h) / 2),
      width: w, height: hitH,
      fill: 'rgba(0,0,0,0)',
      name: 'separator-hit'
    });
    const visible = new Konva.Rect({
      x: 0, y: 0,
      width: w, height: h,
      fill: sep.color || '#c11f25',
      cornerRadius: numOr(sep.radius, 2),
      name: 'separator-visible'
    });
    group.add(hit);
    group.add(visible);
    setupElementEvents(group, key);
    layer.add(group);
    konvaElements[key] = group;
  }

  function createTextBox(key, config, meta) {
    const defaultText = key === 'title' ? (templateData.defaults?.title || DEFAULT_PREVIEW.title)
      : key === 'summary' ? (templateData.defaults?.summary || DEFAULT_PREVIEW.summary)
      : (config.text || '');
    const node = new Konva.Text({
      x: numOr(config.x, 55),
      y: numOr(config.y, 1180),
      text: defaultText,
      fontSize: numOr(config.fontSize, 32),
      fontFamily: normalizeFontFamily(config.fontFamily),
      fontStyle: normalizeFontWeight(config.fontWeight, key === 'title' || key === 'category' ? 'bold' : 'normal'),
      fill: config.color || '#FFFFFF',
      width: numOr(config.maxWidth || config.width, 970),
      lineHeight: getKonvaLineHeight(config),
      opacity: clamp01(numOr(config.opacity, 1)),
      visible: meta.visible,
      draggable: !meta.locked,
      listening: !meta.locked,
      name: key,
      id: key
    });
    node.setAttr('componentType', 'textBox');
    setupElementEvents(node, key);
    layer.add(node);
    konvaElements[key] = node;
  }

  // ============================================================
  // ZINDEX / ORDEM
  // ============================================================
  function applyZIndexOrder() {
    if (!layer) return;
    const sorted = Object.keys(konvaElements)
      .map(function (k) { return { k: k, z: layerMeta[k] ? layerMeta[k].zIndex : 50 }; })
      .sort(function (a, b) { return a.z - b.z; });

    sorted.forEach(function (entry, i) {
      const node = konvaElements[entry.k];
      if (!node) return;
      // Konva: indice 0 = mais embaixo. Iteramos do menor zIndex para o maior
      // e usamos zIndex(i) para colocar nessa posicao.
      try { node.zIndex(i); } catch (e) { /* ignore */ }
    });

    // selection-indicator e transformer sempre no topo
    const indicators = layer.find('.selection-indicator');
    indicators.forEach(function (ind) { ind.moveToTop(); });
    if (transformer) transformer.moveToTop();
  }

  function moveLayerBy(key, delta) {
    if (!layerMeta[key]) return;
    const ordered = Object.keys(layerMeta)
      .filter(function (k) { return konvaElements[k]; })
      .sort(function (a, b) { return layerMeta[a].zIndex - layerMeta[b].zIndex; });
    const idx = ordered.indexOf(key);
    const newIdx = idx + delta;
    if (newIdx < 0 || newIdx >= ordered.length) return;
    const swapWith = ordered[newIdx];
    const tmp = layerMeta[key].zIndex;
    layerMeta[key].zIndex = layerMeta[swapWith].zIndex;
    layerMeta[swapWith].zIndex = tmp;
    if (templateData.layers[key]) templateData.layers[key].zIndex = layerMeta[key].zIndex;
    if (templateData.layers[swapWith]) templateData.layers[swapWith].zIndex = layerMeta[swapWith].zIndex;
    applyZIndexOrder();
    layer.draw();
    updateElementList();
    refreshSelectionIndicator();
  }

  function moveLayerToFront(key) {
    if (!layerMeta[key]) return;
    let max = -Infinity;
    Object.keys(layerMeta).forEach(function (k) { if (layerMeta[k].zIndex > max) max = layerMeta[k].zIndex; });
    layerMeta[key].zIndex = max + 1;
    if (templateData.layers[key]) templateData.layers[key].zIndex = layerMeta[key].zIndex;
    applyZIndexOrder();
    layer.draw();
    updateElementList();
    refreshSelectionIndicator();
  }

  function moveLayerToBack(key) {
    if (!layerMeta[key]) return;
    let min = Infinity;
    Object.keys(layerMeta).forEach(function (k) { if (layerMeta[k].zIndex < min) min = layerMeta[k].zIndex; });
    layerMeta[key].zIndex = min - 1;
    if (templateData.layers[key]) templateData.layers[key].zIndex = layerMeta[key].zIndex;
    applyZIndexOrder();
    layer.draw();
    updateElementList();
    refreshSelectionIndicator();
  }

  function toggleVisible(key) {
    if (!layerMeta[key]) return;
    layerMeta[key].visible = !layerMeta[key].visible;
    if (templateData.layers[key]) templateData.layers[key].visible = layerMeta[key].visible;
    const node = konvaElements[key];
    if (node) node.visible(layerMeta[key].visible);
    layer.draw();
    updateElementList();
    refreshSelectionIndicator();
  }

  function toggleLocked(key) {
    if (!layerMeta[key]) return;
    if (FORCED_LOCKED_KEYS.has(key)) {
      showStatus('Esta camada nao pode ser desbloqueada (' + key + ').', 'info');
      return;
    }
    layerMeta[key].locked = !layerMeta[key].locked;
    if (templateData.layers[key]) templateData.layers[key].locked = layerMeta[key].locked;
    const node = konvaElements[key];
    if (node) {
      if (typeof node.draggable === 'function') node.draggable(!layerMeta[key].locked);
      if (typeof node.listening === 'function') node.listening(!layerMeta[key].locked);
    }
    layer.draw();
    updateElementList();
  }

  function deleteLayer(key) {
    if (!layerMeta[key]) return;
    if (!layerMeta[key].deletable || FORCED_NON_DELETABLE.has(key)) {
      showStatus('Esta camada nao pode ser apagada (' + key + ').', 'info');
      return;
    }
    if (!confirm('Apagar a camada "' + (layerMeta[key].label || key) + '"? Nao pode ser desfeito.')) return;
    const node = konvaElements[key];
    if (node) node.destroy();
    delete konvaElements[key];
    delete layerMeta[key];
    if (templateData.layers && templateData.layers[key]) delete templateData.layers[key];
    if (selectedElement === key) selectedElement = null;
    layer.draw();
    updateElementList();
    deselectAll();
  }

  // ============================================================
  // EVENTOS DOS ELEMENTOS
  // ============================================================
  function setupElementEvents(node, key) {
    node.on('dragstart', function () {
      if (layerMeta[key] && layerMeta[key].locked) return;
      saveUndo();
      selectElement(key);
    });
    node.on('dragmove', function () { refreshSelectionIndicator(); });
    node.on('dragend', function () {
      selectElement(key);
      updateElementList();
      updatePropertiesPanel(key);
    });
    node.on('click tap', function (e) {
      e.cancelBubble = true;
      selectElement(key);
    });
    node.on('dblclick dbltap', function (e) {
      e.cancelBubble = true;
      if (layerMeta[key] && layerMeta[key].locked) return;
      if (node.getClassName() === 'Text') editTextInline(node, key);
      if (node.getClassName() === 'Group') {
        const badgeText = node.findOne('.badge-text');
        if (badgeText) editTextInline(badgeText, key);
      }
    });
    node.on('mouseenter', function () {
      document.body.style.cursor = (layerMeta[key] && layerMeta[key].locked) ? 'not-allowed' : 'move';
    });
    node.on('mouseleave', function () { document.body.style.cursor = 'default'; });
  }

  // ============================================================
  // SELECAO
  // ============================================================
  function selectElement(key) {
    if (!konvaElements[key]) return;
    deselectAllVisuals();
    selectedElement = key;
    drawSelectionIndicator(konvaElements[key]);
    attachTransformer(key);
    updatePropertiesPanel(key);
    updateElementList();
  }

  function attachTransformer(key) {
    if (!transformer) return;
    const node = konvaElements[key];
    const meta = layerMeta[key];
    if (!node || !meta) { transformer.nodes([]); transformer.visible(false); return; }
    // Nao mostra transformer em camadas locked, no fundo preto, ou em separator/lockedHeader
    const noTransform = meta.locked
      || meta.type === 'shape'           // blackBackground - fixo
      || meta.type === 'lockedImage'     // lockedHeader - fixo
      || meta.type === 'shapeLine';      // separator usa controles do painel
    if (noTransform) {
      transformer.nodes([]);
      transformer.visible(false);
      return;
    }
    transformer.nodes([node]);
    transformer.visible(true);
    transformer.moveToTop();
  }

  function applyTransformerScaleToSize(node) {
    if (!node) return;
    const sx = node.scaleX();
    const sy = node.scaleY();
    if (Math.abs(sx - 1) < 0.001 && Math.abs(sy - 1) < 0.001) return;
    if (typeof node.width === 'function' && typeof node.height === 'function') {
      const newW = Math.max(1, Math.round(node.width() * sx));
      const newH = Math.max(1, Math.round(node.height() * sy));
      node.width(newW);
      node.height(newH);
      node.scaleX(1);
      node.scaleY(1);
      // Casos especiais:
      const meta = layerMeta[selectedElement] || {};
      if (meta.type === 'gradientOverlay') applyGradientUpdate(node);
      if (meta.type === 'badge') {
        // re-sincroniza filhos do group
        const bg = node.findOne('.badge-bg');
        const hit = node.findOne('.badge-hit');
        const text = node.findOne('.badge-text');
        if (bg) bg.size({ width: newW, height: newH });
        if (hit) hit.size({ width: newW, height: newH });
        if (text) text.y((newH - text.fontSize()) / 2 + 2);
        node.setAttr('autoWidth', false);
      }
      if (meta.type === 'image' && node.image && node.image()) applyImageCoverCrop(node, node.image());
    }
  }

  function drawSelectionIndicator(node) {
    if (!node || !node.visible()) return;
    const box = node.getClientRect({ relativeTo: layer });
    const sel = new Konva.Rect({
      x: box.x - 4, y: box.y - 4,
      width: box.width + 8, height: box.height + 8,
      stroke: '#E63946',
      strokeWidth: 2,
      dash: [5, 5],
      name: 'selection-indicator',
      listening: false
    });
    layer.add(sel);
    sel.moveToTop();
    layer.draw();
  }

  function refreshSelectionIndicator() {
    if (!selectedElement) return;
    deselectAllVisuals();
    const node = konvaElements[selectedElement];
    if (node) drawSelectionIndicator(node);
  }

  function deselectAllVisuals() {
    if (!layer) return;
    const indicators = layer.find('.selection-indicator');
    indicators.forEach(function (ind) { ind.destroy(); });
    layer.draw();
  }

  function deselectAll() {
    selectedElement = null;
    deselectAllVisuals();
    if (transformer) { transformer.nodes([]); transformer.visible(false); }
    updateElementList();
    const panel = document.getElementById('propertiesPanel');
    if (panel) panel.innerHTML = '<p style="color:#666;font-size:12px">Selecione um elemento no canvas para editar.</p>';
  }
  window.selectElementFromList = selectElement;

  // ============================================================
  // EDICAO DE TEXTO INLINE
  // ============================================================
  function editTextInline(textNode, key) {
    const stageBox = stage.container().getBoundingClientRect();
    const textPosition = textNode.absolutePosition();
    const area = document.createElement('textarea');
    area.value = textNode.text();
    area.style.position = 'fixed';
    area.style.left = (stageBox.left + textPosition.x * currentScale) + 'px';
    area.style.top = (stageBox.top + textPosition.y * currentScale) + 'px';
    const w = textNode.width();
    const h = Math.max(textNode.height(), textNode.fontSize() * 2);
    area.style.width = (w * currentScale) + 'px';
    area.style.height = (h * currentScale) + 'px';
    area.style.fontSize = (textNode.fontSize() * currentScale) + 'px';
    area.style.fontFamily = textNode.fontFamily();
    area.style.color = textNode.fill();
    area.style.background = 'rgba(0,0,0,0.9)';
    area.style.border = '2px solid #E63946';
    area.style.borderRadius = '4px';
    area.style.padding = '4px';
    area.style.resize = 'none';
    area.style.outline = 'none';
    area.style.zIndex = '1000';
    document.body.appendChild(area);
    area.focus();
    area.select();

    let finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      saveUndo();
      if (key === 'category' && textNode.name() === 'badge-text') {
        const formatted = formatCategoryLabel(area.value, { textTransform: konvaElements.category.getAttr('textTransform') });
        textNode.text(formatted);
        resizeBadgeToText(konvaElements.category);
      } else {
        textNode.text(area.value);
      }
      layer.draw();
      if (area.parentNode) area.parentNode.removeChild(area);
      updateElementList();
      updatePropertiesPanel(key);
      refreshSelectionIndicator();
    }
    area.addEventListener('blur', finish);
    area.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); area.blur(); }
      else if (e.key === 'Escape') { e.preventDefault(); area.value = textNode.text(); area.blur(); }
    });
  }

  // ============================================================
  // LISTA DE CAMADAS (com botoes de visibilidade/lock/delete/up/down)
  // ============================================================
  function updateElementList() {
    const list = document.getElementById('elementList');
    if (!list) return;
    // Ordem: maior zIndex em cima (visualmente o topo)
    const ordered = Object.keys(layerMeta)
      .filter(function (k) { return konvaElements[k]; })
      .sort(function (a, b) { return layerMeta[b].zIndex - layerMeta[a].zIndex; });

    let html = '';
    ordered.forEach(function (key) {
      const meta = layerMeta[key];
      const node = konvaElements[key];
      const active = selectedElement === key ? 'active' : '';
      const dim = meta.visible ? '' : ' dim';
      const lockIcon = meta.locked ? '🔒' : '🔓';
      const visIcon = meta.visible ? '👁' : '⊘';
      const pos = 'X' + Math.round(node.x()) + ' Y' + Math.round(node.y()) + ' z' + meta.zIndex;
      html += '<div class="element-item ' + active + dim + '" onclick="selectElementFromList(\'' + key + '\')">' +
        '<div class="el-row">' +
          '<span class="el-name">' + escapeHtmlText(meta.label) + '</span>' +
          '<span class="el-meta">' + escapeHtmlText(meta.type) + ' · ' + pos + '</span>' +
        '</div>' +
        '<div class="el-actions" onclick="event.stopPropagation()">' +
          '<button title="Subir camada" onclick="window.layerCmd(\'up\', \'' + key + '\')">↑</button>' +
          '<button title="Descer camada" onclick="window.layerCmd(\'down\', \'' + key + '\')">↓</button>' +
          '<button title="Trazer para frente" onclick="window.layerCmd(\'front\', \'' + key + '\')">⇈</button>' +
          '<button title="Enviar para tras" onclick="window.layerCmd(\'back\', \'' + key + '\')">⇊</button>' +
          '<button title="Mostrar/Ocultar" onclick="window.layerCmd(\'visible\', \'' + key + '\')">' + visIcon + '</button>' +
          '<button title="Bloquear/Desbloquear" onclick="window.layerCmd(\'lock\', \'' + key + '\')">' + lockIcon + '</button>' +
          (meta.deletable ? '<button title="Apagar" onclick="window.layerCmd(\'delete\', \'' + key + '\')">🗑</button>' : '') +
        '</div>' +
      '</div>';
    });
    list.innerHTML = html;
  }

  window.layerCmd = function (cmd, key) {
    if (cmd === 'up') moveLayerBy(key, 1);
    else if (cmd === 'down') moveLayerBy(key, -1);
    else if (cmd === 'front') moveLayerToFront(key);
    else if (cmd === 'back') moveLayerToBack(key);
    else if (cmd === 'visible') toggleVisible(key);
    else if (cmd === 'lock') toggleLocked(key);
    else if (cmd === 'delete') deleteLayer(key);
  };

  // ============================================================
  // PAINEL DE PROPRIEDADES
  // ============================================================
  function updatePropertiesPanel(key) {
    const node = konvaElements[key];
    const meta = layerMeta[key];
    if (!node || !meta) return;
    const componentType = meta.type;
    let html = '<div class="tool-group"><label>Componente</label><input type="text" value="' +
      escapeHtmlAttr(meta.label + ' / ' + componentType) + '" disabled></div>';
    html += '<div class="tool-row">' +
      numberControl(key, 'x', 'X', Math.round(node.x())) +
      numberControl(key, 'y', 'Y', Math.round(node.y())) +
      '</div>';

    if (componentType === 'badge') html += renderBadgeControls(key, node);
    else if (componentType === 'shapeLine') html += renderShapeLineControls(key, node);
    else if (componentType === 'textBox') html += renderTextBoxControls(key, node);
    else if (componentType === 'overlay') html += renderOverlayControls(key, node);
    else if (componentType === 'gradientOverlay') html += renderGradientOverlayControls(key, node);
    else if (componentType === 'image' || componentType === 'logo') html += renderImageControls(key, node);
    else if (componentType === 'shape') html += renderShapeControls(key, node);
    else if (componentType === 'lockedImage') html += renderLockedImageControls(key, node);
    else html += renderImageControls(key, node);

    // Controles comuns no fim: rotation + zIndex
    html += '<div class="tool-row">' +
      numberControl(key, 'rotation', 'Rotacao (deg)', Math.round(node.rotation ? node.rotation() : 0)) +
      numberControl(key, 'zIndex', 'zIndex', meta.zIndex) +
      '</div>';

    document.getElementById('propertiesPanel').innerHTML = html;
  }

  function renderBadgeControls(key, node) {
    const bg = node.findOne('.badge-bg');
    const text = node.findOne('.badge-text');
    if (!bg || !text) return '';
    const autoWidth = node.getAttr('autoWidth') !== false;
    return textControl(key, 'text', 'Texto da editoria', text.text()) +
      '<div class="tool-row">' + numberControl(key, 'width', 'Largura', Math.round(bg.width())) + numberControl(key, 'height', 'Altura', Math.round(bg.height())) + '</div>' +
      checkboxControl(key, 'autoWidth', 'Auto largura', autoWidth) +
      '<div class="tool-row">' + colorControl(key, 'background', 'Fundo', bg.fill()) + colorControl(key, 'textColor', 'Cor do texto', text.fill()) + '</div>' +
      textControl(key, 'fontFamily', 'Fonte', text.fontFamily()) +
      '<div class="tool-row">' +
        selectControl(key, 'fontWeight', 'Peso', text.fontStyle(), ['normal', 'bold', '400', '700']) +
        selectControl(key, 'textTransform', 'Transformacao', node.getAttr('textTransform') || 'uppercase', ['uppercase', 'none', 'lowercase', 'capitalize']) +
      '</div>' +
      '<div class="tool-row">' + numberControl(key, 'fontSize', 'Fonte (px)', text.fontSize()) + numberControl(key, 'letterSpacing', 'Espacamento', text.letterSpacing ? text.letterSpacing() : 0) + '</div>' +
      '<div class="tool-row">' + numberControl(key, 'paddingX', 'Padding X', node.getAttr('paddingX')) + numberControl(key, 'paddingY', 'Padding Y', node.getAttr('paddingY')) + '</div>' +
      '<div class="tool-row">' + numberControl(key, 'borderRadius', 'Raio', bg.cornerRadius()) + rangeControl(key, 'opacity', 'Opacidade', node.opacity()) + '</div>';
  }

  function renderShapeLineControls(key, node) {
    const visible = node.findOne('.separator-visible') || node;
    return '<div class="tool-row">' + numberControl(key, 'width', 'Largura', Math.round(visible.width())) + numberControl(key, 'height', 'Altura visual', Math.round(visible.height())) + '</div>' +
      '<div class="tool-row">' + colorControl(key, 'color', 'Cor', visible.fill()) + rangeControl(key, 'opacity', 'Opacidade', node.opacity()) + '</div>';
  }

  function renderTextBoxControls(key, node) {
    return textControl(key, 'text', 'Texto', node.text()) +
      '<div class="tool-row">' + numberControl(key, 'width', 'Largura', Math.round(node.width())) + numberControl(key, 'fontSize', 'Fonte (px)', node.fontSize()) + '</div>' +
      '<div class="tool-row">' + numberControl(key, 'lineHeightPx', 'Linha (px)', getTextLineHeightPx(node)) + colorControl(key, 'color', 'Cor', node.fill()) + '</div>' +
      textControl(key, 'fontFamily', 'Fonte', node.fontFamily()) +
      '<div class="tool-row">' + selectControl(key, 'fontWeight', 'Peso', node.fontStyle() || 'normal', ['normal', 'bold', '400', '700']) + rangeControl(key, 'opacity', 'Opacidade', node.opacity()) + '</div>';
  }

  function renderOverlayControls(key, node) {
    return '<div class="tool-row">' + numberControl(key, 'width', 'Largura', Math.round(node.width())) + numberControl(key, 'height', 'Altura', Math.round(node.height())) + '</div>' +
      '<div class="tool-row">' + colorControl(key, 'color', 'Cor', node.fill()) + rangeControl(key, 'opacity', 'Opacidade', node.opacity()) + '</div>' +
      numberControl(key, 'borderRadius', 'Raio', node.cornerRadius ? node.cornerRadius() : 0);
  }

  function renderGradientOverlayControls(key, node) {
    const stops = node.getAttr('colorStops') || [];
    const angle = numOr(node.getAttr('angle'), 90);
    let html = '<div class="tool-row">' +
      numberControl(key, 'width', 'Largura', Math.round(node.width())) +
      numberControl(key, 'height', 'Altura', Math.round(node.height())) +
      '</div>' +
      '<div class="tool-row">' +
      numberControl(key, 'angle', 'Angulo (deg)', Math.round(angle)) +
      rangeControl(key, 'opacity', 'Opacidade', node.opacity()) +
      '</div>' +
      '<div class="tool-group" style="font-size:11px;color:#a0a0b0;margin-top:6px"><label>Color stops</label>';
    stops.forEach(function (s, i) {
      html += '<div class="tool-row" style="margin:4px 0">' +
        '<input type="number" min="0" max="1" step="0.05" value="' + escapeHtmlAttr(s.offset) + '" onchange="window.updateGradientStop(\'' + key + '\', ' + i + ', \'offset\', this.value)">' +
        '<input type="text" value="' + escapeHtmlAttr(s.color) + '" placeholder="rgba(0,0,0,1) ou #000" onchange="window.updateGradientStop(\'' + key + '\', ' + i + ', \'color\', this.value)">' +
        '</div>';
    });
    html += '<div style="margin-top:6px;display:flex;gap:6px">' +
      '<button style="flex:1;padding:6px;background:transparent;border:1px solid #1a1a3a;border-radius:6px;color:#fff;cursor:pointer" onclick="window.addGradientStop(\'' + key + '\')">+ stop</button>' +
      '<button style="flex:1;padding:6px;background:transparent;border:1px solid #1a1a3a;border-radius:6px;color:#fff;cursor:pointer" onclick="window.removeGradientStop(\'' + key + '\')">- stop</button>' +
      '</div>';
    html += '</div>';
    return html;
  }

  window.updateGradientStop = function (key, index, prop, value) {
    const node = konvaElements[key];
    if (!node) return;
    const stops = node.getAttr('colorStops') || [];
    if (!stops[index]) return;
    saveUndo();
    if (prop === 'offset') stops[index].offset = clamp01(numOr(value, stops[index].offset));
    else stops[index].color = String(value);
    stops.sort(function (a, b) { return a.offset - b.offset; });
    node.setAttr('colorStops', stops);
    applyGradientUpdate(node);
    layer.draw();
    updatePropertiesPanel(key);
    refreshSelectionIndicator();
  };
  window.addGradientStop = function (key) {
    const node = konvaElements[key];
    if (!node) return;
    const stops = node.getAttr('colorStops') || [];
    saveUndo();
    stops.push({ offset: 0.5, color: 'rgba(0,0,0,0.5)' });
    stops.sort(function (a, b) { return a.offset - b.offset; });
    node.setAttr('colorStops', stops);
    applyGradientUpdate(node);
    layer.draw();
    updatePropertiesPanel(key);
  };
  window.removeGradientStop = function (key) {
    const node = konvaElements[key];
    if (!node) return;
    const stops = node.getAttr('colorStops') || [];
    if (stops.length <= 2) { showStatus('Gradiente precisa de pelo menos 2 stops.', 'info'); return; }
    saveUndo();
    stops.pop();
    node.setAttr('colorStops', stops);
    applyGradientUpdate(node);
    layer.draw();
    updatePropertiesPanel(key);
  };

  function renderShapeControls(key, node) {
    return '<div class="tool-row">' + numberControl(key, 'width', 'Largura', Math.round(node.width())) + numberControl(key, 'height', 'Altura', Math.round(node.height())) + '</div>' +
      '<div class="tool-row">' + colorControl(key, 'color', 'Cor', node.fill()) + rangeControl(key, 'opacity', 'Opacidade', node.opacity()) + '</div>';
  }

  function renderImageControls(key, node) {
    const w = (node.width ? node.width() : 0);
    const h = (node.height ? node.height() : 0);
    return '<div class="tool-row">' + numberControl(key, 'width', 'Largura', Math.round(w)) + numberControl(key, 'height', 'Altura', Math.round(h)) + '</div>' +
      rangeControl(key, 'opacity', 'Opacidade', node.opacity()) +
      '<div class="tool-group" style="font-size:11px;color:#666;">Para mudar a imagem, importe uma URL no painel ao lado.</div>';
  }

  function renderLockedImageControls(key, node) {
    return '<div class="tool-group" style="font-size:11px;color:#a0a0b0;">Cabecalho oficial (logo + 19 ANOS + icone U). Locked: nao move/edita. Use os botoes de camada para ocultar.</div>' +
      rangeControl(key, 'opacity', 'Opacidade', node.opacity());
  }

  function updateNodeProp(key, prop, value) {
    const node = konvaElements[key];
    const meta = layerMeta[key];
    if (!node || !meta) return;
    saveUndo();

    // Props comuns a todos os tipos
    if (prop === 'rotation' && typeof node.rotation === 'function') {
      node.rotation(numOr(value, 0));
      layer.draw();
      updatePropertiesPanel(key);
      updateElementList();
      refreshSelectionIndicator();
      return;
    }
    if (prop === 'zIndex') {
      const newZ = parseInt(value, 10);
      if (Number.isFinite(newZ)) {
        meta.zIndex = newZ;
        if (templateData.layers[key]) templateData.layers[key].zIndex = newZ;
        applyZIndexOrder();
        layer.draw();
        updatePropertiesPanel(key);
        updateElementList();
        refreshSelectionIndicator();
      }
      return;
    }

    if (meta.type === 'badge') updateBadgeProp(node, prop, value);
    else if (meta.type === 'shapeLine') updateShapeLineProp(node, prop, value);
    else if (meta.type === 'textBox') updateTextBoxProp(node, prop, value);
    else if (meta.type === 'overlay') updateOverlayProp(node, prop, value);
    else if (meta.type === 'gradientOverlay') updateGradientOverlayProp(node, prop, value);
    else if (meta.type === 'image' || meta.type === 'logo') updateImageProp(node, prop, value);
    else if (meta.type === 'shape') updateShapeProp(node, prop, value);
    else if (meta.type === 'lockedImage') updateLockedImageProp(node, prop, value);
    layer.draw();
    updateElementList();
    updatePropertiesPanel(key);
    refreshSelectionIndicator();
  }
  window.updateNodePropFromInput = updateNodeProp;

  function updateGradientOverlayProp(node, prop, value) {
    if (prop === 'x' || prop === 'y') { node.setAttr(prop, numOr(value, node.getAttr(prop))); return; }
    if (prop === 'width') { node.width(Math.max(1, numOr(value, node.width()))); applyGradientUpdate(node); return; }
    if (prop === 'height') { node.height(Math.max(1, numOr(value, node.height()))); applyGradientUpdate(node); return; }
    if (prop === 'angle') { node.setAttr('angle', numOr(value, node.getAttr('angle'))); applyGradientUpdate(node); return; }
    if (prop === 'opacity') { node.opacity(clamp01(numOr(value, node.opacity()))); return; }
  }

  function updateBadgeProp(group, prop, value) {
    const bg = group.findOne('.badge-bg');
    const text = group.findOne('.badge-text');
    if (prop === 'x' || prop === 'y') { group.setAttr(prop, numOr(value, group.getAttr(prop))); return; }
    if (prop === 'text' && text) { text.text(formatCategoryLabel(value, { textTransform: group.getAttr('textTransform') })); resizeBadgeToText(group); return; }
    if ((prop === 'background' || prop === 'color' || prop === 'fill') && bg) { bg.fill(value); return; }
    if (prop === 'textColor' && text) { text.fill(value); return; }
    if (prop === 'fontFamily' && text) { text.fontFamily(normalizeFontFamily(value)); group.setAttr('fontFamily', normalizeFontFamily(value)); resizeBadgeToText(group); return; }
    if (prop === 'fontWeight' && text) { const w = normalizeFontWeight(value, 'bold'); text.fontStyle(w); group.setAttr('fontWeight', w); resizeBadgeToText(group); return; }
    if (prop === 'fontSize' && text) { text.fontSize(Math.max(1, numOr(value, text.fontSize()))); resizeBadgeToText(group); return; }
    if (prop === 'letterSpacing' && text) { text.letterSpacing(numOr(value, text.letterSpacing ? text.letterSpacing() : 0)); group.setAttr('letterSpacing', text.letterSpacing()); resizeBadgeToText(group); return; }
    if (prop === 'textTransform' && text) { const t = normalizeTextTransform(value); group.setAttr('textTransform', t); text.text(formatCategoryLabel(text.text(), { textTransform: t })); resizeBadgeToText(group); return; }
    if (prop === 'width' && bg) { const w = Math.max(1, Math.round(numOr(value, bg.width()))); group.setAttr('autoWidth', false); setBadgeWidth(group, w); return; }
    if (prop === 'height' && bg) { setBadgeHeight(group, Math.max(1, Math.round(numOr(value, bg.height())))); return; }
    if (prop === 'paddingX') { group.setAttr('paddingX', Math.max(0, Math.round(numOr(value, group.getAttr('paddingX'))))); resizeBadgeToText(group); return; }
    if (prop === 'paddingY') { const p = Math.max(0, Math.round(numOr(value, group.getAttr('paddingY')))); group.setAttr('paddingY', p); if (text) setBadgeHeight(group, Math.max(1, Math.round(text.fontSize() + p * 2))); return; }
    if (prop === 'borderRadius' && bg) { bg.cornerRadius(Math.max(0, numOr(value, bg.cornerRadius()))); group.setAttr('borderRadius', bg.cornerRadius()); return; }
    if (prop === 'autoWidth') { group.setAttr('autoWidth', value === true || value === 'true'); resizeBadgeToText(group); return; }
    if (prop === 'opacity') group.opacity(clamp01(numOr(value, group.opacity())));
  }

  function updateShapeLineProp(group, prop, value) {
    const visible = group.findOne('.separator-visible');
    const hit = group.findOne('.separator-hit');
    if (prop === 'x' || prop === 'y') { group.setAttr(prop, numOr(value, group.getAttr(prop))); return; }
    if (!visible) return;
    if (prop === 'width') { const w = Math.max(1, Math.round(numOr(value, visible.width()))); visible.width(w); if (hit) hit.width(w); group.width(w); return; }
    if (prop === 'height') { const h = Math.max(1, Math.round(numOr(value, visible.height()))); visible.height(h); updateSeparatorHitArea(group); return; }
    if (prop === 'color' || prop === 'fill') { visible.fill(value); return; }
    if (prop === 'opacity') group.opacity(clamp01(numOr(value, group.opacity())));
  }

  function updateTextBoxProp(node, prop, value) {
    if (prop === 'x' || prop === 'y') node.setAttr(prop, numOr(value, node.getAttr(prop)));
    else if (prop === 'text') node.text(value);
    else if (prop === 'width') node.width(Math.max(1, numOr(value, node.width())));
    else if (prop === 'fontSize') node.fontSize(Math.max(1, numOr(value, node.fontSize())));
    else if (prop === 'fontFamily') node.fontFamily(normalizeFontFamily(value));
    else if (prop === 'fontWeight') node.fontStyle(normalizeFontWeight(value, 'normal'));
    else if (prop === 'color' || prop === 'fill') node.fill(value);
    else if (prop === 'lineHeightPx') node.lineHeight(Math.max(0.1, numOr(value, getTextLineHeightPx(node)) / node.fontSize()));
    else if (prop === 'opacity') node.opacity(clamp01(numOr(value, node.opacity())));
  }

  function updateOverlayProp(node, prop, value) {
    if (prop === 'x' || prop === 'y') node.setAttr(prop, numOr(value, node.getAttr(prop)));
    else if (prop === 'width') node.width(Math.max(1, numOr(value, node.width())));
    else if (prop === 'height') node.height(Math.max(1, numOr(value, node.height())));
    else if (prop === 'color' || prop === 'fill' || prop === 'background') node.fill(value);
    else if (prop === 'opacity') node.opacity(clamp01(numOr(value, node.opacity())));
    else if (prop === 'borderRadius' && node.cornerRadius) node.cornerRadius(Math.max(0, numOr(value, node.cornerRadius())));
  }

  function updateImageProp(node, prop, value) {
    if (prop === 'x' || prop === 'y') node.setAttr(prop, numOr(value, node.getAttr(prop)));
    else if (prop === 'width') { node.width(Math.max(1, numOr(value, node.width()))); if (node.image && node.image()) applyImageCoverCrop(node, node.image()); }
    else if (prop === 'height') { node.height(Math.max(1, numOr(value, node.height()))); if (node.image && node.image()) applyImageCoverCrop(node, node.image()); }
    else if (prop === 'opacity') node.opacity(clamp01(numOr(value, node.opacity())));
  }

  function updateShapeProp(node, prop, value) {
    if (prop === 'x' || prop === 'y') node.setAttr(prop, numOr(value, node.getAttr(prop)));
    else if (prop === 'width') node.width(Math.max(1, numOr(value, node.width())));
    else if (prop === 'height') node.height(Math.max(1, numOr(value, node.height())));
    else if (prop === 'color' || prop === 'fill') node.fill(value);
    else if (prop === 'opacity') node.opacity(clamp01(numOr(value, node.opacity())));
  }

  function updateLockedImageProp(node, prop, value) {
    if (prop === 'opacity') node.opacity(clamp01(numOr(value, node.opacity())));
  }

  // ============================================================
  // IMPORT DE DADOS DA MATERIA (postMessage)
  // ============================================================
  function setupArticleImport() {
    window.addEventListener('message', function (event) {
      if (event.origin !== window.location.origin) return;
      const message = event.data || {};
      if (message.type === 'autopost:article-data') {
        applyArticleData(message.payload || {});
        return;
      }
      if (message.type === 'autopost:template-snapshot-request') {
        event.source?.postMessage({
          type: 'autopost:template-snapshot-response',
          requestId: message.requestId,
          payload: buildTemplateSnapshot(true)
        }, event.origin);
      }
    });
  }

  function applyArticleData(article) {
    const data = {
      category: cleanText(article.category),
      title: cleanText(article.title),
      summary: cleanText(article.summary),
      image: cleanText(article.image)
    };
    if (!data.category && !data.title && !data.summary && !data.image) return;
    saveUndo();

    if (data.category && konvaElements.category) {
      updateBadgeProp(konvaElements.category, 'text', data.category);
      const style = resolveCategoryStyle(data.category);
      const bg = konvaElements.category.findOne('.badge-bg');
      const text = konvaElements.category.findOne('.badge-text');
      if (bg && style.background) bg.fill(style.background);
      if (text && style.textColor) text.fill(style.textColor);
    }
    if (data.title && konvaElements.title) konvaElements.title.text(data.title);
    if (data.summary && konvaElements.summary) konvaElements.summary.text(data.summary);
    if (data.image) loadArticleImageUrl(data.image);

    layer.draw();
    updateElementList();
    if (selectedElement) updatePropertiesPanel(selectedElement);
    refreshSelectionIndicator();
    showStatus('Dados da materia aplicados ao editor.', 'success');
  }

  function loadArticleImageUrl(url) {
    const key = 'articleImage';
    if (!templateData.layers[key]) {
      ensureLayer(key, { type: 'image', x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT, src: '', fitMode: 'cover', objectFit: 'cover', opacity: 1, visible: true, locked: false, deletable: true, zIndex: 10 });
      layerMeta[key] = readMeta(key, templateData.layers[key]);
    }
    templateData.layers[key].src = url;
    const config = templateData.layers[key];
    const meta = layerMeta[key];
    Object.assign(config, {
      x: 0,
      y: 0,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      fitMode: 'cover',
      objectFit: 'cover',
      opacity: 1,
      visible: true,
      zIndex: DEFAULT_Z_INDEX.articleImage
    });

    // Se ja existe um nó (placeholder ou Image), o substituimos
    const existing = konvaElements[key];
    if (existing) {
      existing.destroy();
      delete konvaElements[key];
    }
    loadImageNode(key, url, config, meta).catch(function () {
      showStatus('Nao foi possivel carregar a imagem da materia.', 'error');
    });
  }

  function applyImageCoverCrop(node, image) {
    const tw = node.width();
    const th = node.height();
    const iw = image.naturalWidth || image.width || tw;
    const ih = image.naturalHeight || image.height || th;
    const scale = Math.max(tw / iw, th / ih);
    const cw = tw / scale;
    const ch = th / scale;
    node.crop({
      x: Math.max(0, (iw - cw) / 2),
      y: Math.max(0, (ih - ch) / 2),
      width: cw,
      height: ch
    });
  }

  function makeBlackTransparentImage(image, crop) {
    if (!crop) return image;
    try {
      const sx = numOr(crop.x, 0);
      const sy = numOr(crop.y, 0);
      const sw = Math.max(1, numOr(crop.width, image.naturalWidth || image.width));
      const sh = Math.max(1, numOr(crop.height, image.naturalHeight || image.height));
      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
      const pixels = ctx.getImageData(0, 0, sw, sh);
      for (let i = 0; i < pixels.data.length; i += 4) {
        const r = pixels.data[i];
        const g = pixels.data[i + 1];
        const b = pixels.data[i + 2];
        if (r < 16 && g < 16 && b < 16) pixels.data[i + 3] = 0;
      }
      ctx.putImageData(pixels, 0, 0);
      return canvas;
    } catch (e) {
      return image;
    }
  }

  function cleanText(v) {
    return String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  }

  // ============================================================
  // TECLADO
  // ============================================================
  function setupKeyboard() {
    document.addEventListener('keydown', function (e) {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (!selectedElement) return;
      const node = konvaElements[selectedElement];
      const meta = layerMeta[selectedElement];
      if (!node || !meta || meta.locked) return;
      const step = e.shiftKey ? 10 : 1;
      let moved = false;
      switch (e.key) {
        case 'ArrowLeft':  e.preventDefault(); saveUndo(); node.x(node.x() - step); moved = true; break;
        case 'ArrowRight': e.preventDefault(); saveUndo(); node.x(node.x() + step); moved = true; break;
        case 'ArrowUp':    e.preventDefault(); saveUndo(); node.y(node.y() - step); moved = true; break;
        case 'ArrowDown':  e.preventDefault(); saveUndo(); node.y(node.y() + step); moved = true; break;
      }
      if (moved) {
        layer.draw();
        updateElementList();
        updatePropertiesPanel(selectedElement);
        refreshSelectionIndicator();
      }
    });
  }

  function saveUndo() {
    const state = {};
    Object.keys(konvaElements).forEach(function (k) {
      const n = konvaElements[k];
      state[k] = { x: n.x(), y: n.y(), opacity: n.opacity(), visible: n.visible() };
      if (n.getClassName() === 'Text') state[k].text = n.text();
    });
    undoStack.push(state);
    if (undoStack.length > 30) undoStack.shift();
  }

  // ============================================================
  // PERSISTENCIA → JSON
  // ============================================================
  function persistMeta(target, key) {
    const meta = layerMeta[key];
    if (!meta) return;
    target.id = meta.id || key;
    target.type = meta.type;
    target.label = meta.label;
    target.zIndex = meta.zIndex;
    target.visible = meta.visible;
    target.locked = meta.locked;
    target.deletable = meta.deletable;
  }

  function persistBadge(next, target, node) {
    const bg = node.findOne('.badge-bg');
    const text = node.findOne('.badge-text');
    if (!bg || !text) return;
    const catLabel = formatCategoryLabel(text.text(), { textTransform: node.getAttr('textTransform') });
    target.text = catLabel;
    target.width = Math.round(bg.width());
    target.height = Math.round(bg.height());
    target.background = bg.fill();
    target.textColor = text.fill();
    target.color = text.fill();
    target.fontFamily = text.fontFamily();
    target.fontWeight = text.fontStyle() || 'normal';
    target.fontSize = text.fontSize();
    target.letterSpacing = text.letterSpacing ? text.letterSpacing() : 0;
    target.paddingX = Math.round(numOr(node.getAttr('paddingX'), 24));
    target.paddingY = Math.round(numOr(node.getAttr('paddingY'), 14));
    target.borderRadius = Math.round(numOr(bg.cornerRadius(), 0));
    target.radius = target.borderRadius;
    target.autoWidth = node.getAttr('autoWidth') !== false;
    target.textTransform = normalizeTextTransform(node.getAttr('textTransform'));
    target.opacity = node.opacity();
    if (!next.defaults) next.defaults = {};
    next.defaults.category = catLabel;
    if (!next.categoryColors) next.categoryColors = {};
    next.categoryColors[catLabel] = bg.fill();
    if (!next.categoryStyles) next.categoryStyles = {};
    next.categoryStyles[catLabel] = { background: bg.fill(), textColor: text.fill() };
    const normalized = normalizeCategoryKey(catLabel);
    if (normalized && normalized !== catLabel) {
      next.categoryColors[normalized] = bg.fill();
      next.categoryStyles[normalized] = { background: bg.fill(), textColor: text.fill() };
    }
  }

  function persistShapeLine(target, node) {
    const visible = node.findOne('.separator-visible') || node;
    target.width = Math.round(visible.width());
    target.height = Math.round(visible.height());
    target.color = visible.fill();
    target.opacity = node.opacity();
    target.hitHeight = SEPARATOR_HIT_HEIGHT;
  }

  function persistTextBox(next, target, key, node) {
    target.text = node.text();
    target.width = Math.round(node.width());
    target.maxWidth = Math.round(node.width());
    target.fontFamily = node.fontFamily();
    target.fontWeight = node.fontStyle() || 'normal';
    target.fontSize = node.fontSize();
    target.lineHeight = Math.round(getTextLineHeightPx(node));
    target.color = node.fill();
    target.opacity = node.opacity();
    if (key === 'title') { if (!next.defaults) next.defaults = {}; next.defaults.title = node.text(); }
    if (key === 'summary') { if (!next.defaults) next.defaults = {}; next.defaults.summary = node.text(); }
  }

  function persistOverlay(target, node) {
    target.width = Math.round(node.width());
    target.height = Math.round(node.height());
    target.color = node.fill();
    target.background = node.fill();
    target.opacity = node.opacity();
    if (node.cornerRadius) target.borderRadius = Math.round(numOr(node.cornerRadius(), 0));
  }

  function persistGradientOverlay(target, node) {
    target.width = Math.round(node.width());
    target.height = Math.round(node.height());
    target.angle = numOr(node.getAttr('angle'), 90);
    target.colorStops = (node.getAttr('colorStops') || []).map(function (s) {
      return { offset: clamp01(numOr(s.offset, 0)), color: String(s.color || '#000') };
    });
    target.opacity = node.opacity();
  }

  function persistShape(target, node) {
    target.width = Math.round(node.width());
    target.height = Math.round(node.height());
    target.color = node.fill();
    target.background = node.fill();
    target.opacity = node.opacity();
  }

  function persistImage(target, node) {
    target.width = Math.round(node.width());
    target.height = Math.round(node.height());
    target.opacity = node.opacity();
    const src = node.getAttr('src') || node.getAttr('image') || node.getAttr('url');
    if (src) target.src = src;
  }

  function persistLockedImage(target, node) {
    target.width = Math.round(node.width());
    target.height = Math.round(node.height());
    target.opacity = node.opacity();
    const src = node.getAttr('src') || TEMPLATE_BASE_URL;
    target.src = src;
  }

  function buildTemplateSnapshot(includeArticleSrc) {
    if (!templateData) return null;
    const next = JSON.parse(JSON.stringify(templateData));
    if (!next.layers) next.layers = {};

    Object.keys(konvaElements).forEach(function (key) {
      const node = konvaElements[key];
      const meta = layerMeta[key];
      if (!node || !meta) return;
      if (!next.layers[key]) next.layers[key] = {};
      const target = next.layers[key];
      target.x = Math.round(node.x());
      target.y = Math.round(node.y());
      if (typeof node.rotation === 'function') target.rotation = numOr(node.rotation(), 0);
      persistMeta(target, key);
      if (meta.type === 'badge') persistBadge(next, target, node);
      else if (meta.type === 'shapeLine') persistShapeLine(target, node);
      else if (meta.type === 'textBox') persistTextBox(next, target, key, node);
      else if (meta.type === 'overlay') persistOverlay(target, node);
      else if (meta.type === 'gradientOverlay') persistGradientOverlay(target, node);
      else if (meta.type === 'shape') persistShape(target, node);
      else if (meta.type === 'image' || meta.type === 'logo') persistImage(target, node);
      else if (meta.type === 'lockedImage') persistLockedImage(target, node);
    });

    // Remove camadas que foram apagadas no editor
    Object.keys(next.layers).forEach(function (key) {
      if (!konvaElements[key] && !FORCED_NON_DELETABLE.has(key)) {
        delete next.layers[key];
      }
    });

    // Se nao queremos persistir o src da articleImage no JSON salvo
    // (para nao engessar o template), tiramos o src antes de salvar
    if (!includeArticleSrc && next.layers.articleImage) {
      next.layers.articleImage.src = '';
    }
    return next;
  }

  // ============================================================
  // SALVAR
  // ============================================================
  async function saveFromEditor() {
    if (!templateData) return;
    const next = buildTemplateSnapshot(false);
    try {
      const res = await fetch('/api/template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next)
      });
      const result = await res.json().catch(function () { return {}; });
      if (res.ok) {
        templateData = result.template || next;
        showStatus('Template salvo com sucesso!', 'success');
      } else {
        showStatus('Erro ao salvar: ' + (result.error || 'falha'), 'error');
      }
    } catch (err) {
      showStatus('Erro de conexao ao salvar.', 'error');
    }
  }

  // ============================================================
  // PREVIEW DO EDITOR (PNG client-side)
  // ============================================================
  async function generatePreviewKonva() {
    const popup = window.open('', '_blank');
    const indicators = layer.find('.selection-indicator');
    const visibleIndicators = [];
    const tWasVisible = transformer && transformer.visible();
    let dataURL = '';
    try {
      const fontsReady = await waitForTemplateFonts();
      if (!fontsReady) throw new Error('Fonte Aileron nao carregada');
      indicators.forEach(function (i) {
        if (i.visible()) visibleIndicators.push(i);
        i.visible(false);
      });
      if (transformer) transformer.visible(false);
      stage.scale({ x: 1, y: 1 });
      stage.width(CANVAS_WIDTH);
      stage.height(CANVAS_HEIGHT);
      layer.draw();
      dataURL = stage.toDataURL({ pixelRatio: 1, mimeType: 'image/png' });
    } catch (err) {
      if (popup && !popup.closed) popup.close();
      const message = /Aileron/i.test(err.message || '')
        ? 'Preview PNG bloqueado: fonte Aileron 400/700 nao carregou. Verifique os arquivos OTF.'
        : 'Preview PNG bloqueado por imagem remota sem CORS. Use Gerar Preview Real (API) para imagens externas.';
      showStatus(message, 'error');
      return;
    } finally {
      applyStageScale();
      visibleIndicators.forEach(function (i) { i.visible(true); });
      if (transformer && tWasVisible) transformer.visible(true);
      layer.draw();
    }
    if (popup) {
      popup.document.write('<title>Preview do Editor</title><body style="margin:0;background:#0a0a1a;display:flex;justify-content:center;align-items:center;min-height:100vh"><img src="' + dataURL + '" style="max-width:100%;max-height:100vh"></body>');
      popup.document.close();
      showStatus('Preview PNG do editor gerado.', 'success');
    } else {
      showStatus('Preview PNG gerado, mas o bloqueador de pop-up impediu abrir a nova aba.', 'error');
    }
  }

  // ============================================================
  // PREVIEW REAL (server-side)
  // ============================================================
  async function generatePreviewReal() {
    showStatus('Gerando preview real...', 'info');
    const popup = window.open('', '_blank');
    try {
      await waitForTemplateFonts();
      const previewTemplate = buildTemplateSnapshot(true);
      const articleSrc = previewTemplate?.layers?.articleImage?.src || '';
      const res = await fetch('/api/template/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: konvaElements.title ? konvaElements.title.text() : DEFAULT_PREVIEW.title,
          summary: konvaElements.summary ? konvaElements.summary.text() : DEFAULT_PREVIEW.summary,
          category: konvaElements.category && konvaElements.category.findOne('.badge-text')
            ? konvaElements.category.findOne('.badge-text').text()
            : DEFAULT_PREVIEW.category,
          imageUrl: articleSrc,
          template: previewTemplate
        })
      });
      const data = await res.json().catch(function () { return {}; });
      const url = normalizePreviewUrl(data);
      if (!res.ok || !url) {
        if (popup && !popup.closed) popup.close();
        showStatus('Falha no preview: ' + (data.error || 'erro desconhecido'), 'error');
        return;
      }
      if (popup) {
        popup.document.write('<title>Preview Real (API)</title><body style="margin:0;background:#0a0a1a;display:flex;justify-content:center;align-items:center;min-height:100vh"><img src="' + escapeAttr(url) + '" style="max-width:100%;max-height:100vh"></body>');
        popup.document.close();
        showStatus('Preview real gerado.', 'success');
      } else {
        showStatusLink('Preview real gerado, mas o pop-up foi bloqueado.', url, 'success');
      }
    } catch (err) {
      if (popup && !popup.closed) popup.close();
      showStatus('Erro ao gerar preview real: ' + (err.message || 'falha de conexao'), 'error');
    }
  }

  function normalizePreviewUrl(data) {
    if (data && data.url) return data.url;
    if (data && data.mediaPath) return '/api/media?path=' + encodeURIComponent(data.mediaPath);
    if (data && data.path) return '/api/media?path=' + encodeURIComponent(data.path);
    return '';
  }

  function escapeAttr(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  // ============================================================
  // RESET
  // ============================================================
  async function resetPositions() {
    if (!confirm('Restaurar template para o padrao? Suas alteracoes nao salvas serao perdidas.')) return;
    try {
      const res = await fetch('/api/template/reset', { method: 'POST' });
      const result = await res.json().catch(function () { return {}; });
      if (res.ok && result.template) {
        templateData = result.template;
        // Destroi tudo e recria
        Object.keys(konvaElements).forEach(function (k) { konvaElements[k].destroy(); });
        konvaElements = {};
        layerMeta = {};
        deselectAllVisuals();
        await createAllLayers();
        applyZIndexOrder();
        layer.draw();
        updateElementList();
        deselectAll();
        showStatus('Template restaurado.', 'success');
      } else {
        showStatus('Erro ao restaurar.', 'error');
      }
    } catch (err) {
      showStatus('Erro de conexao ao restaurar.', 'error');
    }
  }

  function bindToolbarButtons() {
    const btnSave = document.getElementById('btnSave');
    if (btnSave) btnSave.addEventListener('click', saveFromEditor);
    const btnPreviewKonva = document.getElementById('btnPreviewKonva');
    if (btnPreviewKonva) btnPreviewKonva.addEventListener('click', generatePreviewKonva);
    const btnPreviewReal = document.getElementById('btnPreviewReal');
    if (btnPreviewReal) btnPreviewReal.addEventListener('click', generatePreviewReal);
    const btnReset = document.getElementById('btnReset');
    if (btnReset) btnReset.addEventListener('click', resetPositions);
  }

  function applyStageScale() {
    if (!stage || !layer) return;
    stage.scale({ x: currentScale, y: currentScale });
    stage.width(CANVAS_WIDTH * currentScale);
    stage.height(CANVAS_HEIGHT * currentScale);
    layer.batchDraw();
  }

  // ============================================================
  // FONTES
  // ============================================================
  async function waitForTemplateFonts() {
    if (!document.fonts || typeof document.fonts.load !== 'function') {
      setAileronFontCheckAttrs(false, false);
      showStatus('Nao foi possivel validar a fonte Aileron neste navegador.', 'error');
      return false;
    }
    const missing = [];
    await Promise.all(REQUIRED_AILERON_FONT_QUERIES.map(async function (q) {
      try {
        await document.fonts.load(q);
        if (!document.fonts.check(q)) missing.push(q);
      } catch (err) { missing.push(q); }
    }));
    try { await document.fonts.ready; } catch (e) { /* best-effort */ }
    const regularOk = document.fonts.check('400 24px Aileron');
    const boldOk = document.fonts.check('700 24px Aileron');
    setAileronFontCheckAttrs(regularOk, boldOk);
    if (!regularOk || !boldOk) {
      showStatus('Fonte Aileron nao carregada nos pesos 400/700. Verifique os arquivos OTF.', 'error');
      return false;
    }
    if (missing.length) {
      showStatus('Fonte Aileron nao carregada nos pesos 400/700. Verifique os arquivos OTF.', 'error');
      return false;
    }
    return true;
  }

  function setAileronFontCheckAttrs(regularOk, boldOk) {
    if (!document.body) return;
    document.body.dataset.aileron400 = String(!!regularOk);
    document.body.dataset.aileron700 = String(!!boldOk);
  }

  // ============================================================
  // HELPERS
  // ============================================================
  function normalizeFontFamily(value) {
    const family = String(value || DEFAULT_FONT_FAMILY).split(',')[0].trim();
    if (!family) return DEFAULT_FONT_FAMILY;
    if (/^Aileron(Regular|Bold)?$/i.test(family)) return DEFAULT_FONT_FAMILY;
    if (/^(Arial|Helvetica|sans-serif)$/i.test(family)) return DEFAULT_FONT_FAMILY;
    return family;
  }
  function normalizeFontWeight(value, fallback) {
    const w = String(value || fallback || 'normal').trim().toLowerCase();
    if (w === '700') return 'bold';
    if (w === '400') return 'normal';
    if (w === 'bold' || w === 'normal') return w;
    return w || fallback || 'normal';
  }
  function getKonvaLineHeight(config) {
    const fs = numOr(config?.fontSize, 16);
    const lh = numOr(config?.lineHeight, fs * 1.2);
    return lh / fs;
  }
  function getTextLineHeightPx(node) {
    return Math.round((node.lineHeight ? node.lineHeight() : 1.2) * node.fontSize());
  }
  function numberControl(key, prop, label, value) {
    return '<div class="tool-group"><label>' + label + '</label><input type="number" value="' +
      escapeHtmlAttr(Number.isFinite(value) ? value : 0) +
      '" onchange="updateNodePropFromInput(\'' + key + '\', \'' + prop + '\', this.value)"></div>';
  }
  function textControl(key, prop, label, value) {
    return '<div class="tool-group"><label>' + label + '</label><input type="text" value="' +
      escapeHtmlAttr(value) +
      '" onchange="updateNodePropFromInput(\'' + key + '\', \'' + prop + '\', this.value)"></div>';
  }
  function colorControl(key, prop, label, value) {
    return '<div class="tool-group"><label>' + label + '</label><input type="color" value="' +
      colorToHex(value) +
      '" onchange="updateNodePropFromInput(\'' + key + '\', \'' + prop + '\', this.value)"></div>';
  }
  function rangeControl(key, prop, label, value) {
    const safe = clamp01(numOr(value, 1));
    return '<div class="tool-group"><label>' + label + ' (' + safe.toFixed(2) + ')</label><input type="range" min="0" max="1" step="0.05" value="' +
      safe +
      '" onchange="updateNodePropFromInput(\'' + key + '\', \'' + prop + '\', this.value)"></div>';
  }
  function checkboxControl(key, prop, label, checked) {
    return '<div class="tool-group"><label>' + label + '</label><input type="checkbox" ' +
      (checked ? 'checked ' : '') +
      'onchange="updateNodePropFromInput(\'' + key + '\', \'' + prop + '\', this.checked)"></div>';
  }
  function selectControl(key, prop, label, value, options) {
    let h = '<div class="tool-group"><label>' + label + '</label><select onchange="updateNodePropFromInput(\'' + key + '\', \'' + prop + '\', this.value)">';
    options.forEach(function (o) {
      h += '<option value="' + escapeHtmlAttr(o) + '"' + (String(o) === String(value) ? ' selected' : '') + '>' + escapeHtmlText(o) + '</option>';
    });
    return h + '</select></div>';
  }
  function getCategoryColor(label, colors) {
    const c = colors || {};
    const exact = formatCategoryLabel(label, (templateData.layers || {}).category);
    const normalized = normalizeCategoryKey(exact);
    return c[exact] || c[normalized] || c.GERAL || FALLBACK_CATEGORY_COLORS[normalized] || FALLBACK_CATEGORY_COLORS.GERAL;
  }

  // Resolve um par {background, textColor} a partir de templateData.categoryStyles.
  // Cai pra categoryColors legacy se categoryStyles nao tiver a chave.
  function resolveCategoryStyle(label) {
    const cat = formatCategoryLabel(label, (templateData.layers || {}).category);
    const normalized = normalizeCategoryKey(cat);
    const styles = templateData.categoryStyles || {};
    const colors = templateData.categoryColors || FALLBACK_CATEGORY_COLORS;
    const style = styles[cat] || styles[normalized] || styles.GERAL;
    if (style && (style.background || style.textColor)) {
      return {
        background: style.background || colors[cat] || colors[normalized] || '#6c757d',
        textColor: style.textColor || '#FFFFFF'
      };
    }
    return { background: getCategoryColor(cat, colors), textColor: '#FFFFFF' };
  }
  function formatCategoryLabel(value, layerConfig) {
    const text = String(value == null ? '' : value).trim() || DEFAULT_PREVIEW.category;
    const t = normalizeTextTransform(layerConfig?.textTransform);
    if (t === 'uppercase') return text.toUpperCase();
    if (t === 'lowercase') return text.toLowerCase();
    if (t === 'capitalize') return text.toLowerCase().replace(/(^|\s)(\S)/g, function (_, l, c) { return l + c.toUpperCase(); });
    return text;
  }
  function normalizeTextTransform(value) {
    const t = String(value || 'uppercase').trim().toLowerCase();
    if (t === 'none' || t === 'lowercase' || t === 'capitalize') return t;
    return 'uppercase';
  }
  function normalizeCategoryKey(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  }
  function calculateBadgeWidth(label, fontSize, paddingX, letterSpacing) {
    const approx = String(label || '').length * Math.max(12, fontSize * 0.62);
    const tracking = Math.max(0, String(label || '').length - 1) * numOr(letterSpacing, 0);
    return Math.max(MIN_BADGE_WIDTH, Math.ceil(approx + tracking + paddingX * 2));
  }
  function measureBadgeTextWidth(textNode) {
    if (!textNode) return 0;
    const text = textNode.text ? textNode.text() : '';
    const ls = textNode.letterSpacing ? textNode.letterSpacing() : 0;
    const tracking = Math.max(0, String(text || '').length - 1) * numOr(ls, 0);
    if (typeof textNode.getTextWidth === 'function') return textNode.getTextWidth() + tracking;
    return textNode.width() + tracking;
  }
  function resizeBadgeToText(group) {
    if (!group) return;
    const bg = group.findOne('.badge-bg');
    const hit = group.findOne('.badge-hit');
    const text = group.findOne('.badge-text');
    if (!bg || !text) return;
    const padX = numOr(group.getAttr('paddingX'), text.x() || 24);
    const height = bg.height() || Math.max(1, text.fontSize() + numOr(group.getAttr('paddingY'), 14) * 2);
    const width = group.getAttr('autoWidth') === false ? bg.width()
      : Math.max(MIN_BADGE_WIDTH, Math.ceil(measureBadgeTextWidth(text) + padX * 2));
    setBadgeWidth(group, width);
    bg.height(height);
    text.x(padX);
    text.y((height - text.fontSize()) / 2 + 2);
    if (hit) hit.height(height);
    group.height(height);
  }
  function setBadgeWidth(group, width) {
    const bg = group.findOne('.badge-bg');
    const hit = group.findOne('.badge-hit');
    if (bg) bg.width(width);
    if (hit) hit.width(width);
    group.width(width);
  }
  function setBadgeHeight(group, height) {
    const bg = group.findOne('.badge-bg');
    const hit = group.findOne('.badge-hit');
    const text = group.findOne('.badge-text');
    if (bg) bg.height(height);
    if (hit) hit.height(height);
    if (text) text.y((height - text.fontSize()) / 2 + 2);
    group.height(height);
  }
  function updateSeparatorHitArea(group) {
    if (!group) return;
    const visible = group.findOne('.separator-visible');
    const hit = group.findOne('.separator-hit');
    if (!visible || !hit) return;
    const vh = visible.height();
    const hh = Math.max(SEPARATOR_HIT_HEIGHT, vh);
    hit.y(-Math.round((hh - vh) / 2));
    hit.height(hh);
    hit.width(visible.width());
    group.width(visible.width());
    group.height(hh);
  }
  function numOr(value, fallback) {
    const p = parseFloat(value);
    return Number.isFinite(p) ? p : fallback;
  }
  function clamp01(v) { return Math.min(1, Math.max(0, v)); }
  function escapeHtmlAttr(v) {
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function escapeHtmlText(v) {
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function colorToHex(c) {
    if (typeof c !== 'string') return '#ffffff';
    if (c.charAt(0) === '#') {
      if (c.length === 4) return '#' + c.charAt(1) + c.charAt(1) + c.charAt(2) + c.charAt(2) + c.charAt(3) + c.charAt(3);
      return c;
    }
    return '#ffffff';
  }
  function isHexColor(c) {
    return typeof c === 'string' && /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(c);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEditor);
  } else {
    initEditor();
  }
})();
