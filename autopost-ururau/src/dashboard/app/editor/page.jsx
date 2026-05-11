'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Save, X, Undo2, Type, Image as ImgIcon, Square, Sparkles, Upload,
  Layers as LayersIcon, ChevronLeft, Plus, Copy, Trash2,
  ArrowUp, ArrowDown, ZoomIn, ZoomOut, Eye, Link2, Circle,
  Loader2, Lock, Unlock, EyeOff, AlertCircle, Globe, Send, FileText,
  Bold, Italic, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Minus, ArrowUpToLine, ArrowDownToLine, MoveHorizontal, MoveVertical,
} from 'lucide-react';
import { proxiedUrl } from '@/lib/imgProxy';
import { TEMPLATE_LAYERS, LAYER_ORDER, LAYER_GROUPS, CATEGORY_COLORS, URURAU_RED, exportTemplate, importTemplate } from '@/lib/templateLayers';
import { CANVA_BASE_IMAGE } from '@/lib/canvaBaseImage';

const TEMPLATES_KEY = 'ururau-my-templates-v1';
const CATEGORY_COLORS_KEY = 'ururau-category-colors';

function loadCategoryColors() {
  if (typeof window === 'undefined') return { ...CATEGORY_COLORS };
  try {
    const stored = JSON.parse(localStorage.getItem(CATEGORY_COLORS_KEY) || '{}');
    return { ...CATEGORY_COLORS, ...stored };
  } catch { return { ...CATEGORY_COLORS }; }
}
function saveCategoryColor(name, color) {
  if (typeof window === 'undefined') return;
  try {
    const stored = JSON.parse(localStorage.getItem(CATEGORY_COLORS_KEY) || '{}');
    stored[name.toUpperCase()] = color;
    localStorage.setItem(CATEGORY_COLORS_KEY, JSON.stringify(stored));
  } catch (e) { console.error(e); }
}

export default function EditorWrapper() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
      <EditorPage />
    </Suspense>
  );
}

function EditorPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const templateId = sp.get('id');

  const stageRef = useRef(null);
  const layerRef = useRef(null);
  const nodesRef = useRef({});
  const undoStackRef = useRef([]);
  const articleImgRef = useRef(null);
  const baseImgRef = useRef(null);
  const baseDataURLRef = useRef(CANVA_BASE_IMAGE);
  const transformerRef = useRef(null);
  const userElsRef = useRef([]); // ids de elementos custom adicionados
  const categoryColorsRef = useRef({});

  const [konvaReady, setKonvaReady] = useState(false);
  const [fontReady, setFontReady] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);
  const [scale, setScale] = useState(0.32);
  const [tool, setTool] = useState('camadas');
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [templateName, setTemplateName] = useState('Meu Template');

  const [materiaUrl, setMateriaUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);
  const [, force] = useState(0);
  const refresh = () => force((n) => n + 1);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2500); }
  function showError(msg) { setError(msg); setTimeout(() => setError(null), 5000); }

  useEffect(() => {
    categoryColorsRef.current = loadCategoryColors();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.Konva) { setKonvaReady(true); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/konva@9.3.18/konva.min.js';
    s.async = true;
    s.onload = () => setKonvaReady(true);
    s.onerror = () => showError('Falha ao carregar editor');
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || window.pdfjsLib) return;
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
    s.async = true;
    s.onload = () => {
      if (window.pdfjsLib) window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    };
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('fonts' in document)) { setFontReady(true); return; }
    const safety = setTimeout(() => setFontReady(true), 4000);
    Promise.all([
      document.fonts.load('bold 56px "Aileron"'),
      document.fonts.load('bold 85px "Aileron"'),
      document.fonts.load('400 43px "Aileron"'),
    ]).finally(() => { clearTimeout(safety); setFontReady(true); });
  }, []);

  useEffect(() => {
    if (!konvaReady || !templateId || !templateId.startsWith('mine_')) return;
    try {
      const all = JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]');
      const found = all.find((t) => t.id === templateId);
      if (found) {
        setTemplateName(found.name || 'Meu Template');
        if (found.baseImage) baseDataURLRef.current = found.baseImage;
        if (found.state && nodesRef.current) {
          setTimeout(() => importTemplate(nodesRef.current, found.state), 500);
        }
      }
    } catch (e) { console.error(e); }
  }, [konvaReady, templateId]);

  useEffect(() => {
    if (!konvaReady || !fontReady || stageRef.current) return;
    const Konva = window.Konva;
    const container = document.getElementById('konva-stage');
    if (!container) return;
    const stage = new Konva.Stage({ container, width: 1080 * scale, height: 1920 * scale, scaleX: scale, scaleY: scale });
    const layer = new Konva.Layer();
    stage.add(layer);
    stageRef.current = stage;
    layerRef.current = layer;
    buildAllLayers();
    applyBase(baseDataURLRef.current);
    restoreZOrder();

    const tr = new Konva.Transformer({
      enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center'],
      borderStroke: '#2563EB', borderStrokeWidth: 2, borderDash: [6, 4],
      anchorStroke: '#2563EB', anchorFill: '#FFFFFF', anchorStrokeWidth: 2, anchorSize: 12,
      keepRatio: false, rotateEnabled: true, rotationSnaps: [0, 90, 180, 270],
    });
    layer.add(tr);
    transformerRef.current = tr;

    stage.on('click tap', (e) => {
      if (e.target === stage) { deselect(); tr.nodes([]); layer.draw(); return; }
      const name = e.target.name();
      if (name === 'article-image-actual' || name.startsWith('user-')) {
        tr.nodes([e.target]); layer.draw();
        const id = e.target.id();
        if (id) setSelectedKey(id);
        return;
      }
      if (!e.target.hasName('selection-indicator')) {
        tr.nodes([]); layer.draw();
      }
    });
    layer.draw();
    refresh();
  }, [konvaReady, fontReady]);

  useEffect(() => {
    if (!stageRef.current) return;
    stageRef.current.scale({ x: scale, y: scale });
    stageRef.current.width(1080 * scale);
    stageRef.current.height(1920 * scale);
    layerRef.current?.batchDraw();
  }, [scale]);

  useEffect(() => {
    function onKey(e) {
      const t = e.target.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); duplicateSelected(); return; }
      if (!selectedKey) return;
      const node = nodesRef.current[selectedKey];
      if (!node) return;
      const step = e.shiftKey ? 10 : 1;
      let h = true;
      switch (e.key) {
        case 'ArrowLeft':  saveUndo(); node.x(node.x() - step); break;
        case 'ArrowRight': saveUndo(); node.x(node.x() + step); break;
        case 'ArrowUp':    saveUndo(); node.y(node.y() - step); break;
        case 'ArrowDown':  saveUndo(); node.y(node.y() + step); break;
        case 'Delete': case 'Backspace':
          if (selectedKey.startsWith('user_')) deleteSelected();
          else toggleVisibility(selectedKey);
          break;
        default: h = false;
      }
      if (h) { e.preventDefault(); layerRef.current?.draw(); refreshSel(); refresh(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedKey]);

  function buildAllLayers() {
    const Konva = window.Konva;
    const layer = layerRef.current;
    if (!Konva || !layer) return;
    nodesRef.current = {};

    LAYER_ORDER.forEach((key) => {
      const def = TEMPLATE_LAYERS[key];
      if (!def) return;
      const node = createNode(Konva, key, def);
      if (!node) return;
      if (def.locked) node.draggable(false);
      if (def.defaults.visible === false) node.visible(false);
      bindEvents(node, key);
      layer.add(node);
      nodesRef.current[key] = node;
    });
  }

  function restoreZOrder() {
    const layer = layerRef.current;
    if (!layer) return;
    const realArticle = layer.findOne('.article-image-actual');
    const baseTemplate = layer.findOne('.base-template');
    const tr = transformerRef.current;
    let z = 0;
    for (const key of LAYER_ORDER) {
      const n = nodesRef.current[key];
      if (n) n.zIndex(z++);
      if (key === 'article_image' && realArticle) realArticle.zIndex(z++);
      if (key === 'gradient_overlay' && baseTemplate) baseTemplate.zIndex(z++);
    }
    // user elements ficam no topo, antes do transformer
    userElsRef.current.forEach((id) => {
      const n = nodesRef.current[id];
      if (n) n.zIndex(z++);
    });
    if (tr) tr.moveToTop();
    layer.draw();
  }

  function createNode(Konva, key, def) {
    const d = def.defaults;
    const base = { name: key, id: key, draggable: d.listening !== false };
    switch (def.kind) {
      case 'rect': return new Konva.Rect({ ...base, ...d });
      case 'rect-stroke': return new Konva.Rect({ ...base, ...d, fill: d.fill || 'transparent' });
      case 'circle': return new Konva.Circle({ ...base, x: d.x, y: d.y, radius: d.radius, fill: d.fill });
      case 'text': return new Konva.Text({ ...base, ...d });
      case 'image-slot':
        return new Konva.Rect({
          ...base, x: d.x, y: d.y, width: d.width, height: d.height,
          fill: 'rgba(255,255,255,0.04)', stroke: 'rgba(255,255,255,0.15)',
          strokeWidth: 2, dash: [12, 8], listening: false,
        });
      case 'gradient-rect':
        return new Konva.Rect({
          ...base, x: d.x, y: d.y, width: d.width, height: d.height,
          fillLinearGradientStartPoint: { x: 0, y: d.height * d.gradientStart },
          fillLinearGradientEndPoint: { x: 0, y: d.height * d.gradientEnd },
          fillLinearGradientColorStops: [0, d.colorTop, 0.4, d.colorMid, 1, d.colorBottom],
          listening: false,
        });
      default: return null;
    }
  }

  function bindEvents(node, key) {
    if (!node.draggable()) return;
    node.on('dragstart', () => saveUndo());
    node.on('dragend', () => { selectElement(key); refresh(); });
    node.on('click tap', (e) => { e.cancelBubble = true; selectElement(key); });
    node.on('dblclick dbltap', (e) => {
      e.cancelBubble = true;
      if (node.getClassName() === 'Text') editTextInline(node, key);
    });
    node.on('mouseenter', () => { document.body.style.cursor = 'move'; });
    node.on('mouseleave', () => { document.body.style.cursor = 'default'; });
  }

  function selectElement(key) {
    deselect();
    setSelectedKey(key);
    refreshSel(key);
    // Para user elements, ativa transformer
    const node = nodesRef.current[key];
    if (node && (key.startsWith('user_') || key === 'article_image_actual')) {
      transformerRef.current?.nodes([node]);
      layerRef.current?.draw();
    } else {
      transformerRef.current?.nodes([]);
      layerRef.current?.draw();
    }
    refresh();
  }

  function deselect() {
    setSelectedKey(null);
    if (!layerRef.current) return;
    layerRef.current.find('.selection-indicator').forEach((i) => i.destroy());
    transformerRef.current?.nodes([]);
    layerRef.current.draw();
  }

  function refreshSel(keyOverride) {
    const Konva = window.Konva;
    const k = keyOverride || selectedKey;
    if (!k || !Konva || !layerRef.current) return;
    const n = nodesRef.current[k];
    if (!n) return;
    layerRef.current.find('.selection-indicator').forEach((i) => i.destroy());
    const b = n.getClientRect({ relativeTo: layerRef.current });
    const r = new Konva.Rect({
      x: b.x - 4, y: b.y - 4, width: b.width + 8, height: b.height + 8,
      stroke: '#2563EB', strokeWidth: 3, dash: [10, 6],
      name: 'selection-indicator', listening: false,
    });
    layerRef.current.add(r); r.moveToTop();
    transformerRef.current?.moveToTop();
    layerRef.current.draw();
  }

  function centerBadge() {
    const txt = nodesRef.current.category_text;
    const bg = nodesRef.current.category_bg;
    if (!txt || !bg) return;
    const textW = txt.getTextWidth ? txt.getTextWidth() : (txt.text().length * (txt.fontSize() * 0.55));
    const padX = 28;
    const padY = 12;
    const newW = Math.max(textW + padX * 2, 220);
    const fs = txt.fontSize();
    const newH = fs + padY * 2;
    bg.width(newW);
    bg.height(newH);
    txt.x(bg.x() + (newW - textW) / 2);
    txt.y(bg.y() + (newH - fs) / 2 - 2);
    layerRef.current?.draw();
  }

  function editTextInline(node, key) {
    const stage = stageRef.current;
    const sb = stage.container().getBoundingClientRect();
    const p = node.absolutePosition();
    const a = document.createElement('textarea');
    a.value = node.text();
    Object.assign(a.style, {
      position: 'fixed', left: sb.left + p.x + 'px', top: sb.top + p.y + 'px',
      width: (node.width() || 400) * scale + 'px',
      minHeight: node.fontSize() * scale + 8 + 'px',
      fontSize: node.fontSize() * scale + 'px', fontFamily: node.fontFamily(),
      color: node.fill(), background: 'rgba(255,255,255,0.97)',
      border: '2px solid #2563EB', borderRadius: '6px',
      padding: '4px 8px', resize: 'none', outline: 'none',
      zIndex: '9999', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    });
    document.body.appendChild(a);
    a.focus(); a.select();
    a.addEventListener('blur', () => {
      saveUndo();
      node.text(a.value);
      if (key === 'category_text') {
        const upper = a.value.toUpperCase();
        const color = categoryColorsRef.current[upper];
        const bg = nodesRef.current.category_bg;
        if (bg && color) bg.fill(color);
        centerBadge();
      }
      layerRef.current.draw();
      refreshSel(key);
      try { document.body.removeChild(a); } catch {}
      refresh();
    });
    a.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); a.blur(); }
      if (e.key === 'Escape') { a.value = node.text(); a.blur(); }
    });
  }

  function updateProp(prop, value) {
    if (!selectedKey) return;
    const n = nodesRef.current[selectedKey];
    if (!n) return;
    saveUndo();
    if (['x', 'y', 'width', 'height', 'fontSize', 'rotation', 'cornerRadius', 'letterSpacing', 'radius', 'strokeWidth', 'padding', 'lineHeight'].includes(prop)) {
      n.setAttr(prop, parseFloat(value));
    } else if (prop === 'opacity') {
      n.opacity(parseFloat(value));
    } else if (prop === 'text') {
      n.text(value);
      if (selectedKey === 'category_text') centerBadge();
    } else if (prop === 'fill' && selectedKey === 'category_bg') {
      // Salva cor por categoria
      n.fill(value);
      const catText = nodesRef.current.category_text?.text();
      if (catText) saveCategoryColor(catText, value);
    } else {
      n.setAttr(prop, value);
    }
    if (selectedKey === 'category_text' || selectedKey === 'category_bg') centerBadge();
    layerRef.current?.draw();
    refreshSel();
    refresh();
  }

  function nudgeFontSize(delta) {
    if (!selectedKey) return;
    const n = nodesRef.current[selectedKey];
    if (!n || n.getClassName() !== 'Text') return;
    saveUndo();
    n.fontSize(Math.max(8, n.fontSize() + delta));
    if (selectedKey === 'category_text') centerBadge();
    layerRef.current?.draw();
    refreshSel();
    refresh();
  }

  function toggleBold() {
    if (!selectedKey) return;
    const n = nodesRef.current[selectedKey];
    if (!n || n.getClassName() !== 'Text') return;
    saveUndo();
    const cur = n.fontStyle();
    const has = (cur || '').includes('bold');
    const hasItalic = (cur || '').includes('italic');
    let next = '';
    if (!has) next = hasItalic ? 'bold italic' : 'bold';
    else next = hasItalic ? 'italic' : 'normal';
    n.fontStyle(next);
    if (selectedKey === 'category_text') centerBadge();
    layerRef.current?.draw();
    refresh();
  }

  function toggleItalic() {
    if (!selectedKey) return;
    const n = nodesRef.current[selectedKey];
    if (!n || n.getClassName() !== 'Text') return;
    saveUndo();
    const cur = n.fontStyle();
    const has = (cur || '').includes('italic');
    const hasBold = (cur || '').includes('bold');
    let next = '';
    if (!has) next = hasBold ? 'bold italic' : 'italic';
    else next = hasBold ? 'bold' : 'normal';
    n.fontStyle(next);
    layerRef.current?.draw();
    refresh();
  }

  function setAlign(value) {
    if (!selectedKey) return;
    const n = nodesRef.current[selectedKey];
    if (!n || n.getClassName() !== 'Text') return;
    saveUndo();
    n.align(value);
    layerRef.current?.draw();
    refresh();
  }

  function alignToCanvas(dir) {
    if (!selectedKey) return;
    const n = nodesRef.current[selectedKey];
    if (!n) return;
    saveUndo();
    const b = n.getClientRect({ relativeTo: layerRef.current, skipTransform: false });
    const cw = 1080, ch = 1920;
    if (dir === 'left') n.x(0);
    if (dir === 'centerH') n.x((cw - b.width) / 2);
    if (dir === 'right') n.x(cw - b.width);
    if (dir === 'top') n.y(0);
    if (dir === 'centerV') n.y((ch - b.height) / 2);
    if (dir === 'bottom') n.y(ch - b.height);
    layerRef.current?.draw();
    refreshSel();
    refresh();
  }

  function saveUndo() {
    const snap = {};
    Object.entries(nodesRef.current).forEach(([k, n]) => {
      snap[k] = { x: n.x(), y: n.y(), visible: n.visible(), opacity: n.opacity() };
      if (n.getClassName() === 'Text') { snap[k].text = n.text(); snap[k].fontSize = n.fontSize(); snap[k].fill = n.fill(); }
      if (n.getClassName() === 'Rect') { snap[k].width = n.width(); snap[k].height = n.height(); snap[k].fill = n.fill(); }
    });
    undoStackRef.current.push(snap);
    if (undoStackRef.current.length > 50) undoStackRef.current.shift();
  }

  function undo() {
    const prev = undoStackRef.current.pop();
    if (!prev) return;
    Object.entries(prev).forEach(([k, s]) => {
      const n = nodesRef.current[k];
      if (!n) return;
      n.x(s.x); n.y(s.y); n.visible(s.visible); n.opacity(s.opacity);
      if (s.text !== undefined && n.getClassName() === 'Text') n.text(s.text);
      if (s.fontSize !== undefined) n.fontSize(s.fontSize);
      if (s.fill !== undefined) n.fill(s.fill);
      if (s.width !== undefined) n.width(s.width);
      if (s.height !== undefined) n.height(s.height);
    });
    layerRef.current?.draw();
    refreshSel();
    refresh();
  }

  function toggleVisibility(key) {
    const n = nodesRef.current[key];
    if (!n) return;
    n.visible(!n.visible());
    layerRef.current?.draw();
    refresh();
  }

  function toggleLock(key) {
    const n = nodesRef.current[key];
    if (!n) return;
    n.draggable(!n.draggable());
    refresh();
  }

  function moveLayer(key, dir) {
    const n = nodesRef.current[key];
    if (!n) return;
    if (dir === 'up') n.moveUp();
    else if (dir === 'down') n.moveDown();
    else if (dir === 'top') n.moveToTop();
    else if (dir === 'bottom') n.moveToBottom();
    transformerRef.current?.moveToTop();
    layerRef.current?.draw();
  }

  function resetLayer(key) {
    const def = TEMPLATE_LAYERS[key];
    const n = nodesRef.current[key];
    if (!def || !n) return;
    saveUndo();
    const d = def.defaults;
    Object.entries(d).forEach(([k, v]) => {
      if (k === 'visible') n.visible(v);
      else if (k === 'listening') return;
      else try { n.setAttr(k, v); } catch {}
    });
    layerRef.current?.draw();
    refreshSel();
    refresh();
  }

  // ====================================================
  // ADICIONAR ELEMENTOS
  // ====================================================
  function addText(preset) {
    const Konva = window.Konva;
    const layer = layerRef.current;
    if (!Konva || !layer) return;
    saveUndo();
    const id = `user_text_${Date.now()}`;
    const defs = {
      title: { text: 'Título', fontSize: 72, fontStyle: 'bold' },
      subtitle: { text: 'Subtítulo', fontSize: 48, fontStyle: 'normal' },
      body: { text: 'Texto do corpo', fontSize: 32, fontStyle: 'normal' },
    };
    const cfg = defs[preset] || defs.body;
    const node = new Konva.Text({
      id, name: `user-text ${id}`, draggable: true,
      x: 100, y: 600, text: cfg.text,
      fontSize: cfg.fontSize, fontStyle: cfg.fontStyle,
      fontFamily: 'Aileron, Inter, Arial',
      fill: '#FFFFFF', width: 880, align: 'left',
    });
    bindUserEvents(node, id);
    layer.add(node);
    nodesRef.current[id] = node;
    userElsRef.current.push(id);
    restoreZOrder();
    selectElement(id);
    showToast('Texto adicionado');
  }

  function addShape(kind) {
    const Konva = window.Konva;
    const layer = layerRef.current;
    if (!Konva || !layer) return;
    saveUndo();
    const id = `user_shape_${Date.now()}`;
    let node;
    if (kind === 'rect') {
      node = new Konva.Rect({ id, name: `user-rect ${id}`, draggable: true, x: 400, y: 700, width: 280, height: 280, fill: URURAU_RED, cornerRadius: 0 });
    } else if (kind === 'circle') {
      node = new Konva.Circle({ id, name: `user-circle ${id}`, draggable: true, x: 540, y: 800, radius: 140, fill: URURAU_RED });
    } else if (kind === 'line') {
      node = new Konva.Rect({ id, name: `user-line ${id}`, draggable: true, x: 400, y: 900, width: 280, height: 8, fill: URURAU_RED, cornerRadius: 4 });
    }
    if (!node) return;
    bindUserEvents(node, id);
    layer.add(node);
    nodesRef.current[id] = node;
    userElsRef.current.push(id);
    restoreZOrder();
    selectElement(id);
    showToast(`${kind === 'rect' ? 'Retângulo' : kind === 'circle' ? 'Círculo' : 'Linha'} adicionado`);
  }

  function bindUserEvents(node, id) {
    node.on('dragstart', () => saveUndo());
    node.on('dragend', () => { selectElement(id); refresh(); });
    node.on('click tap', (e) => { e.cancelBubble = true; selectElement(id); });
    node.on('dblclick dbltap', (e) => {
      e.cancelBubble = true;
      if (node.getClassName() === 'Text') editTextInline(node, id);
    });
    node.on('transform', () => refresh());
  }

  function duplicateSelected() {
    if (!selectedKey || !selectedKey.startsWith('user_')) {
      showError('Selecione um elemento adicionado para duplicar');
      return;
    }
    const Konva = window.Konva;
    const n = nodesRef.current[selectedKey];
    if (!n) return;
    saveUndo();
    const id = `${selectedKey.split('_').slice(0, 2).join('_')}_${Date.now()}`;
    const clone = n.clone({ id, name: n.name() + ' clone', x: n.x() + 30, y: n.y() + 30 });
    bindUserEvents(clone, id);
    layerRef.current.add(clone);
    nodesRef.current[id] = clone;
    userElsRef.current.push(id);
    restoreZOrder();
    selectElement(id);
    showToast('Elemento duplicado');
  }

  function deleteSelected() {
    if (!selectedKey || !selectedKey.startsWith('user_')) {
      showError('Apenas elementos adicionados podem ser apagados');
      return;
    }
    const n = nodesRef.current[selectedKey];
    if (!n) return;
    saveUndo();
    n.destroy();
    delete nodesRef.current[selectedKey];
    userElsRef.current = userElsRef.current.filter((i) => i !== selectedKey);
    deselect();
    layerRef.current?.draw();
    showToast('Elemento removido');
  }

  // ====================================================
  // FOTO DA MATÉRIA
  // ====================================================
  function setArticleImageURL(src) {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      articleImgRef.current = img;
      const Konva = window.Konva;
      const layer = layerRef.current;
      const slot = nodesRef.current.article_image;
      if (!slot || !layer) return;
      const old = layer.findOne('.article-image-actual');
      if (old) old.destroy();
      const slotW = 1080, slotH = 1920;
      const ratioImg = img.width / img.height;
      const ratioSlot = slotW / slotH;
      let drawW, drawH, offX, offY;
      if (ratioImg > ratioSlot) {
        drawH = slotH; drawW = slotH * ratioImg;
        offX = -(drawW - slotW) / 2; offY = 0;
      } else {
        drawW = slotW; drawH = slotW / ratioImg;
        offX = 0; offY = -(drawH - slotH) / 2;
      }
      const imgNode = new Konva.Image({
        x: offX, y: offY, width: drawW, height: drawH,
        image: img, name: 'article-image-actual', id: 'article-image-actual',
        draggable: true, listening: true,
      });
      imgNode.on('click tap', (e) => {
        e.cancelBubble = true;
        transformerRef.current?.nodes([imgNode]);
        layer.draw();
      });
      layer.add(imgNode);
      restoreZOrder();
      showToast('Foto inserida - clique pra arrastar/redimensionar');
    };
    img.onerror = () => showError('Falha ao carregar imagem');
    img.src = proxiedUrl(src);
  }

  async function extrairMateria() {
    if (!materiaUrl) { showError('Cole a URL da matéria'); return; }
    setExtracting(true);
    try {
      const res = await fetch('/api/extract', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: materiaUrl }),
      });
      const ct = res.headers.get('content-type') || '';
      const d = ct.includes('json') ? await res.json() : { error: await res.text() };
      if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`);
      if (nodesRef.current.title && d.title) nodesRef.current.title.text(d.title);
      if (nodesRef.current.summary && d.summary) nodesRef.current.summary.text(d.summary);
      if (nodesRef.current.category_text && d.category) {
        const t = d.category.toUpperCase();
        nodesRef.current.category_text.text(t);
        const bg = nodesRef.current.category_bg;
        const color = categoryColorsRef.current[t] || URURAU_RED;
        if (bg) bg.fill(color);
        centerBadge();
      }
      if (d.image) setArticleImageURL(d.image);
      layerRef.current?.draw();
      showToast('Matéria extraída');
    } catch (err) {
      console.error(err);
      showError('Erro: ' + err.message);
    } finally { setExtracting(false); }
  }

  function handleSave() {
    if (!stageRef.current) return;
    const state = exportTemplate(nodesRef.current);
    state.userElements = userElsRef.current.map((id) => {
      const n = nodesRef.current[id];
      if (!n) return null;
      const e = { id, type: n.getClassName(), x: n.x(), y: n.y(), opacity: n.opacity(), rotation: n.rotation() };
      if (n.getClassName() === 'Text') {
        e.text = n.text(); e.fontSize = n.fontSize(); e.fontFamily = n.fontFamily();
        e.fontStyle = n.fontStyle(); e.fill = n.fill(); e.width = n.width(); e.align = n.align();
      }
      if (n.getClassName() === 'Rect') {
        e.width = n.width(); e.height = n.height(); e.fill = n.fill(); e.cornerRadius = n.cornerRadius();
      }
      if (n.getClassName() === 'Circle') { e.radius = n.radius(); e.fill = n.fill(); }
      return e;
    }).filter(Boolean);

    const tr = transformerRef.current;
    if (tr) tr.nodes([]);
    layerRef.current?.find('.selection-indicator').forEach((i) => i.visible(false));
    const slot = nodesRef.current.article_image;
    const slotVis = slot?.visible();
    if (slot) slot.visible(false);
    layerRef.current?.draw();
    const thumb = stageRef.current.toDataURL({ pixelRatio: 0.3, mimeType: 'image/jpeg', quality: 0.7, width: 1080, height: 1920 });
    if (slot) slot.visible(slotVis);
    layerRef.current?.find('.selection-indicator').forEach((i) => i.visible(true));
    layerRef.current?.draw();

    const isEdit = templateId && templateId.startsWith('mine_');
    const id = isEdit ? templateId : `mine_${Date.now()}`;
    const entry = {
      id, name: templateName, accent: nodesRef.current.category_bg?.fill() || URURAU_RED,
      category: 'noticia', preview: 'custom', sourceId: 'editor',
      createdAt: new Date().toISOString(),
      state, baseImage: baseDataURLRef.current, thumb,
    };
    try {
      const all = JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]');
      const filtered = all.filter((t) => t.id !== id);
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify([entry, ...filtered]));
      showToast(isEdit ? 'Template atualizado' : 'Template salvo em Meus Templates');
    } catch (e) {
      console.error(e); showError('Erro ao salvar: ' + e.message);
    }
  }

  function downloadJSON() {
    const state = exportTemplate(nodesRef.current);
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `template-${Date.now()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  function exportPNG() {
    if (!stageRef.current) return;
    const layer = layerRef.current;
    const tr = transformerRef.current;
    if (tr) tr.nodes([]);
    layer.find('.selection-indicator').forEach((i) => i.visible(false));
    const slot = nodesRef.current.article_image;
    const slotVis = slot?.visible();
    if (slot) slot.visible(false);
    layer.draw();
    const url = stageRef.current.toDataURL({ pixelRatio: 1, mimeType: 'image/png', width: 1080, height: 1920 });
    if (slot) slot.visible(slotVis);
    layer.find('.selection-indicator').forEach((i) => i.visible(true));
    layer.draw();
    const a = document.createElement('a');
    a.href = url; a.download = `ururau-${Date.now()}.png`;
    document.body.appendChild(a); a.click(); a.remove();
  }

  async function uploadBaseTemplate(file) {
    if (file.type === 'application/pdf') {
      if (!window.pdfjsLib) { showError('pdf.js carregando...'); return; }
      try {
        const buf = await file.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width; canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        applyBase(canvas.toDataURL('image/png'));
      } catch (err) { showError('Erro PDF: ' + err.message); }
    } else {
      const r = new FileReader();
      r.onload = (e) => applyBase(e.target.result);
      r.readAsDataURL(file);
    }
  }

  function applyBase(dataURL) {
    baseDataURLRef.current = dataURL;
    const Konva = window.Konva;
    const img = new window.Image();
    img.onload = () => {
      baseImgRef.current = img;
      const layer = layerRef.current;
      const old = layer.findOne('.base-template');
      if (old) old.destroy();
      const baseImg = new Konva.Image({
        x: 0, y: 0, width: 1080, height: 1920,
        image: img, name: 'base-template', listening: false,
      });
      layer.add(baseImg);
      restoreZOrder();
    };
    img.src = dataURL;
  }

  function uploadArticleImage(file) {
    const r = new FileReader();
    r.onload = (e) => setArticleImageURL(e.target.result);
    r.readAsDataURL(file);
  }

  const node = selectedKey ? nodesRef.current[selectedKey] : null;
  const nodeType = node?.getClassName?.();
  const def = selectedKey ? (TEMPLATE_LAYERS[selectedKey] || { label: selectedKey }) : null;

  const allLayerGroups = [
    ...LAYER_GROUPS,
    { label: `Adicionados (${userElsRef.current.length})`, keys: userElsRef.current },
  ];

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      <header className="h-14 border-b border-border bg-card flex items-center px-3 gap-2 shrink-0">
        <button onClick={() => router.push('/templates')} className="p-1.5 hover:bg-muted rounded"><X size={18} /></button>
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-primary" />
          <input value={templateName} onChange={(e) => setTemplateName(e.target.value)}
            className="font-bold text-sm bg-transparent border-b border-transparent focus:border-primary outline-none px-1 w-44" />
        </div>
        <div className="flex-1 flex items-center gap-2 max-w-2xl mx-3">
          <Globe size={13} className="text-muted-foreground shrink-0" />
          <input value={materiaUrl} onChange={(e) => setMateriaUrl(e.target.value)}
            placeholder="Cole o link da matéria..."
            className="flex-1 bg-muted rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <button onClick={extrairMateria} disabled={extracting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50 shrink-0">
            {extracting ? <Loader2 size={11} className="animate-spin" /> : <Link2 size={11} />}
            Extrair
          </button>
        </div>
        <button onClick={undo} className="p-1.5 hover:bg-muted rounded text-muted-foreground" title="Desfazer (Ctrl+Z)"><Undo2 size={15} /></button>
        <div className="w-px h-6 bg-border" />
        <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90">
          <Save size={11} /> Salvar
        </button>
        <button onClick={downloadJSON} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted text-foreground text-xs font-semibold hover:bg-muted/80" title="Exportar JSON">
          <FileText size={11} />
        </button>
        <button onClick={exportPNG} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-success text-success-foreground text-xs font-semibold hover:opacity-90">
          <Send size={11} /> PNG
        </button>
      </header>

      {/* TOOLBAR CONTEXTUAL TIPO CANVA */}
      {node && (
        <div className="h-11 border-b border-border bg-card flex items-center px-3 gap-1 shrink-0 overflow-x-auto">
          <span className="text-[10px] font-bold uppercase text-muted-foreground mr-2">{def?.label || selectedKey}</span>

          {nodeType === 'Text' && (
            <>
              <button onClick={() => nudgeFontSize(-4)} className="p-1.5 hover:bg-muted rounded" title="Diminuir fonte"><Minus size={13} /></button>
              <input type="number" value={Math.round(node.fontSize())} onChange={(e) => updateProp('fontSize', e.target.value)}
                className="w-14 bg-muted rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <button onClick={() => nudgeFontSize(4)} className="p-1.5 hover:bg-muted rounded" title="Aumentar fonte"><Plus size={13} /></button>
              <div className="w-px h-6 bg-border mx-1" />
              <button onClick={toggleBold} className={`p-1.5 rounded ${(node.fontStyle() || '').includes('bold') ? 'bg-primary/15 text-primary' : 'hover:bg-muted'}`} title="Negrito"><Bold size={13} /></button>
              <button onClick={toggleItalic} className={`p-1.5 rounded ${(node.fontStyle() || '').includes('italic') ? 'bg-primary/15 text-primary' : 'hover:bg-muted'}`} title="Itálico"><Italic size={13} /></button>
              <div className="w-px h-6 bg-border mx-1" />
              <button onClick={() => setAlign('left')} className={`p-1.5 rounded ${node.align() === 'left' ? 'bg-primary/15 text-primary' : 'hover:bg-muted'}`}><AlignLeft size={13} /></button>
              <button onClick={() => setAlign('center')} className={`p-1.5 rounded ${node.align() === 'center' ? 'bg-primary/15 text-primary' : 'hover:bg-muted'}`}><AlignCenter size={13} /></button>
              <button onClick={() => setAlign('right')} className={`p-1.5 rounded ${node.align() === 'right' ? 'bg-primary/15 text-primary' : 'hover:bg-muted'}`}><AlignRight size={13} /></button>
              <button onClick={() => setAlign('justify')} className={`p-1.5 rounded ${node.align() === 'justify' ? 'bg-primary/15 text-primary' : 'hover:bg-muted'}`}><AlignJustify size={13} /></button>
              <div className="w-px h-6 bg-border mx-1" />
              <label className="flex items-center gap-1 cursor-pointer">
                <span className="text-[10px] text-muted-foreground">Cor</span>
                <input type="color" value={node.fill()} onChange={(e) => updateProp('fill', e.target.value)} className="w-7 h-7 rounded cursor-pointer" />
              </label>
            </>
          )}

          {(nodeType === 'Rect' || nodeType === 'Circle') && (
            <>
              <label className="flex items-center gap-1 cursor-pointer">
                <span className="text-[10px] text-muted-foreground">Cor</span>
                <input type="color" value={node.fill() || '#ffffff'} onChange={(e) => updateProp('fill', e.target.value)} className="w-7 h-7 rounded cursor-pointer" />
              </label>
              {nodeType === 'Rect' && (
                <>
                  <div className="w-px h-6 bg-border mx-1" />
                  <span className="text-[10px] text-muted-foreground">Cantos</span>
                  <input type="number" min="0" value={Math.round(node.cornerRadius() || 0)} onChange={(e) => updateProp('cornerRadius', e.target.value)}
                    className="w-14 bg-muted rounded px-2 py-1 text-xs text-center" />
                </>
              )}
            </>
          )}

          <div className="w-px h-6 bg-border mx-1" />
          <span className="text-[10px] text-muted-foreground">Opacidade</span>
          <input type="range" min="0" max="1" step="0.05" value={node.opacity()} onChange={(e) => updateProp('opacity', e.target.value)} className="w-24 accent-primary" />

          <div className="w-px h-6 bg-border mx-1" />
          <button onClick={() => alignToCanvas('left')} className="p-1.5 hover:bg-muted rounded" title="Alinhar esquerda"><MoveHorizontal size={13} /></button>
          <button onClick={() => alignToCanvas('centerH')} className="p-1.5 hover:bg-muted rounded text-[10px]" title="Centro horizontal">↔C</button>
          <button onClick={() => alignToCanvas('centerV')} className="p-1.5 hover:bg-muted rounded text-[10px]" title="Centro vertical">↕C</button>

          <div className="w-px h-6 bg-border mx-1" />
          <button onClick={() => moveLayer(selectedKey, 'top')} className="p-1.5 hover:bg-muted rounded" title="Trazer para frente"><ArrowUpToLine size={13} /></button>
          <button onClick={() => moveLayer(selectedKey, 'bottom')} className="p-1.5 hover:bg-muted rounded" title="Mandar para trás"><ArrowDownToLine size={13} /></button>

          {selectedKey.startsWith('user_') && (
            <>
              <div className="w-px h-6 bg-border mx-1" />
              <button onClick={duplicateSelected} className="p-1.5 hover:bg-muted rounded" title="Duplicar (Ctrl+D)"><Copy size={13} /></button>
              <button onClick={deleteSelected} className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded" title="Apagar"><Trash2 size={13} /></button>
            </>
          )}
        </div>
      )}

      {error && <div className="bg-destructive/10 border-b border-destructive/20 text-destructive text-xs px-4 py-2 flex items-center gap-2"><AlertCircle size={14} /> {error}</div>}
      {toast && <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg bg-success text-success-foreground shadow-card text-sm font-medium animate-fade-up">✓ {toast}</div>}

      <div className="flex-1 flex overflow-hidden">
        <nav className="w-16 bg-card border-r border-border flex flex-col items-center py-3 gap-1 shrink-0">
          {[
            { id: 'camadas',  label: 'Camadas',  icon: LayersIcon },
            { id: 'texto',    label: 'Texto',    icon: Type },
            { id: 'forma',    label: 'Forma',    icon: Square },
            { id: 'imagens',  label: 'Imagens',  icon: ImgIcon },
            { id: 'template', label: 'Base',     icon: FileText },
            { id: 'uploads',  label: 'Uploads',  icon: Upload },
          ].map((t) => {
            const Icon = t.icon;
            const active = tool === t.id;
            return (
              <button key={t.id} onClick={() => setTool(t.id)}
                className={`w-12 h-14 rounded-lg flex flex-col items-center justify-center gap-0.5 ${
                  active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}>
                <Icon size={17} />
                <span className="text-[9px] font-semibold">{t.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="w-72 bg-card border-r border-border overflow-y-auto">
          {tool === 'camadas' && (
            <div className="p-2 space-y-2">
              <div className="px-2 pt-2 pb-1">
                <h3 className="text-xs font-bold uppercase text-muted-foreground">Camadas</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Clique para selecionar</p>
              </div>
              {allLayerGroups.map((group) => {
                const collapsed = collapsedGroups[group.label];
                return (
                  <div key={group.label} className="border border-border rounded-lg overflow-hidden">
                    <button onClick={() => setCollapsedGroups({ ...collapsedGroups, [group.label]: !collapsed })}
                      className="w-full px-3 py-2 bg-muted/50 hover:bg-muted text-left text-[11px] font-bold uppercase tracking-wider flex items-center justify-between">
                      <span>{group.label}</span>
                      <ChevronLeft size={12} className={collapsed ? '' : '-rotate-90 transition-transform'} />
                    </button>
                    {!collapsed && (
                      <div className="p-1 space-y-0.5">
                        {group.keys.map((key) => {
                          const def = TEMPLATE_LAYERS[key];
                          const n = nodesRef.current[key];
                          if (!n) return null;
                          const isActive = selectedKey === key;
                          const visible = n.visible();
                          const locked = !n.draggable();
                          const label = def?.label || key.replace('user_', '').replace(/_\d+$/, '');
                          return (
                            <div key={key}
                              className={`flex items-center gap-1 p-1.5 rounded text-[11px] ${
                                isActive ? 'bg-primary/15 border border-primary/30' : 'hover:bg-muted'
                              }`}>
                              <button onClick={() => selectElement(key)} className="flex-1 text-left truncate">
                                {label}
                              </button>
                              <button onClick={() => toggleVisibility(key)} className="p-0.5 hover:bg-card rounded">
                                {visible ? <Eye size={10} /> : <EyeOff size={10} className="text-muted-foreground" />}
                              </button>
                              <button onClick={() => toggleLock(key)} className="p-0.5 hover:bg-card rounded">
                                {locked ? <Lock size={10} className="text-warning" /> : <Unlock size={10} />}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {tool === 'texto' && (
            <div className="p-3 space-y-2">
              <h3 className="text-xs font-bold uppercase text-muted-foreground mb-2">Adicionar Texto</h3>
              <button onClick={() => addText('title')} className="w-full p-3 rounded-lg bg-muted hover:bg-primary/10 text-left">
                <p className="text-xl font-bold">Adicionar Título</p>
                <p className="text-[10px] text-muted-foreground">72px, bold</p>
              </button>
              <button onClick={() => addText('subtitle')} className="w-full p-3 rounded-lg bg-muted hover:bg-primary/10 text-left">
                <p className="text-base font-semibold">Adicionar Subtítulo</p>
                <p className="text-[10px] text-muted-foreground">48px</p>
              </button>
              <button onClick={() => addText('body')} className="w-full p-3 rounded-lg bg-muted hover:bg-primary/10 text-left">
                <p className="text-sm">Adicionar Corpo de Texto</p>
                <p className="text-[10px] text-muted-foreground">32px</p>
              </button>
            </div>
          )}

          {tool === 'forma' && (
            <div className="p-3 space-y-2">
              <h3 className="text-xs font-bold uppercase text-muted-foreground mb-2">Adicionar Forma</h3>
              <button onClick={() => addShape('rect')} className="w-full p-4 rounded-lg bg-muted hover:bg-primary/10 flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/80 rounded-sm" />
                <span className="text-sm font-medium">Retângulo</span>
              </button>
              <button onClick={() => addShape('circle')} className="w-full p-4 rounded-lg bg-muted hover:bg-primary/10 flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/80 rounded-full" />
                <span className="text-sm font-medium">Círculo</span>
              </button>
              <button onClick={() => addShape('line')} className="w-full p-4 rounded-lg bg-muted hover:bg-primary/10 flex items-center gap-3">
                <div className="w-10 h-2 bg-primary/80 rounded-full" />
                <span className="text-sm font-medium">Linha</span>
              </button>
            </div>
          )}

          {tool === 'imagens' && (
            <div className="p-3 space-y-3">
              <h3 className="text-xs font-bold uppercase text-muted-foreground">Foto da matéria</h3>
              <p className="text-[10px] text-muted-foreground">Após inserir, clique pra arrastar e redimensionar com 8 alças.</p>
              <label className="cursor-pointer block w-full border-2 border-dashed border-border rounded-lg p-5 text-center hover:bg-muted/30">
                <ImgIcon size={20} className="mx-auto mb-2 text-muted-foreground" />
                <p className="text-xs font-semibold">Enviar do PC</p>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && uploadArticleImage(e.target.files[0])} />
              </label>
              <button onClick={() => { const u = prompt('URL da imagem:'); if (u) setArticleImageURL(u); }} className="w-full py-2 rounded-lg bg-muted text-xs font-medium hover:bg-muted/80">
                Por URL
              </button>
            </div>
          )}

          {tool === 'template' && (
            <div className="p-3 space-y-3">
              <h3 className="text-xs font-bold uppercase text-muted-foreground">Logo Ururau (base)</h3>
              <p className="text-[11px] text-muted-foreground">Já vem com o logo do Canva carregado como PNG transparente.</p>
              <label className="cursor-pointer block w-full border-2 border-dashed border-primary/40 rounded-lg p-4 text-center hover:bg-primary/5">
                <FileText size={20} className="mx-auto mb-1 text-primary" />
                <p className="text-xs font-semibold text-primary">Substituir por outro PDF/PNG</p>
                <input type="file" accept=".pdf,image/png,image/jpeg" className="hidden" onChange={(e) => e.target.files[0] && uploadBaseTemplate(e.target.files[0])} />
              </label>
              <button onClick={() => applyBase(CANVA_BASE_IMAGE)} className="w-full py-2 rounded-lg bg-muted text-xs font-medium hover:bg-muted/80">
                Resetar pro logo original
              </button>
            </div>
          )}

          {tool === 'uploads' && (
            <div className="p-3">
              <h3 className="text-xs font-bold uppercase mb-3 text-muted-foreground">Uploads</h3>
              <label className="cursor-pointer block w-full border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/30">
                <Upload size={20} className="mx-auto mb-2 text-muted-foreground" />
                <p className="text-xs font-semibold">Enviar imagem</p>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && uploadArticleImage(e.target.files[0])} />
              </label>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto bg-muted/30 p-6">
          {(!konvaReady || !fontReady) && (
            <div className="flex items-center justify-center h-96 text-muted-foreground text-sm">
              <Loader2 className="animate-spin mr-3" size={18} />
              {!konvaReady ? 'Carregando Konva.js...' : 'Carregando fontes...'}
            </div>
          )}
          <div id="konva-stage" className="mx-auto rounded-md shadow-2xl"
            style={{ width: 1080 * scale, height: 1920 * scale, background: '#000' }} />
        </div>

        <div className="w-80 bg-card border-l border-border overflow-y-auto">
          <div className="p-3 border-b border-border">
            <h3 className="text-xs font-bold uppercase text-muted-foreground">Propriedades</h3>
          </div>
          <div className="p-3">
            {!node ? (
              <p className="text-[11px] text-muted-foreground">Selecione uma camada para editar</p>
            ) : (
              <div className="space-y-3">
                <div className="px-2 py-1.5 rounded bg-primary/10 text-primary text-[11px] font-bold text-center">
                  {def?.label || selectedKey}
                </div>

                <div className="flex items-center gap-1">
                  <button onClick={() => toggleVisibility(selectedKey)} className="flex-1 py-1.5 rounded bg-muted text-[10px] font-semibold hover:bg-muted/80">
                    {node.visible() ? 'Ocultar' : 'Mostrar'}
                  </button>
                  <button onClick={() => toggleLock(selectedKey)} className="flex-1 py-1.5 rounded bg-muted text-[10px] font-semibold hover:bg-muted/80">
                    {node.draggable() ? 'Bloquear' : 'Liberar'}
                  </button>
                  <button onClick={() => moveLayer(selectedKey, 'up')} className="p-1.5 rounded bg-muted hover:bg-muted/80"><ArrowUp size={11} /></button>
                  <button onClick={() => moveLayer(selectedKey, 'down')} className="p-1.5 rounded bg-muted hover:bg-muted/80"><ArrowDown size={11} /></button>
                  <button onClick={() => resetLayer(selectedKey)} className="p-1.5 rounded bg-warning/10 text-warning hover:bg-warning/20"><Undo2 size={11} /></button>
                </div>

                <Section title="Posição">
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="X"><NumInput value={Math.round(node.x())} onChange={(v) => updateProp('x', v)} /></Field>
                    <Field label="Y"><NumInput value={Math.round(node.y())} onChange={(v) => updateProp('y', v)} /></Field>
                  </div>
                </Section>

                {(nodeType === 'Text' || nodeType === 'Rect') && (
                  <Section title="Tamanho da caixa (até onde o texto vai)">
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Largura"><NumInput value={Math.round(node.width() || 0)} onChange={(v) => updateProp('width', v)} /></Field>
                      {nodeType === 'Rect' && <Field label="Altura"><NumInput value={Math.round(node.height() || 0)} onChange={(v) => updateProp('height', v)} /></Field>}
                    </div>
                  </Section>
                )}

                {nodeType === 'Text' && (
                  <>
                    <Section title="Texto">
                      <textarea value={node.text()} onChange={(e) => updateProp('text', e.target.value)} rows={2}
                        className="w-full bg-muted rounded px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                    </Section>
                    <Section title={`Tamanho de fonte: ${Math.round(node.fontSize())}px`}>
                      <input type="range" min="8" max="200" step="1" value={node.fontSize()} onChange={(e) => updateProp('fontSize', e.target.value)} className="w-full accent-primary" />
                    </Section>
                    <Section title="Ar em volta (padding interno)">
                      <NumInput value={node.padding() || 0} onChange={(v) => updateProp('padding', v)} />
                    </Section>
                    <Section title={`Espaçamento entre linhas (${(node.lineHeight() || 1).toFixed(2)})`}>
                      <input type="range" min="0.8" max="2.5" step="0.05" value={node.lineHeight() || 1} onChange={(e) => updateProp('lineHeight', e.target.value)} className="w-full accent-primary" />
                    </Section>
                    <Section title={`Espaçamento entre letras (${node.letterSpacing() || 0})`}>
                      <input type="range" min="-5" max="20" step="0.5" value={node.letterSpacing() || 0} onChange={(e) => updateProp('letterSpacing', e.target.value)} className="w-full accent-primary" />
                    </Section>
                  </>
                )}

                {nodeType === 'Circle' && (
                  <Section title="Raio">
                    <NumInput value={Math.round(node.radius())} onChange={(v) => updateProp('radius', v)} />
                  </Section>
                )}

                {(nodeType === 'Rect' || nodeType === 'Circle') && (
                  <Section title="Cor de preenchimento">
                    <input type="color" value={node.fill() || '#ffffff'} onChange={(e) => updateProp('fill', e.target.value)} className="w-full h-9 rounded p-1 cursor-pointer" />
                  </Section>
                )}

                {selectedKey === 'category_bg' && (
                  <>
                    <Section title="Cores rápidas por categoria (clique pra salvar)">
                      <div className="grid grid-cols-6 gap-1">
                        {Object.entries(categoryColorsRef.current).slice(0, 18).map(([name, c]) => (
                          <button key={name + c} onClick={() => updateProp('fill', c)}
                            className="aspect-square rounded border border-border hover:scale-110 transition-transform"
                            style={{ background: c }} title={name} />
                        ))}
                      </div>
                    </Section>
                    <p className="text-[10px] text-muted-foreground">
                      💾 A cor selecionada fica salva para essa categoria (persistente entre sessões)
                    </p>
                  </>
                )}

                <Section title="Alinhar no canvas">
                  <div className="grid grid-cols-3 gap-1">
                    <button onClick={() => alignToCanvas('left')} className="py-1.5 rounded bg-muted text-[10px] hover:bg-muted/80">Esq</button>
                    <button onClick={() => alignToCanvas('centerH')} className="py-1.5 rounded bg-muted text-[10px] hover:bg-muted/80">Centro H</button>
                    <button onClick={() => alignToCanvas('right')} className="py-1.5 rounded bg-muted text-[10px] hover:bg-muted/80">Dir</button>
                    <button onClick={() => alignToCanvas('top')} className="py-1.5 rounded bg-muted text-[10px] hover:bg-muted/80">Topo</button>
                    <button onClick={() => alignToCanvas('centerV')} className="py-1.5 rounded bg-muted text-[10px] hover:bg-muted/80">Centro V</button>
                    <button onClick={() => alignToCanvas('bottom')} className="py-1.5 rounded bg-muted text-[10px] hover:bg-muted/80">Base</button>
                  </div>
                </Section>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="h-11 border-t border-border bg-card flex items-center px-4 gap-3 shrink-0">
        <button onClick={() => setScale((s) => Math.max(0.1, s - 0.05))} className="p-1.5 hover:bg-muted rounded"><ZoomOut size={13} /></button>
        <input type="range" min="0.1" max="1" step="0.05" value={scale} onChange={(e) => setScale(parseFloat(e.target.value))} className="w-32 accent-primary" />
        <button onClick={() => setScale((s) => Math.min(1, s + 0.05))} className="p-1.5 hover:bg-muted rounded"><ZoomIn size={13} /></button>
        <span className="text-[10px] font-mono text-muted-foreground w-10">{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale(0.32)} className="text-[10px] px-2 py-1 hover:bg-muted rounded">Ajustar</button>
        <div className="ml-auto text-[9px] text-muted-foreground hidden md:flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 bg-muted rounded">Ctrl+S</kbd>salvar
          <kbd className="px-1.5 py-0.5 bg-muted rounded">Ctrl+D</kbd>duplicar
          <kbd className="px-1.5 py-0.5 bg-muted rounded">Setas</kbd>mover
          <kbd className="px-1.5 py-0.5 bg-muted rounded">2-click</kbd>editar
        </div>
      </footer>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">{title}</label>
      {children}
    </div>
  );
}
function Field({ label, children }) {
  return (
    <div>
      <span className="text-[9px] text-muted-foreground block mb-0.5">{label}</span>
      {children}
    </div>
  );
}
function NumInput({ value, onChange }) {
  return (
    <input type="number" value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full bg-muted rounded px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/30" />
  );
}
