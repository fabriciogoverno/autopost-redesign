let stage, layer, bgImageObj;
let templateData = null;
let konvaElements = {};
let selectedElement = null;
let undoStack = [];
let currentScale = 0.45;

const CATEGORY_COLORS = {
  'OPINIAO': '#E63946', 'POLITICA': '#1D3557', 'ESPORTE': '#2A9D8F',
  'SEGURANCA': '#E9C46A', 'ECONOMIA': '#F4A261', 'GERAL': '#6C757D'
};

// ========== INICIALIZACAO ==========
async function initEditor() {
  const container = document.getElementById('konva-container');

  // Buscar template do servidor
  try {
    const res = await fetch('/api/template');
    templateData = await res.json();
  } catch (e) {
    alert('Erro ao carregar template. O servidor esta rodando?');
    return;
  }

  // Criar stage
  stage = new Konva.Stage({
    container: 'konva-container',
    width: 1080,
    height: 1920,
    scaleX: currentScale,
    scaleY: currentScale
  });

  layer = new Konva.Layer();
  stage.add(layer);

  // Carregar imagem de fundo
  await loadBackground();

  // Criar elementos editaveis
  createElements();

  // Criar lista de elementos na toolbar
  updateElementList();

  // Eventos de teclado
  setupKeyboard();

  // Evento de selecao no stage
  stage.on('click tap', function(e) {
    if (e.target === stage) {
      deselectAll();
    }
  });

  // Slider de zoom
  document.getElementById('scaleSlider').addEventListener('input', function(e) {
    currentScale = parseFloat(e.target.value);
    stage.scale({ x: currentScale, y: currentScale });
    document.getElementById('scaleValue').textContent = Math.round(currentScale * 100) + '%';
    layer.batchDraw();
  });
}

function loadBackground() {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = function() {
      bgImageObj = new Konva.Image({
        x: 0, y: 0,
        image: image,
        width: 1080, height: 1920,
        name: 'background',
        listening: false
      });
      layer.add(bgImageObj);
      bgImageObj.moveToBottom();
      layer.draw();
      resolve();
    };
    image.onerror = function() {
      // Se nao carregar, usa fundo escuro
      const rect = new Konva.Rect({
        x: 0, y: 0, width: 1080, height: 1920,
        fill: '#050510', name: 'background', listening: false
      });
      layer.add(rect);
      rect.moveToBottom();
      layer.draw();
      resolve();
    };
    image.src = '/assets/template-base.png';
  });
}

// ========== CRIAR ELEMENTOS ==========
function createElements() {
  const layers = templateData.layers;
  const defaults = { category: 'OPINIAO', title: 'Titulo de teste do template', summary: 'Subtitulo de teste para voce verificar posicoes' };

  // BADGE CATEGORIA
  if (layers.category) {
    const cat = layers.category;
    const catLabel = defaults.category;
    const badgeWidth = Math.max(catLabel.length * 18 + cat.paddingX * 2, 150);

    const badgeGroup = new Konva.Group({
      x: cat.x, y: cat.y,
      draggable: true,
      name: 'category',
      id: 'category'
    });

    const badgeRect = new Konva.Rect({
      width: badgeWidth, height: cat.height,
      fill: CATEGORY_COLORS[catLabel],
      cornerRadius: cat.radius,
      name: 'badge-bg'
    });

    const badgeText = new Konva.Text({
      x: cat.paddingX, y: (cat.height - cat.fontSize) / 2 + 2,
      text: catLabel,
      fontSize: cat.fontSize,
      fontFamily: cat.fontFamily.split(',')[0],
      fontStyle: cat.fontWeight,
      fill: cat.color,
      name: 'badge-text'
    });

    badgeGroup.add(badgeRect, badgeText);
    setupElementEvents(badgeGroup, 'category');
    layer.add(badgeGroup);
    konvaElements.category = badgeGroup;
  }

  // TITULO
  if (layers.title) {
    const tit = layers.title;
    const titleText = new Konva.Text({
      x: tit.x, y: tit.y,
      text: defaults.title,
      fontSize: tit.fontSize,
      fontFamily: tit.fontFamily.split(',')[0],
      fontStyle: tit.fontWeight,
      fill: tit.color,
      width: tit.maxWidth,
      draggable: true,
      name: 'title',
      id: 'title'
    });
    setupElementEvents(titleText, 'title');
    layer.add(titleText);
    konvaElements.title = titleText;
  }

  // LINHA DECORATIVA
  if (layers.separator) {
    const sep = layers.separator;
    // Calcular Y baseado no titulo
    const titleY = layers.title.y;
    const titleHeight = 72; // aproximado
    const sepY = titleY + titleHeight + sep.marginTopAfterTitle;

    const lineRect = new Konva.Rect({
      x: sep.x, y: sepY,
      width: sep.width, height: sep.height,
      fill: sep.color,
      cornerRadius: sep.radius,
      draggable: true,
      name: 'separator',
      id: 'separator'
    });
    setupElementEvents(lineRect, 'separator');
    layer.add(lineRect);
    konvaElements.separator = lineRect;
  }

  // SUBTITULO
  if (layers.summary) {
    const sum = layers.summary;
    const sepY = konvaElements.separator ? konvaElements.separator.y() : 1250;
    const sumY = sepY + 5 + sum.marginTopAfterLine;

    const summaryText = new Konva.Text({
      x: sum.x, y: sumY,
      text: defaults.summary,
      fontSize: sum.fontSize,
      fontFamily: sum.fontFamily.split(',')[0],
      fill: sum.color,
      width: 970,
      draggable: true,
      name: 'summary',
      id: 'summary'
    });
    setupElementEvents(summaryText, 'summary');
    layer.add(summaryText);
    konvaElements.summary = summaryText;
  }

  // WATERMARK
  if (layers.watermark) {
    const wm = layers.watermark;
    const wmText = new Konva.Text({
      x: wm.x, y: wm.y,
      text: wm.text,
      fontSize: wm.fontSize,
      fontFamily: wm.fontFamily.split(',')[0],
      fill: wm.color,
      opacity: wm.opacity,
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
  node.on('dragstart', function() {
    saveUndo();
  });

  node.on('dragend', function() {
    selectElement(key);
    updateElementList();
  });

  node.on('click tap', function(e) {
    e.cancelBubble = true;
    selectElement(key);
  });

  node.on('dblclick dbltap', function(e) {
    e.cancelBubble = true;
    if (node.getClassName() === 'Text') {
      editTextInline(node, key);
    }
  });

  // Hover effect
  node.on('mouseenter', function() {
    document.body.style.cursor = 'move';
  });
  node.on('mouseleave', function() {
    document.body.style.cursor = 'default';
  });
}

// ========== SELECAO ==========
function selectElement(key) {
  deselectAll();
  selectedElement = key;
  const node = konvaElements[key];
  if (!node) return;

  // Adicionar borda de selecao
  const box = node.getClientRect();
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

  updatePropertiesPanel(key);
  updateElementList();
}

function deselectAll() {
  selectedElement = null;
  const indicators = layer.find('.selection-indicator');
  indicators.forEach(ind => ind.destroy());
  layer.draw();
  updateElementList();
  document.getElementById('propertiesPanel').innerHTML = '<p style="color:#666;font-size:13px">Selecione um elemento no canvas para editar.</p>';
}

// ========== EDICAO DE TEXTO INLINE ==========
function editTextInline(textNode, key) {
  const stageBox = stage.container().getBoundingClientRect();
  const textPosition = textNode.absolutePosition();

  const area = document.createElement('textarea');
  area.value = textNode.text();
  area.style.position = 'absolute';
  area.style.left = (stageBox.left + textPosition.x * currentScale) + 'px';
  area.style.top = (stageBox.top + textPosition.y * currentScale) + 'px';
  area.style.width = (textNode.width() * currentScale) + 'px';
  area.style.height = (textNode.height() * currentScale) + 'px';
  area.style.fontSize = (textNode.fontSize() * currentScale) + 'px';
  area.style.fontFamily = textNode.fontFamily();
  area.style.color = textNode.fill();
  area.style.background = 'rgba(0,0,0,0.8)';
  area.style.border = '2px solid #E63946';
  area.style.borderRadius = '4px';
  area.style.padding = '4px';
  area.style.resize = 'none';
  area.style.outline = 'none';
  area.style.zIndex = '1000';

  document.body.appendChild(area);
  area.focus();

  function finish() {
    textNode.text(area.value);
    layer.draw();
    document.body.removeChild(area);
    updateElementList();
  }

  area.addEventListener('blur', finish);
  area.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      area.blur();
    }
  });
}

// ========== TOOLBAR / PROPRIEDADES ==========
function updateElementList() {
  const list = document.getElementById('elementList');
  const names = {
    category: 'Badge Categoria',
    title: 'Titulo',
    separator: 'Linha Decorativa',
    summary: 'Subtitulo',
    watermark: 'Watermark'
  };

  let html = '';
  for (const [key, node] of Object.entries(konvaElements)) {
    const isActive = selectedElement === key ? 'active' : '';
    const pos = `X:${Math.round(node.x())} Y:${Math.round(node.y())}`;
    html += `<div class="element-item ${isActive}" onclick="selectElement('${key}')">
      <span>${names[key]}</span>
      <span class="element-type">${pos}</span>
    </div>`;
  }
  list.innerHTML = html;
}

function updatePropertiesPanel(key) {
  const node = konvaElements[key];
  if (!node) return;

  const type = node.getClassName();
  let html = `<div class="tool-group"><label>Elemento</label><input type="text" value="${key}" disabled></div>`;

  html += `<div class="tool-row">
    <div class="tool-group"><label>X</label><input type="number" id="propX" value="${Math.round(node.x())}" onchange="updateNodeProp('${key}', 'x', this.value)"></div>
    <div class="tool-group"><label>Y</label><input type="number" id="propY" value="${Math.round(node.y())}" onchange="updateNodeProp('${key}', 'y', this.value)"></div>
  </div>`;

  if (type === 'Text') {
    html += `<div class="tool-group"><label>Texto</label><input type="text" id="propText" value="${node.text()}" onchange="updateNodeProp('${key}', 'text', this.value)"></div>`;
    html += `<div class="tool-row">
      <div class="tool-group"><label>Fonte (px)</label><input type="number" id="propFontSize" value="${node.fontSize()}" onchange="updateNodeProp('${key}', 'fontSize', this.value)"></div>
      <div class="tool-group"><label>Cor</label><input type="color" id="propFill" value="${node.fill()}" onchange="updateNodeProp('${key}', 'fill', this.value)"></div>
    </div>`;
    html += `<div class="tool-group"><label>Opacidade</label><input type="range" min="0" max="1" step="0.1" value="${node.opacity()}" onchange="updateNodeProp('${key}', 'opacity', this.value)"></div>`;
  }

  if (type === 'Rect') {
    html += `<div class="tool-row">
      <div class="tool-group"><label>Largura</label><input type="number" value="${node.width()}" onchange="updateNodeProp('${key}', 'width', this.value)"></div>
      <div class="tool-group"><label>Altura</label><input type="number" value="${node.height()}" onchange="updateNodeProp('${key}', 'height', this.value)"></div>
    </div>`;
    html += `<div class="tool-group"><label>Cor</label><input type="color" value="${node.fill()}" onchange="updateNodeProp('${key}', 'fill', this.value)"></div>`;
  }

  if (type === 'Group') {
    html += `<div class="tool-group"><label>Cor do Badge</label><input type="color" value="${node.findOne('.badge-bg').fill()}" onchange="updateBadgeColor('${key}', this.value)"></div>`;
  }

  document.getElementById('propertiesPanel').innerHTML = html;
}

function updateNodeProp(key, prop, value) {
  const node = konvaElements[key];
  if (!node) return;

  saveUndo();

  if (prop === 'x' || prop === 'y' || prop === 'width' || prop === 'height' || prop === 'fontSize') {
    node.setAttr(prop, parseFloat(value));
  } else if (prop === 'opacity') {
    node.opacity(parseFloat(value));
  } else {
    node.setAttr(prop, value);
  }

  layer.draw();
  updateElementList();

  // Atualizar selecao visual
  if (selectedElement === key) {
    const indicators = layer.find('.selection-indicator');
    indicators.forEach(ind => ind.destroy());
    const box = node.getClientRect();
    const selectionRect = new Konva.Rect({
      x: box.x - 4, y: box.y - 4,
      width: box.width + 8, height: box.height + 8,
      stroke: '#E63946', strokeWidth: 2, dash: [5, 5],
      name: 'selection-indicator', listening: false
    });
    layer.add(selectionRect);
    selectionRect.moveToTop();
    layer.draw();
  }
}

function updateBadgeColor(key, color) {
  const group = konvaElements[key];
  if (!group) return;
  const rect = group.findOne('.badge-bg');
  if (rect) rect.fill(color);
  layer.draw();
}

// ========== TECLADO ==========
function setupKeyboard() {
  document.addEventListener('keydown', function(e) {
    if (!selectedElement) return;
    const node = konvaElements[selectedElement];
    if (!node) return;

    const step = e.shiftKey ? 10 : 1;

    switch(e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        saveUndo();
        node.x(node.x() - step);
        break;
      case 'ArrowRight':
        e.preventDefault();
        saveUndo();
        node.x(node.x() + step);
        break;
      case 'ArrowUp':
        e.preventDefault();
        saveUndo();
        node.y(node.y() - step);
        break;
      case 'ArrowDown':
        e.preventDefault();
        saveUndo();
        node.y(node.y() + step);
        break;
      case 'Delete':
        if (selectedElement !== 'background') {
          // Nao remove, so esconde (para nao quebrar template)
          // node.visible(false);
        }
        break;
    }

    layer.draw();
    updateElementList();
    updatePropertiesPanel(selectedElement);

    // Atualizar selecao visual
    const indicators = layer.find('.selection-indicator');
    indicators.forEach(ind => ind.destroy());
    const box = node.getClientRect();
    const selectionRect = new Konva.Rect({
      x: box.x - 4, y: box.y - 4,
      width: box.width + 8, height: box.height + 8,
      stroke: '#E63946', strokeWidth: 2, dash: [5, 5],
      name: 'selection-indicator', listening: false
    });
    layer.add(selectionRect);
    selectionRect.moveToTop();
    layer.draw();
  });
}

// ========== UNDO ==========
function saveUndo() {
  const state = {};
  for (const [key, node] of Object.entries(konvaElements)) {
    state[key] = { x: node.x(), y: node.y() };
    if (node.getClassName() === 'Text') {
      state[key].text = node.text();
    }
  }
  undoStack.push(state);
  if (undoStack.length > 20) undoStack.shift();
}

// ========== SALVAR ==========
async function saveFromEditor() {
  if (!templateData) return;

  const updates = { layers: {} };

  for (const [key, node] of Object.entries(konvaElements)) {
    const layerConfig = templateData.layers[key];
    if (!layerConfig) continue;

    updates.layers[key] = {
      x: Math.round(node.x()),
      y: Math.round(node.y())
    };

    if (node.getClassName() === 'Text') {
      updates.layers[key].fontSize = node.fontSize();
      updates.layers[key].color = node.fill();
      updates.layers[key].opacity = node.opacity();
    }

    if (key === 'category') {
      const rect = node.findOne('.badge-bg');
      if (rect) {
        // Nao salvamos cor do badge no template (eh dinamica por categoria)
      }
    }

    if (key === 'separator') {
      updates.layers[key].width = node.width();
      updates.layers[key].height = node.height();
      updates.layers[key].color = node.fill();
    }
  }

  try {
    const res = await fetch('/api/template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const result = await res.json();
    if (res.ok) {
      alert('Template salvo com sucesso! Posicoes atualizadas.');
      templateData = result.template;
    } else {
      alert('Erro ao salvar: ' + (result.error || 'Falha'));
    }
  } catch (e) {
    alert('Erro de conexao ao salvar');
  }
}

// ========== PREVIEW PNG ==========
function generatePreviewFromEditor() {
  // Esconder indicadores de selecao
  const indicators = layer.find('.selection-indicator');
  indicators.forEach(ind => ind.visible(false));
  layer.draw();

  // Gerar data URL
  const dataURL = stage.toDataURL({
    pixelRatio: 1,
    mimeType: 'image/png',
    width: 1080,
    height: 1920
  });

  // Restaurar indicadores
  indicators.forEach(ind => ind.visible(true));
  layer.draw();

  // Abrir preview
  const win = window.open();
  win.document.write('<img src="' + dataURL + '" style="max-width:100%;height:auto">');
}

// ========== RESET ==========
async function resetPositions() {
  if (!confirm('Restaurar posicoes para o padrao do Canva?')) return;

  try {
    const res = await fetch('/api/template/reset', { method: 'POST' });
    const result = await res.json();
    if (res.ok) {
      templateData = result.template;
      // Recriar elementos
      for (const key in konvaElements) {
        konvaElements[key].destroy();
      }
      konvaElements = {};
      createElements();
      updateElementList();
      deselectAll();
      alert('Posicoes restauradas!');
    }
  } catch (e) {
    alert('Erro ao restaurar');
  }
}

// ========== INICIAR ==========
window.addEventListener('load', initEditor);
