(function () {
  'use strict';

  let stage = null;
  let layer = null;
  let baseBlackObj = null;
  let bgImageObj = null;
  let templateData = null;
  let konvaElements = {};
  let selectedElement = null;
  let undoStack = [];
  let currentScale = 0.45;
  const CANVAS_WIDTH = 1080;
  const CANVAS_HEIGHT = 1920;
  const MIN_BADGE_WIDTH = 150;
  const SEPARATOR_HIT_HEIGHT = 34;
  const DEFAULT_FONT_FAMILY = 'Aileron';
  const REQUIRED_AILERON_FONT_QUERIES = [
    '400 24px Aileron',
    '700 24px Aileron',
    'normal 24px Aileron',
    'bold 24px Aileron'
  ];
  const ARTICLE_IMAGE_KEY = 'articleImage';
  const COMPONENT_TYPES = {
    category: 'badge',
    title: 'textBox',
    summary: 'textBox',
    watermark: 'textBox',
    separator: 'shapeLine'
  };
  const COMPONENT_LABELS = {
    category: 'Badge Categoria',
    title: 'Titulo',
    separator: 'Linha Decorativa',
    summary: 'Subtitulo',
    watermark: 'Watermark',
    articleImage: 'Imagem da Materia',
    bottomGradient: 'Gradiente Inferior'
  };
  const PRIMARY_LAYER_KEYS = ['category', 'title', 'separator', 'summary', 'watermark'];

  const FALLBACK_CATEGORY_COLORS = {
    OPINIAO: '#e63946', POLITICA: '#1d3557', ESPORTE: '#2a9d8f',
    SEGURANCA: '#e9c46a', ECONOMIA: '#f4a261', GERAL: '#6c757d'
  };

  const DEFAULT_PREVIEW = {
    category: 'GERAL',
    title: 'Titulo de teste do template',
    summary: 'Subtitulo de teste para voce verificar posicoes no editor visual.'
  };

  function showStatus(message, type) {
    const banner = document.getElementById('statusBanner');
    if (!banner) return;
    banner.textContent = message;
    banner.className = 'status-banner ' + (type || 'info');
    if (type !== 'error') {
      setTimeout(function () { banner.style.display = 'none'; }, 3500);
    }
  }

  async function initEditor() {
    try {
      const res = await fetch('/api/template');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      templateData = await res.json();
    } catch (err) {
      showStatus('Erro ao carregar template. O backend (porta 3001) esta rodando?', 'error');
      return;
    }

    if (!templateData || !templateData.layers) {
      showStatus('Template invalido: campo "layers" ausente.', 'error');
      return;
    }

    await waitForTemplateFonts(templateData);

    stage = new Konva.Stage({
      container: 'konva-container',
      width: CANVAS_WIDTH * currentScale,
      height: CANVAS_HEIGHT * currentScale,
      scaleX: currentScale,
      scaleY: currentScale
    });

    layer = new Konva.Layer();
    stage.add(layer);

    await loadBackground();
    createElements();
    updateElementList();
    setupKeyboard();
    setupArticleImport();

    stage.on('click tap', function (e) {
      if (e.target === stage || e.target === bgImageObj) {
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

  function loadBackground() {
    return new Promise(function (resolve) {
      const image = new Image();
      image.onload = function () {
        bgImageObj = new Konva.Image({
          x: 0, y: 0,
          image: image,
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          name: 'background',
          listening: false
        });
        layer.add(bgImageObj);
        bgImageObj.moveToBottom();
        layer.draw();
        resolve();
      };
      image.onerror = function () {
        const rect = new Konva.Rect({
          x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT,
          fill: '#050510', name: 'background', listening: false
        });
        layer.add(rect);
        rect.moveToBottom();
        bgImageObj = rect;
        layer.draw();
        showStatus('Imagem de fundo /assets/template-base.png nao encontrada - usando fundo escuro.', 'info');
        resolve();
      };
      image.src = '/assets/template-base.png';
    });
  }

  function createElements() {
    const layers = templateData.layers || {};
    const categoryColors = templateData.categoryColors || FALLBACK_CATEGORY_COLORS;
    const defaults = templateData.defaults || {};
    const previewCategory = formatCategoryLabel(defaults.category || DEFAULT_PREVIEW.category, layers.category);
    const previewTitle = defaults.title || DEFAULT_PREVIEW.title;
    const previewSummary = defaults.summary || DEFAULT_PREVIEW.summary;

    if (layers.category) {
      const cat = layers.category;
      const catLabel = previewCategory;
      const badgeFontSize = toNumber(cat.fontSize, 22);
      const badgePaddingX = toNumber(cat.paddingX, 24);
      const badgePaddingY = toNumber(cat.paddingY, 14);
      const badgeAutoWidth = cat.autoWidth !== false;
      const badgeWidth = badgeAutoWidth
        ? calculateBadgeWidth(catLabel, badgeFontSize, badgePaddingX, toNumber(cat.letterSpacing, 0))
        : Math.max(1, toNumber(cat.width, MIN_BADGE_WIDTH));
      const badgeHeight = Math.max(1, toNumber(cat.height, badgeFontSize + badgePaddingY * 2));
      const badgeColor = getCategoryColor(catLabel, categoryColors);
      const configuredBadgeColor = isHexColor(cat.background) ? cat.background : badgeColor;

      const badgeGroup = new Konva.Group({
        x: cat.x, y: cat.y,
        width: badgeWidth,
        height: badgeHeight,
        draggable: true,
        name: 'category',
        id: 'category',
        componentType: 'badge',
        autoWidth: badgeAutoWidth,
        paddingX: badgePaddingX,
        paddingY: badgePaddingY,
        borderRadius: toNumber(cat.borderRadius, toNumber(cat.radius, 6)),
        fontFamily: getFontFamily(cat),
        fontWeight: normalizeFontWeight(cat.fontWeight, 'bold'),
        letterSpacing: toNumber(cat.letterSpacing, 0),
        textTransform: normalizeTextTransform(cat.textTransform)
      });

      const badgeHit = new Konva.Rect({
        width: badgeWidth,
        height: badgeHeight,
        fill: 'rgba(0,0,0,0)',
        name: 'badge-hit'
      });

      const badgeRect = new Konva.Rect({
        width: badgeWidth,
        height: badgeHeight,
        fill: configuredBadgeColor,
        cornerRadius: toNumber(cat.borderRadius, toNumber(cat.radius, 6)),
        name: 'badge-bg'
      });

      const badgeText = new Konva.Text({
        x: badgePaddingX,
        y: ((badgeHeight) - badgeFontSize) / 2 + 2,
        text: catLabel,
        fontSize: badgeFontSize,
        fontFamily: getFontFamily(cat),
        fontStyle: normalizeFontWeight(cat.fontWeight, 'bold'),
        letterSpacing: toNumber(cat.letterSpacing, 0),
        fill: cat.textColor || cat.color || '#ffffff',
        name: 'badge-text'
      });

      badgeGroup.add(badgeHit);
      badgeGroup.add(badgeRect);
      badgeGroup.add(badgeText);
      resizeBadgeToText(badgeGroup);
      setupElementEvents(badgeGroup, 'category');
      layer.add(badgeGroup);
      konvaElements.category = badgeGroup;
    }

    if (layers.title) {
      const tit = layers.title;
      const titleText = new Konva.Text({
        x: tit.x, y: tit.y,
        text: previewTitle,
        fontSize: tit.fontSize || 60,
        fontFamily: getFontFamily(tit),
        fontStyle: normalizeFontWeight(tit.fontWeight, 'bold'),
        fill: tit.color || '#ffffff',
        width: tit.maxWidth || 970,
        lineHeight: getKonvaLineHeight(tit),
        opacity: typeof tit.opacity === 'number' ? tit.opacity : 1,
        draggable: true,
        name: 'title',
        id: 'title',
        componentType: 'textBox'
      });
      setupElementEvents(titleText, 'title');
      layer.add(titleText);
      konvaElements.title = titleText;
    }

    if (layers.separator) {
      const sep = layers.separator;
      let sepY = sep.y;
      if (typeof sepY !== 'number') {
        const titleY = layers.title ? layers.title.y : 1180;
        const titleHeight = 72;
        sepY = titleY + titleHeight + (sep.marginTopAfterTitle || 18);
      }

      const lineWidth = sep.width || 220;
      const lineHeight = sep.height || 5;
      const hitHeight = Math.max(SEPARATOR_HIT_HEIGHT, lineHeight);
      const lineGroup = new Konva.Group({
        x: sep.x, y: sepY,
        width: lineWidth,
        height: hitHeight,
        draggable: true,
        name: 'separator',
        id: 'separator',
        componentType: 'shapeLine'
      });

      const lineHit = new Konva.Rect({
        x: 0,
        y: -Math.round((hitHeight - lineHeight) / 2),
        width: lineWidth,
        height: hitHeight,
        fill: 'rgba(0,0,0,0)',
        name: 'separator-hit'
      });

      const lineRect = new Konva.Rect({
        x: 0, y: 0,
        width: sep.width || 220,
        height: lineHeight,
        fill: sep.color || '#c11f25',
        cornerRadius: sep.radius || 2,
        name: 'separator-visible'
      });

      lineGroup.add(lineHit);
      lineGroup.add(lineRect);
      setupElementEvents(lineGroup, 'separator');
      layer.add(lineGroup);
      konvaElements.separator = lineGroup;
    }

    if (layers.summary) {
      const sum = layers.summary;
      let sumY = sum.y;
      if (typeof sumY !== 'number') {
        const sepY = konvaElements.separator ? konvaElements.separator.y() : 1300;
        sumY = sepY + 5 + (sum.marginTopAfterLine || 35);
      }

      const summaryText = new Konva.Text({
        x: sum.x, y: sumY,
        text: previewSummary,
        fontSize: sum.fontSize || 32,
        fontFamily: getFontFamily(sum),
        fontStyle: normalizeFontWeight(sum.fontWeight, 'normal'),
        fill: sum.color || '#E0E0E0',
        width: sum.maxWidth || 970,
        lineHeight: getKonvaLineHeight(sum),
        opacity: typeof sum.opacity === 'number' ? sum.opacity : 1,
        draggable: true,
        name: 'summary',
        id: 'summary',
        componentType: 'textBox'
      });
      setupElementEvents(summaryText, 'summary');
      layer.add(summaryText);
      konvaElements.summary = summaryText;
    }

    if (layers.watermark) {
      const wm = layers.watermark;
      const wmText = new Konva.Text({
        x: wm.x, y: wm.y,
        text: wm.text || 'URURAU.COM.BR',
        fontSize: wm.fontSize || 18,
        fontFamily: getFontFamily(wm),
        fontStyle: normalizeFontWeight(wm.fontWeight, 'normal'),
        fill: wm.color || '#ffffff',
        opacity: typeof wm.opacity === 'number' ? wm.opacity : 0.5,
        draggable: true,
        name: 'watermark',
        id: 'watermark',
        componentType: 'textBox'
      });
      setupElementEvents(wmText, 'watermark');
      layer.add(wmText);
      konvaElements.watermark = wmText;
    }

    getOrderedExtraLayerKeys(layers).forEach(function (key) {
      if (konvaElements[key]) return;
      const config = layers[key];
      const componentType = getComponentType(key, config);
      if (componentType === 'overlay') createOverlayElement(key, config);
      else if (componentType === 'image' || componentType === 'logo') createImageElement(key, config, componentType);
    });

    layer.draw();
  }

  function createOverlayElement(key, config) {
    const overlay = new Konva.Rect({
      x: toNumber(config.x, 0),
      y: toNumber(config.y, 0),
      width: Math.max(1, toNumber(config.width, CANVAS_WIDTH)),
      height: Math.max(1, toNumber(config.height, CANVAS_HEIGHT)),
      fill: config.fill || config.color || config.background || '#000000',
      opacity: toNumber(config.opacity, 0.35),
      cornerRadius: toNumber(config.borderRadius, toNumber(config.radius, 0)),
      draggable: true,
      name: key,
      id: key,
      componentType: 'overlay'
    });
    setupElementEvents(overlay, key);
    layer.add(overlay);
    overlay.moveToBottom();
    if (bgImageObj) bgImageObj.moveToBottom();
    konvaElements[key] = overlay;
  }

  function createImageElement(key, config, componentType) {
    const placeholder = new Konva.Rect({
      x: toNumber(config.x, 0),
      y: toNumber(config.y, 0),
      width: Math.max(1, toNumber(config.width, 160)),
      height: Math.max(1, toNumber(config.height, 80)),
      fill: 'rgba(255,255,255,0.08)',
      stroke: 'rgba(255,255,255,0.35)',
      dash: [8, 6],
      opacity: toNumber(config.opacity, 1),
      draggable: true,
      name: key,
      id: key,
      componentType: componentType
    });
    setupElementEvents(placeholder, key);
    layer.add(placeholder);
    konvaElements[key] = placeholder;

    const src = config.src || config.image || config.url;
    if (!src) return;
    const image = new Image();
    image.onload = function () {
      const imageNode = new Konva.Image({
        x: placeholder.x(),
        y: placeholder.y(),
        width: placeholder.width(),
        height: placeholder.height(),
        image: image,
        opacity: placeholder.opacity(),
        draggable: true,
        name: key,
        id: key,
        componentType: componentType
      });
      placeholder.destroy();
      setupElementEvents(imageNode, key);
      layer.add(imageNode);
      konvaElements[key] = imageNode;
      layer.draw();
      updateElementList();
    };
    image.onerror = function () {
      showStatus('Imagem do componente "' + key + '" nao encontrada.', 'info');
    };
    image.src = src;
  }

  function setupElementEvents(node, key) {
    node.on('dragstart', function () {
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
      if (node.getClassName() === 'Text') editTextInline(node, key);
      if (key === 'category' && node.getClassName() === 'Group') {
        const badgeText = node.findOne('.badge-text');
        if (badgeText) editTextInline(badgeText, key);
      }
    });
    node.on('mouseenter', function () { document.body.style.cursor = 'move'; });
    node.on('mouseleave', function () { document.body.style.cursor = 'default'; });
  }

  function selectElement(key) {
    deselectAllVisuals();
    selectedElement = key;
    const node = konvaElements[key];
    if (!node) return;
    drawSelectionIndicator(node);
    updatePropertiesPanel(key);
    updateElementList();
  }

  function drawSelectionIndicator(node) {
    const box = node.getClientRect({ relativeTo: layer });
    const selectionRect = new Konva.Rect({
      x: box.x - 4, y: box.y - 4,
      width: box.width + 8, height: box.height + 8,
      stroke: '#E63946',
      strokeWidth: 2,
      dash: [5, 5],
      name: 'selection-indicator',
      listening: false
    });
    layer.add(selectionRect);
    selectionRect.moveToTop();
    layer.draw();
  }

  function refreshSelectionIndicator() {
    if (!selectedElement) return;
    const node = konvaElements[selectedElement];
    if (!node) return;
    const indicators = layer.find('.selection-indicator');
    indicators.forEach(function (ind) { ind.destroy(); });
    drawSelectionIndicator(node);
  }

  function deselectAllVisuals() {
    const indicators = layer.find('.selection-indicator');
    indicators.forEach(function (ind) { ind.destroy(); });
    layer.draw();
  }

  function deselectAll() {
    selectedElement = null;
    deselectAllVisuals();
    updateElementList();
    document.getElementById('propertiesPanel').innerHTML =
      '<p style="color:#666;font-size:12px">Selecione um elemento no canvas para editar.</p>';
  }

  window.selectElementFromList = selectElement;

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
        textNode.text(formatCategoryLabel(area.value, (templateData.layers || {}).category));
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

  function updateElementList() {
    const list = document.getElementById('elementList');
    if (!list) return;
    let html = '';
    Object.keys(konvaElements).forEach(function (key) {
      const node = konvaElements[key];
      const isActive = selectedElement === key ? 'active' : '';
      const pos = 'X:' + Math.round(node.x()) + ' Y:' + Math.round(node.y());
      html += '<div class="element-item ' + isActive +
        '" onclick="selectElementFromList(\'' + key + '\')">' +
        '<span>' + escapeHtmlText(getElementLabel(key)) + '</span>' +
        '<span class="element-type">' + getElementType(node, key) + ' ' + pos + '</span></div>';
    });
    list.innerHTML = html;
  }

  function updatePropertiesPanel(key) {
    const node = konvaElements[key];
    if (!node) return;
    const componentType = getElementType(node, key);
    let html = '<div class="tool-group"><label>Componente</label><input type="text" value="' +
      escapeHtmlAttr(getElementLabel(key) + ' / ' + componentType) + '" disabled></div>';
    html += '<div class="tool-row">' +
      numberControl(key, 'x', 'X', Math.round(node.x())) +
      numberControl(key, 'y', 'Y', Math.round(node.y())) +
      '</div>';

    if (componentType === 'badge') html += renderBadgeControls(key, node);
    else if (componentType === 'shapeLine') html += renderShapeLineControls(key, node);
    else if (componentType === 'textBox') html += renderTextBoxControls(key, node);
    else if (componentType === 'overlay') html += renderOverlayControls(key, node);
    else if (componentType === 'image' || componentType === 'logo') html += renderImageControls(key, node);
    else html += renderBasicShapeControls(key, node);

    document.getElementById('propertiesPanel').innerHTML = html;
  }

  function renderBadgeControls(key, node) {
    const badgeBg = node.findOne('.badge-bg');
    const badgeText = node.findOne('.badge-text');
    if (!badgeBg || !badgeText) return '';
    const autoWidth = node.getAttr('autoWidth') !== false;
    return textControl(key, 'text', 'Texto da editoria', badgeText.text()) +
      '<div class="tool-row">' +
      numberControl(key, 'width', 'Largura', Math.round(badgeBg.width())) +
      numberControl(key, 'height', 'Altura', Math.round(badgeBg.height())) +
      '</div>' +
      checkboxControl(key, 'autoWidth', 'Auto largura', autoWidth) +
      '<div class="tool-row">' +
      colorControl(key, 'background', 'Fundo', badgeBg.fill()) +
      colorControl(key, 'textColor', 'Cor do texto', badgeText.fill()) +
      '</div>' +
      textControl(key, 'fontFamily', 'Fonte', badgeText.fontFamily()) +
      '<div class="tool-row">' +
      selectControl(key, 'fontWeight', 'Peso', badgeText.fontStyle(), ['normal', 'bold', '400', '700']) +
      selectControl(key, 'textTransform', 'Transformacao', node.getAttr('textTransform') || 'uppercase', ['uppercase', 'none', 'lowercase', 'capitalize']) +
      '</div>' +
      '<div class="tool-row">' +
      numberControl(key, 'fontSize', 'Fonte (px)', badgeText.fontSize()) +
      numberControl(key, 'letterSpacing', 'Espacamento', badgeText.letterSpacing ? badgeText.letterSpacing() : 0) +
      '</div>' +
      '<div class="tool-row">' +
      numberControl(key, 'paddingX', 'Padding X', node.getAttr('paddingX')) +
      numberControl(key, 'paddingY', 'Padding Y', node.getAttr('paddingY')) +
      '</div>' +
      '<div class="tool-row">' +
      numberControl(key, 'borderRadius', 'Raio', badgeBg.cornerRadius()) +
      rangeControl(key, 'opacity', 'Opacidade', node.opacity()) +
      '</div>';
  }

  function renderShapeLineControls(key, node) {
    const visible = node.findOne('.separator-visible') || node;
    return '<div class="tool-row">' +
      numberControl(key, 'width', 'Largura', Math.round(visible.width())) +
      numberControl(key, 'height', 'Altura visual', Math.round(visible.height())) +
      '</div>' +
      '<div class="tool-row">' +
      colorControl(key, 'color', 'Cor', visible.fill()) +
      rangeControl(key, 'opacity', 'Opacidade', node.opacity()) +
      '</div>';
  }

  function renderTextBoxControls(key, node) {
    return textControl(key, 'text', 'Texto', node.text()) +
      '<div class="tool-row">' +
      numberControl(key, 'width', 'Largura', Math.round(node.width())) +
      numberControl(key, 'fontSize', 'Fonte (px)', node.fontSize()) +
      '</div>' +
      '<div class="tool-row">' +
      numberControl(key, 'lineHeightPx', 'Linha (px)', getTextLineHeightPx(node)) +
      colorControl(key, 'color', 'Cor', node.fill()) +
      '</div>' +
      textControl(key, 'fontFamily', 'Fonte', node.fontFamily()) +
      '<div class="tool-row">' +
      selectControl(key, 'fontWeight', 'Peso', node.fontStyle() || 'normal', ['normal', 'bold', '400', '700']) +
      rangeControl(key, 'opacity', 'Opacidade', node.opacity()) +
      '</div>';
  }

  function renderOverlayControls(key, node) {
    return '<div class="tool-row">' +
      numberControl(key, 'width', 'Largura', Math.round(node.width())) +
      numberControl(key, 'height', 'Altura', Math.round(node.height())) +
      '</div>' +
      '<div class="tool-row">' +
      colorControl(key, 'color', 'Cor', node.fill()) +
      rangeControl(key, 'opacity', 'Opacidade', node.opacity()) +
      '</div>' +
      numberControl(key, 'borderRadius', 'Raio', node.cornerRadius ? node.cornerRadius() : 0);
  }

  function renderImageControls(key, node) {
    return '<div class="tool-row">' +
      numberControl(key, 'width', 'Largura', Math.round(node.width())) +
      numberControl(key, 'height', 'Altura', Math.round(node.height())) +
      '</div>' +
      rangeControl(key, 'opacity', 'Opacidade', node.opacity());
  }

  function renderBasicShapeControls(key, node) {
    let html = '<div class="tool-row">' +
      numberControl(key, 'width', 'Largura', Math.round(node.width ? node.width() : 0)) +
      numberControl(key, 'height', 'Altura', Math.round(node.height ? node.height() : 0)) +
      '</div>';
    if (node.fill) html += colorControl(key, 'color', 'Cor', node.fill());
    return html;
  }

  function updateNodeProp(key, prop, value) {
    const node = konvaElements[key];
    if (!node) return;
    saveUndo();
    const componentType = getElementType(node, key);
    if (componentType === 'badge') {
      updateBadgeProp(node, prop, value);
    } else if (componentType === 'shapeLine') {
      updateShapeLineProp(node, prop, value);
    } else if (componentType === 'textBox') {
      updateTextBoxProp(node, prop, value);
    } else if (componentType === 'overlay') {
      updateOverlayProp(node, prop, value);
    } else if (componentType === 'image' || componentType === 'logo') {
      updateImageProp(node, prop, value);
    } else if (prop === 'x' || prop === 'y' || prop === 'width' || prop === 'height' || prop === 'fontSize') {
      node.setAttr(prop, parseFloat(value));
    } else if (prop === 'opacity') {
      node.opacity(parseFloat(value));
    } else if (prop === 'fill') {
      node.fill(value);
    } else if (prop === 'text') {
      if (node.getClassName() === 'Text') node.text(value);
    } else {
      node.setAttr(prop, value);
    }
    layer.draw();
    updateElementList();
    updatePropertiesPanel(key);
    refreshSelectionIndicator();
  }
  window.updateNodePropFromInput = updateNodeProp;

  function updateBadgeColor(key, color) {
    updateNodeProp(key, 'background', color);
  }
  window.updateBadgeColor = updateBadgeColor;

  function updateBadgeProp(group, prop, value) {
    const badgeBg = group.findOne('.badge-bg');
    const badgeText = group.findOne('.badge-text');
    if (prop === 'x' || prop === 'y') {
      group.setAttr(prop, toNumber(value, group.getAttr(prop)));
      return;
    }
    if (prop === 'text' && badgeText) {
      badgeText.text(formatCategoryLabel(value, { textTransform: group.getAttr('textTransform') }));
      resizeBadgeToText(group);
      return;
    }
    if ((prop === 'background' || prop === 'color' || prop === 'fill') && badgeBg) {
      badgeBg.fill(value);
      return;
    }
    if (prop === 'textColor' && badgeText) {
      badgeText.fill(value);
      return;
    }
    if (prop === 'fontFamily' && badgeText) {
      badgeText.fontFamily(normalizeFontFamily(value));
      group.setAttr('fontFamily', normalizeFontFamily(value));
      resizeBadgeToText(group);
      return;
    }
    if (prop === 'fontWeight' && badgeText) {
      const fontWeight = normalizeFontWeight(value, 'bold');
      badgeText.fontStyle(fontWeight);
      group.setAttr('fontWeight', fontWeight);
      resizeBadgeToText(group);
      return;
    }
    if (prop === 'fontSize' && badgeText) {
      badgeText.fontSize(Math.max(1, toNumber(value, badgeText.fontSize())));
      resizeBadgeToText(group);
      return;
    }
    if (prop === 'letterSpacing' && badgeText) {
      badgeText.letterSpacing(toNumber(value, badgeText.letterSpacing ? badgeText.letterSpacing() : 0));
      group.setAttr('letterSpacing', badgeText.letterSpacing ? badgeText.letterSpacing() : 0);
      resizeBadgeToText(group);
      return;
    }
    if (prop === 'textTransform' && badgeText) {
      const textTransform = normalizeTextTransform(value);
      group.setAttr('textTransform', textTransform);
      badgeText.text(formatCategoryLabel(badgeText.text(), { textTransform }));
      resizeBadgeToText(group);
      return;
    }
    if (prop === 'width' && badgeBg) {
      const width = Math.max(1, Math.round(toNumber(value, badgeBg.width())));
      group.setAttr('autoWidth', false);
      setBadgeWidth(group, width);
      return;
    }
    if (prop === 'height' && badgeBg) {
      setBadgeHeight(group, Math.max(1, Math.round(toNumber(value, badgeBg.height()))));
      return;
    }
    if (prop === 'paddingX') {
      group.setAttr('paddingX', Math.max(0, Math.round(toNumber(value, group.getAttr('paddingX')))));
      resizeBadgeToText(group);
      return;
    }
    if (prop === 'paddingY') {
      const paddingY = Math.max(0, Math.round(toNumber(value, group.getAttr('paddingY'))));
      group.setAttr('paddingY', paddingY);
      if (badgeText) setBadgeHeight(group, Math.max(1, Math.round(badgeText.fontSize() + paddingY * 2)));
      return;
    }
    if (prop === 'borderRadius' && badgeBg) {
      badgeBg.cornerRadius(Math.max(0, toNumber(value, badgeBg.cornerRadius())));
      group.setAttr('borderRadius', badgeBg.cornerRadius());
      return;
    }
    if (prop === 'autoWidth') {
      group.setAttr('autoWidth', value === true || value === 'true');
      resizeBadgeToText(group);
      return;
    }
    if (prop === 'opacity') {
      group.opacity(clamp(toNumber(value, group.opacity()), 0, 1));
    }
  }

  function updateShapeLineProp(group, prop, value) {
    const separatorVisible = group.findOne('.separator-visible');
    const separatorHit = group.findOne('.separator-hit');
    if (prop === 'x' || prop === 'y') {
      group.setAttr(prop, toNumber(value, group.getAttr(prop)));
      return;
    }
    if (!separatorVisible) return;
    if (prop === 'width') {
      const width = Math.max(1, Math.round(toNumber(value, separatorVisible.width())));
      separatorVisible.width(width);
      if (separatorHit) separatorHit.width(width);
      group.width(width);
      return;
    }
    if (prop === 'height') {
      const height = Math.max(1, Math.round(toNumber(value, separatorVisible.height())));
      separatorVisible.height(height);
      updateSeparatorHitArea(group);
      return;
    }
    if (prop === 'color' || prop === 'fill') {
      separatorVisible.fill(value);
      return;
    }
    if (prop === 'opacity') {
      group.opacity(clamp(toNumber(value, group.opacity()), 0, 1));
    }
  }

  function updateTextBoxProp(node, prop, value) {
    if (prop === 'x' || prop === 'y') node.setAttr(prop, toNumber(value, node.getAttr(prop)));
    else if (prop === 'text') node.text(value);
    else if (prop === 'width') node.width(Math.max(1, toNumber(value, node.width())));
    else if (prop === 'fontSize') node.fontSize(Math.max(1, toNumber(value, node.fontSize())));
    else if (prop === 'fontFamily') node.fontFamily(normalizeFontFamily(value));
    else if (prop === 'fontWeight') node.fontStyle(normalizeFontWeight(value, 'normal'));
    else if (prop === 'color' || prop === 'fill') node.fill(value);
    else if (prop === 'lineHeightPx') node.lineHeight(Math.max(0.1, toNumber(value, getTextLineHeightPx(node)) / node.fontSize()));
    else if (prop === 'opacity') node.opacity(clamp(toNumber(value, node.opacity()), 0, 1));
  }

  function updateOverlayProp(node, prop, value) {
    if (prop === 'x' || prop === 'y') node.setAttr(prop, toNumber(value, node.getAttr(prop)));
    else if (prop === 'width') node.width(Math.max(1, toNumber(value, node.width())));
    else if (prop === 'height') node.height(Math.max(1, toNumber(value, node.height())));
    else if (prop === 'color' || prop === 'fill' || prop === 'background') node.fill(value);
    else if (prop === 'opacity') node.opacity(clamp(toNumber(value, node.opacity()), 0, 1));
    else if (prop === 'borderRadius' && node.cornerRadius) node.cornerRadius(Math.max(0, toNumber(value, node.cornerRadius())));
  }

  function updateImageProp(node, prop, value) {
    if (prop === 'x' || prop === 'y') node.setAttr(prop, toNumber(value, node.getAttr(prop)));
    else if (prop === 'width') {
      node.width(Math.max(1, toNumber(value, node.width())));
      if (node.image && node.image()) applyImageCoverCrop(node, node.image());
    } else if (prop === 'height') {
      node.height(Math.max(1, toNumber(value, node.height())));
      if (node.image && node.image()) applyImageCoverCrop(node, node.image());
    }
    else if (prop === 'opacity') node.opacity(clamp(toNumber(value, node.opacity()), 0, 1));
  }

  function setupArticleImport() {
    window.addEventListener('message', function (event) {
      if (event.origin !== window.location.origin) return;
      const message = event.data || {};
      if (message.type !== 'autopost:article-data') return;
      applyArticleData(message.payload || {});
    });
  }

  function applyArticleData(article) {
    const data = {
      category: cleanImportedText(article.category),
      title: cleanImportedText(article.title),
      summary: cleanImportedText(article.summary),
      image: cleanImportedText(article.image)
    };
    if (!data.category && !data.title && !data.summary && !data.image) return;

    saveUndo();

    if (data.category && konvaElements.category) {
      updateBadgeProp(konvaElements.category, 'text', data.category);
      const badgeBg = konvaElements.category.findOne('.badge-bg');
      if (badgeBg) badgeBg.fill(getCategoryColor(data.category, templateData.categoryColors || FALLBACK_CATEGORY_COLORS));
    }
    if (data.title && konvaElements.title) konvaElements.title.text(data.title);
    if (data.summary && konvaElements.summary) konvaElements.summary.text(data.summary);
    if (data.image) setArticleImage(data.image);

    layer.draw();
    updateElementList();
    if (selectedElement) updatePropertiesPanel(selectedElement);
    refreshSelectionIndicator();
    showStatus('Dados da materia aplicados ao editor.', 'success');
  }

  function setArticleImage(url) {
    loadArticleImage(url, false);
  }

  function loadArticleImage(url, allowTaintedCanvas) {
    const existing = konvaElements[ARTICLE_IMAGE_KEY];
    const image = new Image();
    if (!allowTaintedCanvas) image.crossOrigin = 'anonymous';
    image.onload = function () {
      const node = existing && existing.getClassName() === 'Image'
        ? existing
        : new Konva.Image({
            x: 0,
            y: 0,
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            draggable: true,
            name: ARTICLE_IMAGE_KEY,
            id: ARTICLE_IMAGE_KEY,
            componentType: 'image',
            transient: true,
            opacity: existing ? existing.opacity() : 0.92
          });

      node.image(image);
      node.setAttr('src', url);
      node.setAttr('taintedImage', allowTaintedCanvas);
      applyImageCoverCrop(node, image);
      setupImportedImageNode(node, existing);
    };
    image.onerror = function () {
      if (!allowTaintedCanvas) {
        loadArticleImage(url, true);
        return;
      }
      showStatus('Nao foi possivel carregar a imagem principal da materia no editor.', 'error');
    };
    image.src = url;
  }

  function setupImportedImageNode(node, existing) {
    if (!existing) {
      setupElementEvents(node, ARTICLE_IMAGE_KEY);
      layer.add(node);
      konvaElements[ARTICLE_IMAGE_KEY] = node;
    } else if (existing !== node) {
      existing.destroy();
      setupElementEvents(node, ARTICLE_IMAGE_KEY);
      layer.add(node);
      konvaElements[ARTICLE_IMAGE_KEY] = node;
    }
    positionArticleImage(node);
    layer.draw();
    updateElementList();
  }

  function positionArticleImage(node) {
    if (bgImageObj) node.moveAbove(bgImageObj);
    else node.moveToBottom();
    PRIMARY_LAYER_KEYS.forEach(function (key) {
      if (konvaElements[key]) konvaElements[key].moveToTop();
    });
  }

  function applyImageCoverCrop(node, image) {
    const targetWidth = node.width();
    const targetHeight = node.height();
    const imageWidth = image.naturalWidth || image.width || targetWidth;
    const imageHeight = image.naturalHeight || image.height || targetHeight;
    const scale = Math.max(targetWidth / imageWidth, targetHeight / imageHeight);
    const cropWidth = targetWidth / scale;
    const cropHeight = targetHeight / scale;
    node.crop({
      x: Math.max(0, (imageWidth - cropWidth) / 2),
      y: Math.max(0, (imageHeight - cropHeight) / 2),
      width: cropWidth,
      height: cropHeight
    });
  }

  function cleanImportedText(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function setupKeyboard() {
    document.addEventListener('keydown', function (e) {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (!selectedElement) return;
      const node = konvaElements[selectedElement];
      if (!node) return;
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
    Object.keys(konvaElements).forEach(function (key) {
      const node = konvaElements[key];
      state[key] = { x: node.x(), y: node.y() };
      if (node.getClassName() === 'Text') state[key].text = node.text();
    });
    undoStack.push(state);
    if (undoStack.length > 30) undoStack.shift();
  }

  function persistBadge(next, target, node) {
    const badgeBg = node.findOne('.badge-bg');
    const badgeText = node.findOne('.badge-text');
    if (!badgeBg || !badgeText) return;
    const catLabel = formatCategoryLabel(badgeText.text(), { textTransform: node.getAttr('textTransform') });
    target.text = catLabel;
    target.width = Math.round(badgeBg.width());
    target.height = Math.round(badgeBg.height());
    target.background = badgeBg.fill();
    target.textColor = badgeText.fill();
    target.color = badgeText.fill();
    target.fontFamily = badgeText.fontFamily();
    target.fontWeight = badgeText.fontStyle() || 'normal';
    target.fontSize = badgeText.fontSize();
    target.letterSpacing = badgeText.letterSpacing ? badgeText.letterSpacing() : 0;
    target.paddingX = Math.round(toNumber(node.getAttr('paddingX'), 24));
    target.paddingY = Math.round(toNumber(node.getAttr('paddingY'), 14));
    target.borderRadius = Math.round(toNumber(badgeBg.cornerRadius(), 0));
    target.radius = target.borderRadius;
    target.autoWidth = node.getAttr('autoWidth') !== false;
    target.textTransform = normalizeTextTransform(node.getAttr('textTransform'));
    target.opacity = node.opacity();
    if (!next.defaults) next.defaults = {};
    next.defaults.category = catLabel;
    if (!next.categoryColors) next.categoryColors = {};
    next.categoryColors[catLabel] = badgeBg.fill();
    const normalized = normalizeCategoryKey(catLabel);
    if (normalized && normalized !== catLabel) next.categoryColors[normalized] = badgeBg.fill();
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
    target.width = Math.round(node.width());
    target.maxWidth = Math.round(node.width());
    target.fontFamily = node.fontFamily();
    target.fontWeight = node.fontStyle() || 'normal';
    target.fontSize = node.fontSize();
    target.lineHeight = Math.round(getTextLineHeightPx(node));
    target.color = node.fill();
    target.opacity = node.opacity();
    if (key === 'watermark') target.text = node.text();
    if (key === 'title') {
      if (!next.defaults) next.defaults = {};
      next.defaults.title = node.text();
    }
    if (key === 'summary') {
      if (!next.defaults) next.defaults = {};
      next.defaults.summary = node.text();
    }
  }

  function persistOverlay(target, node) {
    target.width = Math.round(node.width());
    target.height = Math.round(node.height());
    target.color = node.fill();
    target.background = node.fill();
    target.opacity = node.opacity();
    if (node.cornerRadius) target.borderRadius = Math.round(toNumber(node.cornerRadius(), 0));
  }

  function persistImage(target, node) {
    target.width = Math.round(node.width());
    target.height = Math.round(node.height());
    target.opacity = node.opacity();
    const src = node.getAttr('src') || node.getAttr('image') || node.getAttr('url');
    if (src) target.src = src;
  }

  function buildTemplateSnapshot(includeTransient) {
    if (!templateData) return;
    const next = JSON.parse(JSON.stringify(templateData));
    if (!next.layers) next.layers = {};
    Object.keys(konvaElements).forEach(function (key) {
      const node = konvaElements[key];
      if (node.getAttr('transient') && !includeTransient) return;
      if (!next.layers[key]) next.layers[key] = {};
      const target = next.layers[key];
      target.x = Math.round(node.x());
      target.y = Math.round(node.y());
      const componentType = getElementType(node, key);
      target.type = componentType;
      if (componentType === 'badge') persistBadge(next, target, node);
      else if (componentType === 'shapeLine') persistShapeLine(target, node);
      else if (componentType === 'textBox') persistTextBox(next, target, key, node);
      else if (componentType === 'overlay') persistOverlay(target, node);
      else if (componentType === 'image' || componentType === 'logo') persistImage(target, node);
    });
    return next;
  }

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

  function generatePreviewKonva() {
    const indicators = layer.find('.selection-indicator');
    indicators.forEach(function (ind) { ind.visible(false); });
    stage.scale({ x: 1, y: 1 });
    stage.width(CANVAS_WIDTH);
    stage.height(CANVAS_HEIGHT);
    layer.draw();
    let dataURL = '';
    try {
      dataURL = stage.toDataURL({ pixelRatio: 1, mimeType: 'image/png' });
    } catch (err) {
      applyStageScale();
      indicators.forEach(function (ind) { ind.visible(true); });
      layer.draw();
      showStatus('Preview PNG bloqueado pela imagem remota sem CORS. O editor continua editavel.', 'error');
      return;
    }
    applyStageScale();
    indicators.forEach(function (ind) { ind.visible(true); });
    layer.draw();
    const win = window.open();
    if (win) {
      win.document.write('<title>Preview do Editor</title><body style="margin:0;background:#0a0a1a;display:flex;justify-content:center;align-items:center;min-height:100vh"><img src="' + dataURL + '" style="max-width:100%;max-height:100vh"></body>');
    } else {
      showStatus('Bloqueador de pop-up impediu abrir o preview.', 'error');
    }
  }

  async function generatePreviewReal() {
    showStatus('Gerando preview real...', 'info');
    try {
      const previewTemplate = buildTemplateSnapshot(true);
      const articleImageLayer = previewTemplate?.layers?.[ARTICLE_IMAGE_KEY] || {};
      const res = await fetch('/api/template/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: konvaElements.title ? konvaElements.title.text() : DEFAULT_PREVIEW.title,
          summary: konvaElements.summary ? konvaElements.summary.text() : DEFAULT_PREVIEW.summary,
          category: konvaElements.category && konvaElements.category.findOne('.badge-text')
            ? konvaElements.category.findOne('.badge-text').text()
            : DEFAULT_PREVIEW.category,
          imageUrl: articleImageLayer.src || '',
          template: previewTemplate
        })
      });
      const data = await res.json().catch(function () { return {}; });
      if (!res.ok || !data.mediaPath) {
        showStatus('Falha no preview: ' + (data.error || 'erro desconhecido'), 'error');
        return;
      }
      const url = '/api/media?path=' + encodeURIComponent(data.mediaPath);
      const win = window.open();
      if (win) {
        win.document.write('<title>Preview Real (API)</title><body style="margin:0;background:#0a0a1a;display:flex;justify-content:center;align-items:center;min-height:100vh"><img src="' + url + '" style="max-width:100%;max-height:100vh"></body>');
      } else {
        showStatus('Bloqueador de pop-up impediu abrir o preview.', 'error');
      }
      showStatus('Preview real gerado.', 'success');
    } catch (err) {
      showStatus('Erro ao gerar preview real.', 'error');
    }
  }

  async function resetPositions() {
    if (!confirm('Restaurar posicoes para o padrao?')) return;
    try {
      const res = await fetch('/api/template/reset', { method: 'POST' });
      const result = await res.json().catch(function () { return {}; });
      if (res.ok && result.template) {
        templateData = result.template;
        Object.keys(konvaElements).forEach(function (k) { konvaElements[k].destroy(); });
        konvaElements = {};
        deselectAllVisuals();
        createElements();
        updateElementList();
        deselectAll();
        showStatus('Posicoes restauradas.', 'success');
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

  function getComponentType(key, config) {
    if (config && config.type) return config.type;
    if (COMPONENT_TYPES[key]) return COMPONENT_TYPES[key];
    if (/overlay/i.test(key)) return 'overlay';
    if (/logo/i.test(key)) return 'logo';
    if (config && (config.src || config.image || config.url)) return 'image';
    if (config && typeof config.text === 'string') return 'textBox';
    if (config && typeof config.width === 'number' && typeof config.height === 'number') return 'overlay';
    return 'textBox';
  }

  function getElementType(node, key) {
    return node.getAttr('componentType') || getComponentType(key, (templateData.layers || {})[key] || {});
  }

  function getElementLabel(key) {
    const config = (templateData.layers || {})[key] || {};
    return config.label || COMPONENT_LABELS[key] || key;
  }

  function getOrderedExtraLayerKeys(layers) {
    const primary = new Set(PRIMARY_LAYER_KEYS);
    return Object.keys(layers).filter(function (key) {
      if (primary.has(key)) return false;
      const type = getComponentType(key, layers[key]);
      return type === 'overlay' || type === 'image' || type === 'logo';
    });
  }

  async function waitForTemplateFonts(template) {
    if (!document.fonts || typeof document.fonts.load !== 'function') return;
    const missing = [];
    await Promise.all(REQUIRED_AILERON_FONT_QUERIES.map(async function (query) {
      try {
        await document.fonts.load(query);
        if (!document.fonts.check(query)) missing.push(query);
      } catch (err) {
        missing.push(query);
      }
    }));
    try {
      await document.fonts.ready;
    } catch (err) {
      // Font readiness is best-effort; explicit checks above decide whether to warn.
    }
    if (missing.length) {
      showStatus('Fonte obrigatoria Aileron nao carregada nos pesos 400/700. Verifique os arquivos OTF.', 'error');
    }
  }

  function getFontFamily(config) {
    return normalizeFontFamily(config?.fontFamily || DEFAULT_FONT_FAMILY);
  }

  function normalizeFontFamily(value) {
    const family = String(value || DEFAULT_FONT_FAMILY).split(',')[0].trim();
    if (!family) return DEFAULT_FONT_FAMILY;
    if (/^Aileron(Regular|Bold)?$/i.test(family)) return DEFAULT_FONT_FAMILY;
    if (/^(Arial|Helvetica|sans-serif)$/i.test(family)) return DEFAULT_FONT_FAMILY;
    return family;
  }

  function normalizeFontWeight(value, fallback) {
    const weight = String(value || fallback || 'normal').trim().toLowerCase();
    if (weight === '700') return 'bold';
    if (weight === '400') return 'normal';
    if (weight === 'bold' || weight === 'normal') return weight;
    return weight || fallback || 'normal';
  }

  function getKonvaLineHeight(config) {
    const fontSize = toNumber(config?.fontSize, 16);
    const lineHeight = toNumber(config?.lineHeight, fontSize * 1.2);
    return lineHeight / fontSize;
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
    const safeValue = clamp(toNumber(value, 1), 0, 1);
    return '<div class="tool-group"><label>' + label + ' (' + safeValue.toFixed(2) + ')</label><input type="range" min="0" max="1" step="0.05" value="' +
      safeValue +
      '" onchange="updateNodePropFromInput(\'' + key + '\', \'' + prop + '\', this.value)"></div>';
  }

  function checkboxControl(key, prop, label, checked) {
    return '<div class="tool-group"><label>' + label + '</label><input type="checkbox" ' +
      (checked ? 'checked ' : '') +
      'onchange="updateNodePropFromInput(\'' + key + '\', \'' + prop + '\', this.checked)"></div>';
  }

  function selectControl(key, prop, label, value, options) {
    let html = '<div class="tool-group"><label>' + label + '</label><select onchange="updateNodePropFromInput(\'' + key + '\', \'' + prop + '\', this.value)">';
    options.forEach(function (option) {
      html += '<option value="' + escapeHtmlAttr(option) + '"' + (String(option) === String(value) ? ' selected' : '') + '>' + escapeHtmlText(option) + '</option>';
    });
    return html + '</select></div>';
  }

  function getCategoryColor(label, categoryColors) {
    const colors = categoryColors || {};
    const exact = formatCategoryLabel(label, (templateData.layers || {}).category);
    const normalized = normalizeCategoryKey(exact);
    return colors[exact] || colors[normalized] || colors.GERAL ||
      FALLBACK_CATEGORY_COLORS[normalized] || FALLBACK_CATEGORY_COLORS.GERAL;
  }

  function formatCategoryLabel(value, layerConfig) {
    const text = String(value == null ? '' : value).trim() || DEFAULT_PREVIEW.category;
    const transform = normalizeTextTransform(layerConfig?.textTransform);
    if (transform === 'uppercase') return text.toUpperCase();
    if (transform === 'lowercase') return text.toLowerCase();
    if (transform === 'capitalize') return text.toLowerCase().replace(/(^|\s)(\S)/g, function (_, lead, letter) {
      return lead + letter.toUpperCase();
    });
    return text;
  }

  function normalizeTextTransform(value) {
    const transform = String(value || 'uppercase').trim().toLowerCase();
    if (transform === 'none' || transform === 'lowercase' || transform === 'capitalize') return transform;
    return 'uppercase';
  }

  function normalizeCategoryKey(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
  }

  function calculateBadgeWidth(label, fontSize, paddingX, letterSpacing) {
    const approximateTextWidth = String(label || '').length * Math.max(12, fontSize * 0.62);
    const trackingWidth = Math.max(0, String(label || '').length - 1) * toNumber(letterSpacing, 0);
    return Math.max(MIN_BADGE_WIDTH, Math.ceil(approximateTextWidth + trackingWidth + paddingX * 2));
  }

  function measureBadgeTextWidth(textNode) {
    if (!textNode) return 0;
    const text = textNode.text ? textNode.text() : '';
    const letterSpacing = textNode.letterSpacing ? textNode.letterSpacing() : 0;
    const trackingWidth = Math.max(0, String(text || '').length - 1) * toNumber(letterSpacing, 0);
    if (typeof textNode.getTextWidth === 'function') return textNode.getTextWidth() + trackingWidth;
    return textNode.width() + trackingWidth;
  }

  function resizeBadgeToText(group) {
    if (!group) return;
    const badgeBg = group.findOne('.badge-bg');
    const badgeHit = group.findOne('.badge-hit');
    const badgeText = group.findOne('.badge-text');
    if (!badgeBg || !badgeText) return;
    const paddingX = toNumber(group.getAttr('paddingX'), badgeText.x() || 24);
    const height = badgeBg.height() || Math.max(1, badgeText.fontSize() + toNumber(group.getAttr('paddingY'), 14) * 2);
    const width = group.getAttr('autoWidth') === false
      ? badgeBg.width()
      : Math.max(MIN_BADGE_WIDTH, Math.ceil(measureBadgeTextWidth(badgeText) + paddingX * 2));
    setBadgeWidth(group, width);
    badgeBg.height(height);
    badgeText.x(paddingX);
    badgeText.y((height - badgeText.fontSize()) / 2 + 2);
    if (badgeHit) {
      badgeHit.height(height);
    }
    group.height(height);
  }

  function setBadgeWidth(group, width) {
    const badgeBg = group.findOne('.badge-bg');
    const badgeHit = group.findOne('.badge-hit');
    if (badgeBg) badgeBg.width(width);
    if (badgeHit) badgeHit.width(width);
    group.width(width);
  }

  function setBadgeHeight(group, height) {
    const badgeBg = group.findOne('.badge-bg');
    const badgeHit = group.findOne('.badge-hit');
    const badgeText = group.findOne('.badge-text');
    if (badgeBg) badgeBg.height(height);
    if (badgeHit) badgeHit.height(height);
    if (badgeText) badgeText.y((height - badgeText.fontSize()) / 2 + 2);
    group.height(height);
  }

  function updateSeparatorHitArea(group) {
    if (!group) return;
    const separatorVisible = group.findOne('.separator-visible');
    const separatorHit = group.findOne('.separator-hit');
    if (!separatorVisible || !separatorHit) return;
    const visualHeight = separatorVisible.height();
    const hitHeight = Math.max(SEPARATOR_HIT_HEIGHT, visualHeight);
    separatorHit.y(-Math.round((hitHeight - visualHeight) / 2));
    separatorHit.height(hitHeight);
    separatorHit.width(separatorVisible.width());
    group.width(separatorVisible.width());
    group.height(hitHeight);
  }

  function toNumber(value, fallback) {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

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
