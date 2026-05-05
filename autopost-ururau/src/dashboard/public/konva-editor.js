(function () {
  'use strict';

  let stage = null;
  let layer = null;
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
      const badgeWidth = calculateBadgeWidth(catLabel, cat.fontSize || 22, cat.paddingX || 24);
      const badgeColor = getCategoryColor(catLabel, categoryColors);
      const configuredBadgeColor = isHexColor(cat.background) ? cat.background : badgeColor;

      const badgeGroup = new Konva.Group({
        x: cat.x, y: cat.y,
        width: badgeWidth,
        height: cat.height || 52,
        draggable: true,
        name: 'category',
        id: 'category'
      });

      const badgeHit = new Konva.Rect({
        width: badgeWidth,
        height: cat.height || 52,
        fill: 'rgba(0,0,0,0)',
        name: 'badge-hit'
      });

      const badgeRect = new Konva.Rect({
        width: badgeWidth,
        height: cat.height || 52,
        fill: configuredBadgeColor,
        cornerRadius: cat.radius || 6,
        name: 'badge-bg'
      });

      const badgeText = new Konva.Text({
        x: cat.paddingX || 24,
        y: ((cat.height || 52) - (cat.fontSize || 22)) / 2 + 2,
        text: catLabel,
        fontSize: cat.fontSize || 22,
        fontFamily: (cat.fontFamily || 'Arial').split(',')[0].trim(),
        fontStyle: cat.fontWeight || 'bold',
        fill: cat.color || '#ffffff',
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
        fontFamily: (tit.fontFamily || 'Arial').split(',')[0].trim(),
        fontStyle: tit.fontWeight || 'bold',
        fill: tit.color || '#ffffff',
        width: tit.maxWidth || 970,
        opacity: typeof tit.opacity === 'number' ? tit.opacity : 1,
        draggable: true,
        name: 'title',
        id: 'title'
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
        id: 'separator'
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
        fontFamily: (sum.fontFamily || 'Arial').split(',')[0].trim(),
        fill: sum.color || '#E0E0E0',
        width: sum.maxWidth || 970,
        opacity: typeof sum.opacity === 'number' ? sum.opacity : 1,
        draggable: true,
        name: 'summary',
        id: 'summary'
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
        fontFamily: (wm.fontFamily || 'Arial').split(',')[0].trim(),
        fill: wm.color || '#ffffff',
        opacity: typeof wm.opacity === 'number' ? wm.opacity : 0.5,
        draggable: true,
        name: 'watermark',
        id: 'watermark'
      });
      setupElementEvents(wmText, 'watermark');
      layer.add(wmText);
      konvaElements.watermark = wmText;
    }

    layer.draw();
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
    const names = {
      category: 'Badge Categoria', title: 'Titulo',
      separator: 'Linha Decorativa', summary: 'Subtitulo', watermark: 'Watermark'
    };
    let html = '';
    Object.keys(konvaElements).forEach(function (key) {
      const node = konvaElements[key];
      const isActive = selectedElement === key ? 'active' : '';
      const pos = 'X:' + Math.round(node.x()) + ' Y:' + Math.round(node.y());
      html += '<div class="element-item ' + isActive +
        '" onclick="selectElementFromList(\'' + key + '\')">' +
        '<span>' + (names[key] || key) + '</span>' +
        '<span class="element-type">' + pos + '</span></div>';
    });
    list.innerHTML = html;
  }

  function updatePropertiesPanel(key) {
    const node = konvaElements[key];
    if (!node) return;
    const type = node.getClassName();
    let html = '<div class="tool-group"><label>Elemento</label><input type="text" value="' + key + '" disabled></div>';
    html += '<div class="tool-row">' +
      '<div class="tool-group"><label>X</label><input type="number" id="propX" value="' + Math.round(node.x()) + '" onchange="updateNodePropFromInput(\'' + key + '\', \'x\', this.value)"></div>' +
      '<div class="tool-group"><label>Y</label><input type="number" id="propY" value="' + Math.round(node.y()) + '" onchange="updateNodePropFromInput(\'' + key + '\', \'y\', this.value)"></div>' +
      '</div>';

    if (type === 'Text') {
      html += '<div class="tool-group"><label>Texto</label><input type="text" id="propText" value="' + escapeHtmlAttr(node.text()) + '" onchange="updateNodePropFromInput(\'' + key + '\', \'text\', this.value)"></div>';
      html += '<div class="tool-row">' +
        '<div class="tool-group"><label>Fonte (px)</label><input type="number" value="' + node.fontSize() + '" onchange="updateNodePropFromInput(\'' + key + '\', \'fontSize\', this.value)"></div>' +
        '<div class="tool-group"><label>Cor</label><input type="color" value="' + colorToHex(node.fill()) + '" onchange="updateNodePropFromInput(\'' + key + '\', \'fill\', this.value)"></div>' +
        '</div>';
      html += '<div class="tool-group"><label>Opacidade (' + node.opacity().toFixed(2) + ')</label><input type="range" min="0" max="1" step="0.05" value="' + node.opacity() + '" onchange="updateNodePropFromInput(\'' + key + '\', \'opacity\', this.value)"></div>';
    }

    if (type === 'Rect') {
      html += '<div class="tool-row">' +
        '<div class="tool-group"><label>Largura</label><input type="number" value="' + Math.round(node.width()) + '" onchange="updateNodePropFromInput(\'' + key + '\', \'width\', this.value)"></div>' +
        '<div class="tool-group"><label>Altura</label><input type="number" value="' + Math.round(node.height()) + '" onchange="updateNodePropFromInput(\'' + key + '\', \'height\', this.value)"></div>' +
        '</div>';
      html += '<div class="tool-group"><label>Cor</label><input type="color" value="' + colorToHex(node.fill()) + '" onchange="updateNodePropFromInput(\'' + key + '\', \'fill\', this.value)"></div>';
    }

    if (type === 'Group') {
      const badgeBg = node.findOne('.badge-bg');
      const badgeText = node.findOne('.badge-text');
      const separatorVisible = node.findOne('.separator-visible');
      if (key === 'category' && badgeBg && badgeText) {
        html += '<div class="tool-group"><label>Texto da categoria</label><input type="text" value="' + escapeHtmlAttr(badgeText.text()) + '" onchange="updateNodePropFromInput(\'' + key + '\', \'categoryText\', this.value)"></div>';
        html += '<div class="tool-row">' +
          '<div class="tool-group"><label>Largura auto</label><input type="number" value="' + Math.round(badgeBg.width()) + '" disabled></div>' +
          '<div class="tool-group"><label>Cor do badge</label><input type="color" value="' + colorToHex(badgeBg.fill()) + '" onchange="updateBadgeColor(\'' + key + '\', this.value)"></div>' +
          '</div>';
      }
      if (key === 'separator' && separatorVisible) {
        html += '<div class="tool-row">' +
          '<div class="tool-group"><label>Largura</label><input type="number" value="' + Math.round(separatorVisible.width()) + '" onchange="updateNodePropFromInput(\'' + key + '\', \'width\', this.value)"></div>' +
          '<div class="tool-group"><label>Altura visual</label><input type="number" value="' + Math.round(separatorVisible.height()) + '" onchange="updateNodePropFromInput(\'' + key + '\', \'height\', this.value)"></div>' +
          '</div>';
        html += '<div class="tool-group"><label>Cor</label><input type="color" value="' + colorToHex(separatorVisible.fill()) + '" onchange="updateNodePropFromInput(\'' + key + '\', \'fill\', this.value)"></div>';
      }
    }
    document.getElementById('propertiesPanel').innerHTML = html;
  }

  function updateNodeProp(key, prop, value) {
    const node = konvaElements[key];
    if (!node) return;
    saveUndo();
    if (node.getClassName() === 'Group' && key === 'category') {
      updateCategoryGroupProp(node, prop, value);
    } else if (node.getClassName() === 'Group' && key === 'separator') {
      updateSeparatorGroupProp(node, prop, value);
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
    updateNodeProp(key, 'badgeColor', color);
  }
  window.updateBadgeColor = updateBadgeColor;

  function updateCategoryGroupProp(group, prop, value) {
    const badgeBg = group.findOne('.badge-bg');
    const badgeText = group.findOne('.badge-text');
    if (prop === 'x' || prop === 'y') {
      group.setAttr(prop, toNumber(value, group.getAttr(prop)));
      return;
    }
    if (prop === 'categoryText' && badgeText) {
      badgeText.text(formatCategoryLabel(value, (templateData.layers || {}).category));
      resizeBadgeToText(group);
      return;
    }
    if ((prop === 'badgeColor' || prop === 'fill') && badgeBg) {
      badgeBg.fill(value);
    }
  }

  function updateSeparatorGroupProp(group, prop, value) {
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
    if (prop === 'fill') {
      separatorVisible.fill(value);
    }
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

  async function saveFromEditor() {
    if (!templateData) return;
    const next = JSON.parse(JSON.stringify(templateData));
    if (!next.layers) next.layers = {};
    Object.keys(konvaElements).forEach(function (key) {
      const node = konvaElements[key];
      if (!next.layers[key]) next.layers[key] = {};
      const target = next.layers[key];
      target.x = Math.round(node.x());
      target.y = Math.round(node.y());
      if (node.getClassName() === 'Text') {
        target.fontSize = node.fontSize();
        target.color = node.fill();
        target.opacity = node.opacity();
        if (key === 'watermark') target.text = node.text();
      }
      if (node.getClassName() === 'Rect') {
        target.width = Math.round(node.width());
        target.height = Math.round(node.height());
        target.color = node.fill();
      }
      if (node.getClassName() === 'Group' && key === 'category') {
        const badgeBg = node.findOne('.badge-bg');
        const badgeText = node.findOne('.badge-text');
        if (badgeBg) {
          target.background = badgeBg.fill();
          const catLabel = badgeText ? formatCategoryLabel(badgeText.text(), target) : null;
          if (catLabel) {
            if (!next.defaults) next.defaults = {};
            next.defaults.category = catLabel;
            if (!next.categoryColors) next.categoryColors = {};
            next.categoryColors[catLabel] = badgeBg.fill();
          }
        }
      }
      if (node.getClassName() === 'Group' && key === 'separator') {
        const separatorVisible = node.findOne('.separator-visible');
        if (separatorVisible) {
          target.width = Math.round(separatorVisible.width());
          target.height = Math.round(separatorVisible.height());
          target.color = separatorVisible.fill();
        }
      }
    });
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
    const dataURL = stage.toDataURL({ pixelRatio: 1, mimeType: 'image/png' });
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
      const res = await fetch('/api/template/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: konvaElements.title ? konvaElements.title.text() : DEFAULT_PREVIEW.title,
          summary: konvaElements.summary ? konvaElements.summary.text() : DEFAULT_PREVIEW.summary,
          category: konvaElements.category && konvaElements.category.findOne('.badge-text')
            ? konvaElements.category.findOne('.badge-text').text()
            : DEFAULT_PREVIEW.category
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

  function getCategoryColor(label, categoryColors) {
    const colors = categoryColors || {};
    const exact = formatCategoryLabel(label, (templateData.layers || {}).category);
    const normalized = normalizeCategoryKey(exact);
    return colors[exact] || colors[normalized] || colors.GERAL ||
      FALLBACK_CATEGORY_COLORS[normalized] || FALLBACK_CATEGORY_COLORS.GERAL;
  }

  function formatCategoryLabel(value, layerConfig) {
    const text = String(value == null ? '' : value).trim() || DEFAULT_PREVIEW.category;
    if (layerConfig?.textTransform === 'uppercase') return text.toUpperCase();
    return text;
  }

  function normalizeCategoryKey(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
  }

  function calculateBadgeWidth(label, fontSize, paddingX) {
    const approximateTextWidth = String(label || '').length * Math.max(12, fontSize * 0.62);
    return Math.max(MIN_BADGE_WIDTH, Math.ceil(approximateTextWidth + paddingX * 2));
  }

  function measureBadgeTextWidth(textNode) {
    if (!textNode) return 0;
    if (typeof textNode.getTextWidth === 'function') return textNode.getTextWidth();
    return textNode.width();
  }

  function resizeBadgeToText(group) {
    if (!group) return;
    const badgeBg = group.findOne('.badge-bg');
    const badgeHit = group.findOne('.badge-hit');
    const badgeText = group.findOne('.badge-text');
    if (!badgeBg || !badgeText) return;
    const catLayer = (templateData.layers || {}).category || {};
    const paddingX = catLayer.paddingX || badgeText.x() || 24;
    const height = catLayer.height || badgeBg.height() || 52;
    const measuredWidth = Math.ceil(measureBadgeTextWidth(badgeText) + paddingX * 2);
    const width = Math.max(MIN_BADGE_WIDTH, measuredWidth);
    badgeBg.width(width);
    badgeBg.height(height);
    badgeText.x(paddingX);
    badgeText.y((height - badgeText.fontSize()) / 2 + 2);
    if (badgeHit) {
      badgeHit.width(width);
      badgeHit.height(height);
    }
    group.width(width);
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

  function escapeHtmlAttr(v) {
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
