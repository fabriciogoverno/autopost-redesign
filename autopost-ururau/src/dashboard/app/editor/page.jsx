'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Save, X, Undo2, Type, Image as ImgIcon, Square, Sparkles, Upload,
  Layers as LayersIcon, ChevronLeft, ChevronDown, Plus, Copy, Trash2,
  ArrowUp, ArrowDown, ZoomIn, ZoomOut, Eye, Link2, Circle, Triangle, Star, Heart,
  Loader2, Lock, Unlock, EyeOff, AlertCircle, Globe, Send, FileText,
  Bold, Italic, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Minus, ArrowUpToLine, ArrowDownToLine, MoreHorizontal, QrCode, ScanBarcode,
  Languages, Keyboard,
} from 'lucide-react';
import { proxiedUrl } from '@/lib/imgProxy';
import { TEMPLATE_LAYERS, LAYER_ORDER, LAYER_GROUPS, CATEGORY_COLORS, URURAU_RED, exportTemplate, importTemplate } from '@/lib/templateLayers';
import { CANVA_BASE_IMAGE } from '@/lib/canvaBaseImage';

const TEMPLATES_KEY = 'ururau-my-templates-v1';
const CATEGORY_COLORS_KEY = 'ururau-category-colors';

const TEXT_PRESETS = [
  { id: 'heading', label: 'Add a heading', size: 72, weight: 'bold' },
  { id: 'subheading', label: 'Add a subheading', size: 48, weight: 'normal' },
  { id: 'body', label: 'Add body text', size: 32, weight: 'normal' },
];

const TEXT_STYLES = [
  { label: 'SPECIAL\nOFFER', color: '#E63946', bg: '#FFEAEA' },
  { label: 'BUY ONE\nGET ONE', color: '#06A77D', bg: '#E0F8EF' },
  { label: 'Family Friendly', color: '#F77F00', italic: true },
  { label: 'Winter\nCollection', color: '#9D4EDD' },
  { label: 'FOLLOW US', color: '#1D3557' },
  { label: 'DOWNLOAD\nNOW', color: '#EF233C' },
  { label: 'COMING\nSOON', color: '#0077B6' },
  { label: "Don't miss out!", color: '#F1C40F', italic: true },
  { label: 'SALE ENDS\nSOON', color: '#FFFFFF', bg: '#E63946' },
  { label: 'Premium\nQuality', color: '#A0522D', italic: true },
  { label: 'Thank you!', color: '#E63946', italic: true },
  { label: 'JOIN US\nTODAY', color: '#9D4EDD' },
  { label: 'BEST\nSELLER', color: '#E63946', italic: true },
  { label: 'Made with\nlove', color: '#E63946', italic: true },
];

const SHAPES = [
  { id: 'rect-fill', label: 'Quadrado', kind: 'rect', filled: true },
  { id: 'circle-fill', label: 'Círculo', kind: 'circle', filled: true },
  { id: 'triangle-fill', label: 'Triângulo', kind: 'triangle', filled: true },
  { id: 'rect-line', label: 'Quadrado (linha)', kind: 'rect', filled: false },
  { id: 'circle-line', label: 'Círculo (linha)', kind: 'circle', filled: false },
  { id: 'triangle-line', label: 'Triângulo (linha)', kind: 'triangle', filled: false },
  { id: 'star-fill', label: 'Estrela', kind: 'star', filled: true },
  { id: 'heart-fill', label: 'Coração', kind: 'heart', filled: true },
  { id: 'hex-fill', label: 'Hexágono', kind: 'hexagon', filled: true },
  { id: 'star-line', label: 'Estrela (linha)', kind: 'star', filled: false },
  { id: 'heart-line', label: 'Coração (linha)', kind: 'heart', filled: false },
  { id: 'hex-line', label: 'Hexágono (linha)', kind: 'hexagon', filled: false },
  { id: 'line', label: 'Linha', kind: 'line', filled: true },
  { id: 'bubble', label: 'Balão de fala', kind: 'bubble', filled: true },
];

const PLACEHOLDERS = [
  { id: 'rect', label: 'Retângulo', kind: 'rect' },
  { id: 'circle', label: 'Círculo', kind: 'circle' },
  { id: 'rect-r', label: 'Retângulo arredondado', kind: 'rect', rounded: 80 },
  { id: 'oval', label: 'Oval', kind: 'oval' },
  { id: 'star', label: 'Estrela', kind: 'star' },
  { id: 'triangle', label: 'Triângulo', kind: 'triangle' },
  { id: 'hex', label: 'Hexágono', kind: 'hexagon' },
  { id: 'diamond', label: 'Diamante', kind: 'diamond' },
];

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
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-[#0f0f0f] text-white"><Loader2 className="animate-spin" /></div>}>
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
  const baseDataURLRef = useRef(CANVA_BASE_IMAGE);
  const transformerRef = useRef(null);
  const userElsRef = useRef([]);
  const categoryColorsRef = useRef({});

  const [konvaReady, setKonvaReady] = useState(false);
  const [fontReady, setFontReady] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);
  const [scale, setScale] = useState(0.32);
  const [tool, setTool] = useState('texto');
  const [imgSubTab, setImgSubTab] = useState('marcadores');
  const [moreSubTab, setMoreSubTab] = useState('qrcode');
  const [layersOpen, setLayersOpen] = useState(true);
  const [templateName, setTemplateName] = useState('M001');
  const [currentPage, setCurrentPage] = useState(2); // 1=post, 2=story
  const [materiaUrl, setMateriaUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);
  const [, force] = useState(0);
  const refresh = () => force((n) => n + 1);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2500); }
  function showError(msg) { setError(msg); setTimeout(() => setError(null), 5000); }

  useEffect(() => { categoryColorsRef.current = loadCategoryColors(); }, []);

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
        setTemplateName(found.name || 'M001');
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
      enabledAnchors: ['top-left','top-right','bottom-left','bottom-right','middle-left','middle-right','top-center','bottom-center'],
      borderStroke: '#2563EB', borderStrokeWidth: 2, borderDash: [6,4],
      anchorStroke: '#2563EB', anchorFill: '#FFFFFF', anchorStrokeWidth: 2, anchorSize: 12,
      keepRatio: false, rotateEnabled: true, rotationSnaps: [0,90,180,270],
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
      if (!e.target.hasName('selection-indicator')) { tr.nodes([]); layer.draw(); }
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
    userElsRef.current.forEach((id) => { const n = nodesRef.current[id]; if (n) n.zIndex(z++); });
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
        return new Konva.Rect({ ...base, x: d.x, y: d.y, width: d.width, height: d.height,
          fill: 'rgba(255,255,255,0.04)', stroke: 'rgba(255,255,255,0.15)', strokeWidth: 2, dash: [12,8], listening: false });
      case 'gradient-rect':
        return new Konva.Rect({ ...base, x: d.x, y: d.y, width: d.width, height: d.height,
          fillLinearGradientStartPoint: { x: 0, y: d.height * d.gradientStart },
          fillLinearGradientEndPoint: { x: 0, y: d.height * d.gradientEnd },
          fillLinearGradientColorStops: [0, d.colorTop, 0.4, d.colorMid, 1, d.colorBottom], listening: false });
      default: return null;
    }
  }

  function bindEvents(node, key) {
    if (!node.draggable()) return;
    node.on('dragstart', () => saveUndo());
    node.on('dragend', () => { selectElement(key); refresh(); });
    node.on('click tap', (e) => { e.cancelBubble = true; selectElement(key); });
    node.on('dblclick dbltap', (e) => { e.cancelBubble = true; if (node.getClassName() === 'Text') editTextInline(node, key); });
    node.on('mouseenter', () => { document.body.style.cursor = 'move'; });
    node.on('mouseleave', () => { document.body.style.cursor = 'default'; });
  }

  function selectElement(key) {
    deselect();
    setSelectedKey(key);
    refreshSel(key);
    const node = nodesRef.current[key];
    if (node && key.startsWith('user_')) {
      transformerRef.current?.nodes([node]); layerRef.current?.draw();
    } else { transformerRef.current?.nodes([]); layerRef.current?.draw(); }
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
    const r = new Konva.Rect({ x: b.x - 4, y: b.y - 4, width: b.width + 8, height: b.height + 8,
      stroke: '#2563EB', strokeWidth: 3, dash: [10,6], name: 'selection-indicator', listening: false });
    layerRef.current.add(r); r.moveToTop();
    transformerRef.current?.moveToTop();
    layerRef.current.draw();
  }

  function centerBadge() {
    const txt = nodesRef.current.category_text;
    const bg = nodesRef.current.category_bg;
    if (!txt || !bg) return;
    const textW = txt.getTextWidth ? txt.getTextWidth() : (txt.text().length * (txt.fontSize() * 0.55));
    const padX = 28, padY = 12;
    const newW = Math.max(textW + padX * 2, 220);
    const fs = txt.fontSize();
    const newH = fs + padY * 2;
    bg.width(newW); bg.height(newH);
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
      width: (node.width() || 400) * scale + 'px', minHeight: node.fontSize() * scale + 8 + 'px',
      fontSize: node.fontSize() * scale + 'px', fontFamily: node.fontFamily(),
      color: node.fill(), background: 'rgba(255,255,255,0.97)',
      border: '2px solid #2563EB', borderRadius: '6px', padding: '4px 8px',
      resize: 'none', outline: 'none', zIndex: '9999', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    });
    document.body.appendChild(a);
    a.focus(); a.select();
    a.addEventListener('blur', () => {
      saveUndo();
      node.text(a.value);
      if (key === 'category_text') {
        const color = categoryColorsRef.current[a.value.toUpperCase()];
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
    if (['x','y','width','height','fontSize','rotation','cornerRadius','letterSpacing','radius','strokeWidth','padding','lineHeight'].includes(prop)) {
      n.setAttr(prop, parseFloat(value));
    } else if (prop === 'opacity') n.opacity(parseFloat(value));
    else if (prop === 'text') { n.text(value); if (selectedKey === 'category_text') centerBadge(); }
    else if (prop === 'fill' && selectedKey === 'category_bg') {
      n.fill(value);
      const catText = nodesRef.current.category_text?.text();
      if (catText) saveCategoryColor(catText, value);
    } else n.setAttr(prop, value);
    if (selectedKey === 'category_text' || selectedKey === 'category_bg') centerBadge();
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

  function toggleVisibility(key) { const n = nodesRef.current[key]; if (!n) return; n.visible(!n.visible()); layerRef.current?.draw(); refresh(); }
  function toggleLock(key) { const n = nodesRef.current[key]; if (!n) return; n.draggable(!n.draggable()); refresh(); }
  function moveLayer(key, dir) {
    const n = nodesRef.current[key]; if (!n) return;
    if (dir === 'up') n.moveUp(); else if (dir === 'down') n.moveDown();
    else if (dir === 'top') n.moveToTop(); else if (dir === 'bottom') n.moveToBottom();
    transformerRef.current?.moveToTop();
    layerRef.current?.draw();
  }

  function addText(presetId, style) {
    const Konva = window.Konva;
    const preset = TEXT_PRESETS.find(p => p.id === presetId) || TEXT_PRESETS[2];
    const layer = layerRef.current;
    if (!Konva || !layer) return;
    saveUndo();
    const id = `user_text_${Date.now()}`;
    const node = new Konva.Text({
      id, name: `user-text ${id}`, draggable: true,
      x: 100, y: 600, text: style?.label || preset.label,
      fontSize: preset.size, fontStyle: (preset.weight === 'bold' ? 'bold' : 'normal') + (style?.italic ? ' italic' : ''),
      fontFamily: 'Aileron, Inter, Arial',
      fill: style?.color || '#FFFFFF', width: 880, align: 'left',
    });
    bindUserEvents(node, id);
    layer.add(node);
    nodesRef.current[id] = node;
    userElsRef.current.push(id);
    restoreZOrder();
    selectElement(id);
    showToast('Texto adicionado');
  }

  function addShape(shape) {
    const Konva = window.Konva;
    const layer = layerRef.current;
    if (!Konva || !layer) return;
    saveUndo();
    const id = `user_shape_${Date.now()}`;
    let node;
    const fill = shape.filled ? URURAU_RED : 'transparent';
    const stroke = shape.filled ? null : URURAU_RED;
    const strokeWidth = shape.filled ? 0 : 6;
    if (shape.kind === 'rect') {
      node = new Konva.Rect({ id, name: `user-rect ${id}`, draggable: true, x: 400, y: 700, width: 280, height: 280, fill, stroke, strokeWidth, cornerRadius: shape.rounded || 0 });
    } else if (shape.kind === 'circle') {
      node = new Konva.Circle({ id, name: `user-circle ${id}`, draggable: true, x: 540, y: 800, radius: 140, fill, stroke, strokeWidth });
    } else if (shape.kind === 'triangle') {
      node = new Konva.RegularPolygon({ id, name: `user-triangle ${id}`, draggable: true, x: 540, y: 800, sides: 3, radius: 160, fill, stroke, strokeWidth });
    } else if (shape.kind === 'star') {
      node = new Konva.Star({ id, name: `user-star ${id}`, draggable: true, x: 540, y: 800, numPoints: 5, innerRadius: 60, outerRadius: 140, fill, stroke, strokeWidth });
    } else if (shape.kind === 'heart') {
      // Coração via path
      node = new Konva.Path({ id, name: `user-heart ${id}`, draggable: true, x: 400, y: 700, scaleX: 6, scaleY: 6,
        data: 'M25,40 C25,25 10,15 10,5 C10,-5 25,-5 25,5 C25,-5 40,-5 40,5 C40,15 25,25 25,40 Z',
        fill, stroke, strokeWidth: strokeWidth / 6 });
    } else if (shape.kind === 'hexagon') {
      node = new Konva.RegularPolygon({ id, name: `user-hex ${id}`, draggable: true, x: 540, y: 800, sides: 6, radius: 150, fill, stroke, strokeWidth });
    } else if (shape.kind === 'line') {
      node = new Konva.Rect({ id, name: `user-line ${id}`, draggable: true, x: 400, y: 900, width: 400, height: 10, fill: URURAU_RED, cornerRadius: 5 });
    } else if (shape.kind === 'bubble') {
      node = new Konva.Rect({ id, name: `user-bubble ${id}`, draggable: true, x: 400, y: 700, width: 320, height: 220, fill, stroke, strokeWidth, cornerRadius: 30 });
    }
    if (!node) return;
    bindUserEvents(node, id);
    layer.add(node);
    nodesRef.current[id] = node;
    userElsRef.current.push(id);
    restoreZOrder();
    selectElement(id);
    showToast('Forma adicionada');
  }

  function addPlaceholder(p) {
    const Konva = window.Konva;
    const layer = layerRef.current;
    if (!Konva || !layer) return;
    saveUndo();
    const id = `user_placeholder_${Date.now()}`;
    let node;
    if (p.kind === 'rect' || p.kind === 'oval') {
      node = new Konva.Rect({ id, name: `user-ph ${id}`, draggable: true, x: 300, y: 600, width: p.kind === 'oval' ? 380 : 280, height: p.kind === 'oval' ? 240 : 280, fill: '#BABABA', cornerRadius: p.rounded || (p.kind === 'oval' ? 120 : 0) });
    } else if (p.kind === 'circle') {
      node = new Konva.Circle({ id, name: `user-ph ${id}`, draggable: true, x: 540, y: 800, radius: 160, fill: '#BABABA' });
    } else if (p.kind === 'star') {
      node = new Konva.Star({ id, name: `user-ph ${id}`, draggable: true, x: 540, y: 800, numPoints: 5, innerRadius: 70, outerRadius: 160, fill: '#BABABA' });
    } else if (p.kind === 'triangle' || p.kind === 'hexagon' || p.kind === 'diamond') {
      const sides = p.kind === 'triangle' ? 3 : p.kind === 'diamond' ? 4 : 6;
      node = new Konva.RegularPolygon({ id, name: `user-ph ${id}`, draggable: true, x: 540, y: 800, sides, radius: 170, rotation: p.kind === 'diamond' ? 0 : 0, fill: '#BABABA' });
    }
    if (!node) return;
    bindUserEvents(node, id);
    layer.add(node);
    nodesRef.current[id] = node;
    userElsRef.current.push(id);
    restoreZOrder();
    selectElement(id);
    showToast('Placeholder adicionado');
  }

  function bindUserEvents(node, id) {
    node.on('dragstart', () => saveUndo());
    node.on('dragend', () => { selectElement(id); refresh(); });
    node.on('click tap', (e) => { e.cancelBubble = true; selectElement(id); });
    node.on('dblclick dbltap', (e) => { e.cancelBubble = true; if (node.getClassName() === 'Text') editTextInline(node, id); });
    node.on('transform', () => refresh());
  }

  function duplicateSelected() {
    if (!selectedKey || !selectedKey.startsWith('user_')) { showError('Selecione um elemento adicionado'); return; }
    const n = nodesRef.current[selectedKey];
    if (!n) return;
    saveUndo();
    const id = `${selectedKey.split('_').slice(0,2).join('_')}_${Date.now()}`;
    const clone = n.clone({ id, name: n.name() + ' clone', x: n.x() + 30, y: n.y() + 30 });
    bindUserEvents(clone, id);
    layerRef.current.add(clone);
    nodesRef.current[id] = clone;
    userElsRef.current.push(id);
    restoreZOrder();
    selectElement(id);
    showToast('Duplicado');
  }

  function deleteSelected() {
    if (!selectedKey || !selectedKey.startsWith('user_')) { showError('Apenas elementos adicionados'); return; }
    const n = nodesRef.current[selectedKey];
    if (!n) return;
    saveUndo();
    n.destroy();
    delete nodesRef.current[selectedKey];
    userElsRef.current = userElsRef.current.filter((i) => i !== selectedKey);
    deselect();
    layerRef.current?.draw();
    showToast('Removido');
  }

  function setArticleImageURL(src) {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
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
      const imgNode = new Konva.Image({ x: offX, y: offY, width: drawW, height: drawH, image: img, name: 'article-image-actual', id: 'article-image-actual', draggable: true, listening: true });
      imgNode.on('click tap', (e) => { e.cancelBubble = true; transformerRef.current?.nodes([imgNode]); layer.draw(); });
      layer.add(imgNode);
      restoreZOrder();
      showToast('Foto inserida');
    };
    img.onerror = () => showError('Falha ao carregar imagem');
    img.src = proxiedUrl(src);
  }

  async function extrairMateria() {
    if (!materiaUrl) { showError('Cole a URL'); return; }
    setExtracting(true);
    try {
      const res = await fetch('/api/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: materiaUrl }) });
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
      createdAt: new Date().toISOString(), state, baseImage: baseDataURLRef.current, thumb,
    };
    try {
      const all = JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]');
      const filtered = all.filter((t) => t.id !== id);
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify([entry, ...filtered]));
      showToast(isEdit ? 'Atualizado' : 'Salvo em Meus Templates');
    } catch (e) { console.error(e); showError('Erro: ' + e.message); }
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

  function applyBase(dataURL) {
    baseDataURLRef.current = dataURL;
    const Konva = window.Konva;
    const img = new window.Image();
    img.onload = () => {
      const layer = layerRef.current;
      const old = layer.findOne('.base-template');
      if (old) old.destroy();
      const baseImg = new Konva.Image({ x: 0, y: 0, width: 1080, height: 1920, image: img, name: 'base-template', listening: false });
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
  const def = selectedKey ? (TEMPLATE_LAYERS[selectedKey] || { label: selectedKey }) : null;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0f0f0f] text-white">
      {/* HEADER */}
      <header className="h-12 bg-[#1a1a1a] flex items-center px-4 gap-3 shrink-0 border-b border-[#2a2a2a]">
        <button onClick={() => router.push('/templates')} className="flex items-center gap-2 hover:opacity-80">
          <div className="w-7 h-7 rounded bg-primary flex items-center justify-center"><Sparkles size={14} /></div>
          <span className="font-bold text-sm">AutoPost<sup className="text-[8px]">®</sup></span>
        </button>
        <input value={templateName} onChange={(e) => setTemplateName(e.target.value)}
          className="text-sm bg-transparent border-b border-transparent focus:border-white outline-none px-1 w-32" />
        <div className="flex-1 flex items-center gap-2 max-w-2xl mx-3">
          <Globe size={13} className="text-white/60 shrink-0" />
          <input value={materiaUrl} onChange={(e) => setMateriaUrl(e.target.value)}
            placeholder="Cole o link da matéria..."
            className="flex-1 bg-[#2a2a2a] rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <button onClick={extrairMateria} disabled={extracting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 shrink-0">
            {extracting ? <Loader2 size={11} className="animate-spin" /> : <Link2 size={11} />}
            Extrair
          </button>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <Languages size={14} className="text-white/60" />
          <span className="text-xs">BR</span>
        </div>
        <Keyboard size={14} className="text-white/60" />
        <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-white text-xs font-semibold hover:opacity-90">
          Salvar <kbd className="bg-white/10 px-1 py-0.5 rounded text-[9px]">⌘+S</kbd>
        </button>
      </header>

      {error && <div className="bg-destructive/10 border-b border-destructive/20 text-destructive text-xs px-4 py-2 flex items-center gap-2"><AlertCircle size={14} /> {error}</div>}
      {toast && <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg bg-success text-success-foreground shadow-card text-sm font-medium animate-fade-up">✓ {toast}</div>}

      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR ESCURA estilo AutoPost */}
        <nav className="w-20 bg-[#1a1a1a] border-r border-[#2a2a2a] flex flex-col items-center py-2 gap-1 shrink-0">
          {[
            { id: 'texto',   label: 'Texto',    icon: Type },
            { id: 'imagens', label: 'Imagens',  icon: ImgIcon },
            { id: 'formas',  label: 'Formas',   icon: Square },
            { id: 'vetores', label: 'Vetores',  icon: Star },
            { id: 'uploads', label: 'Uploads',  icon: Upload },
            { id: 'mais',    label: 'Mais',     icon: MoreHorizontal },
          ].map((t) => {
            const Icon = t.icon;
            const active = tool === t.id;
            return (
              <button key={t.id} onClick={() => setTool(t.id)}
                className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center gap-0.5 ${active ? 'bg-[#2a2a2a] text-white' : 'text-white/60 hover:bg-[#2a2a2a]/50 hover:text-white'}`}>
                <Icon size={20} />
                <span className="text-[10px] font-medium">{t.label}</span>
              </button>
            );
          })}
        </nav>

        {/* SUB-PAINEL DA TAB */}
        <div className="w-80 bg-[#1a1a1a] border-r border-[#2a2a2a] overflow-y-auto">
          {tool === 'texto' && (
            <div className="p-3 space-y-2">
              {TEXT_PRESETS.map((p) => (
                <button key={p.id} onClick={() => addText(p.id)} className="w-full p-4 rounded-lg bg-[#2a2a2a] hover:bg-[#3a3a3a] text-left">
                  <p style={{ fontSize: p.id === 'heading' ? '28px' : p.id === 'subheading' ? '18px' : '14px', fontWeight: p.weight }}>{p.label}</p>
                </button>
              ))}
              <div className="grid grid-cols-2 gap-2 mt-3">
                {TEXT_STYLES.map((s, i) => (
                  <button key={i} onClick={() => addText('heading', s)} className="aspect-[3/2] rounded-lg flex items-center justify-center text-center px-2 font-bold text-[11px] leading-tight hover:scale-105 transition-transform"
                    style={{ background: s.bg || '#2a2a2a', color: s.color, fontStyle: s.italic ? 'italic' : 'normal' }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tool === 'imagens' && (
            <div>
              <div className="flex border-b border-[#2a2a2a]">
                <button onClick={() => setImgSubTab('marcadores')} className={`flex-1 py-3 text-xs font-medium ${imgSubTab === 'marcadores' ? 'text-white border-b-2 border-primary' : 'text-white/60'}`}>📍 Marcadores</button>
                <button onClick={() => setImgSubTab('galeria')} className={`flex-1 py-3 text-xs font-medium ${imgSubTab === 'galeria' ? 'text-white border-b-2 border-primary' : 'text-white/60'}`}>🖼️ Galeria</button>
              </div>
              {imgSubTab === 'marcadores' && (
                <div className="p-3 grid grid-cols-2 gap-2">
                  {PLACEHOLDERS.map((p) => (
                    <button key={p.id} onClick={() => addPlaceholder(p)} className="aspect-[3/4] rounded-lg bg-[#2a2a2a] hover:bg-[#3a3a3a] flex items-center justify-center text-[10px] text-white/60">
                      Placeholder
                    </button>
                  ))}
                </div>
              )}
              {imgSubTab === 'galeria' && (
                <div className="p-3">
                  <label className="cursor-pointer block w-full border-2 border-dashed border-[#3a3a3a] rounded-lg p-5 text-center hover:bg-[#2a2a2a]">
                    <ImgIcon size={20} className="mx-auto mb-2 text-white/60" />
                    <p className="text-xs font-semibold">Enviar do PC</p>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && uploadArticleImage(e.target.files[0])} />
                  </label>
                </div>
              )}
            </div>
          )}

          {tool === 'formas' && (
            <div className="p-3">
              <h3 className="text-xs font-bold mb-2 text-white/80">Shapes</h3>
              <div className="grid grid-cols-3 gap-2">
                {SHAPES.map((s) => (
                  <button key={s.id} onClick={() => addShape(s)} className="aspect-square rounded-lg bg-[#2a2a2a] hover:bg-[#3a3a3a] flex items-center justify-center" title={s.label}>
                    <ShapePreview shape={s} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {tool === 'vetores' && (
            <div className="p-3">
              <p className="text-[10px] text-white/50 mb-2">Todos os vetores cortesia de IconFinder</p>
              <input placeholder="Pesquisar vetores..." className="w-full bg-[#2a2a2a] rounded px-3 py-2 text-xs mb-3 focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <div className="grid grid-cols-3 gap-2">
                {['📷','🎬','📰','📺','🎥','📻','📱','💻','📚','✈️','🚗','🏠'].map((emoji, i) => (
                  <button key={i} className="aspect-square rounded-lg bg-[#2a2a2a] hover:bg-[#3a3a3a] flex items-center justify-center text-3xl">{emoji}</button>
                ))}
              </div>
              <p className="text-[10px] text-white/40 mt-3">IconFinder API: integração completa em breve</p>
            </div>
          )}

          {tool === 'uploads' && (
            <div className="p-3 space-y-3">
              <h3 className="text-xs font-bold text-white/80">Uploads</h3>
              <label className="cursor-pointer block w-full border-2 border-dashed border-[#3a3a3a] rounded-lg p-6 text-center hover:bg-[#2a2a2a]">
                <Upload size={20} className="mx-auto mb-2 text-white/60" />
                <p className="text-xs font-semibold">Enviar imagem</p>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && uploadArticleImage(e.target.files[0])} />
              </label>
            </div>
          )}

          {tool === 'mais' && (
            <div className="p-3 space-y-2">
              <button onClick={() => setMoreSubTab('qrcode')} className={`w-full p-3 rounded-lg flex items-center gap-3 ${moreSubTab === 'qrcode' ? 'bg-primary text-white' : 'bg-[#2a2a2a] hover:bg-[#3a3a3a]'}`}>
                <QrCode size={18} />
                <span className="text-sm font-medium">QR Code</span>
              </button>
              <button onClick={() => setMoreSubTab('barcode')} className={`w-full p-3 rounded-lg flex items-center gap-3 ${moreSubTab === 'barcode' ? 'bg-primary text-white' : 'bg-[#2a2a2a] hover:bg-[#3a3a3a]'}`}>
                <ScanBarcode size={18} />
                <span className="text-sm font-medium">Código de Barras</span>
              </button>
              <button onClick={() => setMoreSubTab('rating')} className={`w-full p-3 rounded-lg flex items-center gap-3 ${moreSubTab === 'rating' ? 'bg-primary text-white' : 'bg-[#2a2a2a] hover:bg-[#3a3a3a]'}`}>
                <Star size={18} />
                <span className="text-sm font-medium">Avaliação</span>
              </button>
              <div className="mt-4 p-3 bg-[#2a2a2a] rounded-lg">
                {moreSubTab === 'qrcode' && (<><p className="text-xs mb-2">URL para QR Code:</p><input placeholder="https://..." className="w-full bg-[#1a1a1a] rounded px-2 py-1.5 text-xs" /></>)}
                {moreSubTab === 'barcode' && (<><p className="text-xs mb-2">Código:</p><input placeholder="EAN13..." className="w-full bg-[#1a1a1a] rounded px-2 py-1.5 text-xs" /></>)}
                {moreSubTab === 'rating' && (<><p className="text-xs mb-2">Estrelas (1-5):</p><input type="number" min="1" max="5" defaultValue="5" className="w-full bg-[#1a1a1a] rounded px-2 py-1.5 text-xs" /></>)}
                <button className="w-full mt-3 py-2 rounded bg-primary text-xs font-semibold">Adicionar</button>
              </div>
            </div>
          )}
        </div>

        {/* CANVAS CENTRAL */}
        <div className="flex-1 overflow-auto bg-[#262626] p-6 relative">
          <div className="absolute top-4 left-4 text-xs text-white/40 font-mono">{currentPage === 1 ? 'post' : 'story'}</div>
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#1a1a1a] rounded-md px-3 py-1.5 flex items-center gap-2 text-xs">
            <span className="font-mono">1080×1920</span>
            <button className="hover:bg-[#2a2a2a] p-1 rounded" title="Mover topo"><ArrowUpToLine size={11} /></button>
            <button className="hover:bg-[#2a2a2a] p-1 rounded" title="Mover base"><ArrowDownToLine size={11} /></button>
            <button className="hover:bg-[#2a2a2a] p-1 rounded" title="Duplicar"><Copy size={11} /></button>
            <button className="hover:bg-[#2a2a2a] p-1 rounded" title="Apagar"><Trash2 size={11} /></button>
          </div>
          {(!konvaReady || !fontReady) && (
            <div className="flex items-center justify-center h-96 text-white/60 text-sm">
              <Loader2 className="animate-spin mr-3" size={18} />
              {!konvaReady ? 'Carregando Konva.js...' : 'Carregando fontes...'}
            </div>
          )}
          <div id="konva-stage" className="mx-auto rounded-md shadow-2xl"
            style={{ width: 1080 * scale, height: 1920 * scale, background: '#000', marginTop: 40 }} />

          {/* PAINEL CAMADAS FLUTUANTE estilo AutoPost */}
          <div className="absolute top-4 right-4 w-64 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden shadow-xl">
            <button onClick={() => setLayersOpen(!layersOpen)} className="w-full px-3 py-2 flex items-center justify-between hover:bg-[#2a2a2a]">
              <span className="text-xs font-semibold">Camadas <span className="text-white/40 text-[9px]">ⓘ</span></span>
              <ChevronDown size={14} className={`transition-transform ${layersOpen ? '' : '-rotate-90'}`} />
            </button>
            {layersOpen && (
              <div className="max-h-96 overflow-y-auto p-2 space-y-1">
                <div className="text-[10px] text-white/40 uppercase font-bold px-2 py-1">post</div>
                {LAYER_ORDER.filter(k => nodesRef.current[k]).map((key) => {
                  const def = TEMPLATE_LAYERS[key];
                  const n = nodesRef.current[key];
                  if (!def || !n) return null;
                  const isActive = selectedKey === key;
                  const visible = n.visible();
                  const icon = def.kind === 'text' ? '𝐓' : def.kind === 'gradient-rect' ? '◉' : def.kind === 'image-slot' ? '🖼' : '▭';
                  return (
                    <div key={key} className={`flex items-center gap-1 p-1.5 rounded text-[11px] ${isActive ? 'bg-primary/15 border border-primary/30' : 'hover:bg-[#2a2a2a]'}`}>
                      <span className="text-white/40 text-xs cursor-grab">⋮⋮</span>
                      <span className="text-white/40">{icon}</span>
                      <button onClick={() => selectElement(key)} className="flex-1 text-left truncate">
                        {def.label.toLowerCase().replace('badge · ', '').replace('logo ururau', 'logo')}
                      </button>
                      <button onClick={() => toggleVisibility(key)} className="p-0.5 hover:bg-[#3a3a3a] rounded">{visible ? <Eye size={10} /> : <EyeOff size={10} className="text-white/40" />}</button>
                      <span className="text-white/40">⋯</span>
                    </div>
                  );
                })}
                {userElsRef.current.length > 0 && (
                  <>
                    <div className="text-[10px] text-white/40 uppercase font-bold px-2 py-1 mt-2">adicionados</div>
                    {userElsRef.current.map((key) => {
                      const n = nodesRef.current[key];
                      if (!n) return null;
                      const isActive = selectedKey === key;
                      const label = key.replace('user_', '').replace(/_\d+$/, '');
                      return (
                        <div key={key} className={`flex items-center gap-1 p-1.5 rounded text-[11px] ${isActive ? 'bg-primary/15 border border-primary/30' : 'hover:bg-[#2a2a2a]'}`}>
                          <span className="text-white/40 cursor-grab">⋮⋮</span>
                          <button onClick={() => selectElement(key)} className="flex-1 text-left truncate">{label}</button>
                          <button onClick={() => deleteSelected()} className="p-0.5 hover:bg-destructive/20 rounded"><Trash2 size={10} /></button>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* PROPS LATERAL */}
        {node && (
          <div className="w-72 bg-[#1a1a1a] border-l border-[#2a2a2a] overflow-y-auto p-3 space-y-3 text-xs">
            <div className="px-2 py-1.5 rounded bg-primary/20 text-primary font-bold text-center">{def?.label || selectedKey}</div>
            {node.getClassName() === 'Text' && (
              <>
                <textarea value={node.text()} onChange={(e) => updateProp('text', e.target.value)} rows={2} className="w-full bg-[#2a2a2a] rounded px-2 py-1 resize-none" />
                <div className="flex items-center gap-1">
                  <button onClick={() => updateProp('fontSize', Math.max(8, node.fontSize() - 4))} className="p-2 bg-[#2a2a2a] rounded">A-</button>
                  <input type="number" value={Math.round(node.fontSize())} onChange={(e) => updateProp('fontSize', e.target.value)} className="flex-1 bg-[#2a2a2a] rounded px-2 py-1 text-center" />
                  <button onClick={() => updateProp('fontSize', node.fontSize() + 4)} className="p-2 bg-[#2a2a2a] rounded">A+</button>
                </div>
                <input type="color" value={node.fill()} onChange={(e) => updateProp('fill', e.target.value)} className="w-full h-9 rounded cursor-pointer" />
              </>
            )}
            {(node.getClassName() === 'Rect' || node.getClassName() === 'Circle') && (
              <input type="color" value={node.fill() || '#ffffff'} onChange={(e) => updateProp('fill', e.target.value)} className="w-full h-9 rounded cursor-pointer" />
            )}
            {selectedKey === 'category_bg' && (
              <div>
                <p className="text-[10px] text-white/60 mb-1">Cores oficiais por categoria (salva pra sempre):</p>
                <div className="grid grid-cols-6 gap-1">
                  {Object.entries(categoryColorsRef.current).slice(0, 12).map(([n, c]) => (
                    <button key={n} onClick={() => updateProp('fill', c)} className="aspect-square rounded border border-[#3a3a3a]" style={{ background: c }} title={n} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RODAPÉ COM PÁGINAS */}
      <footer className="h-11 bg-[#1a1a1a] flex items-center px-4 gap-3 shrink-0 border-t border-[#2a2a2a]">
        <button onClick={() => setScale((s) => Math.max(0.1, s - 0.05))} className="p-1.5 hover:bg-[#2a2a2a] rounded"><ZoomOut size={13} /></button>
        <input type="range" min="0.1" max="1" step="0.05" value={scale} onChange={(e) => setScale(parseFloat(e.target.value))} className="w-32 accent-primary" />
        <button onClick={() => setScale((s) => Math.min(1, s + 0.05))} className="p-1.5 hover:bg-[#2a2a2a] rounded"><ZoomIn size={13} /></button>
        <span className="text-[10px] font-mono text-white/60 w-10">{Math.round(scale * 100)}%</span>
        <div className="flex items-center gap-2 ml-6">
          <span className="text-xs">Páginas</span>
          <button onClick={() => setCurrentPage(1)} className={`w-7 h-7 rounded text-xs font-semibold ${currentPage === 1 ? 'bg-primary text-white' : 'bg-[#2a2a2a] hover:bg-[#3a3a3a]'}`}>1</button>
          <button onClick={() => setCurrentPage(2)} className={`w-7 h-7 rounded text-xs font-semibold ${currentPage === 2 ? 'bg-primary text-white' : 'bg-[#2a2a2a] hover:bg-[#3a3a3a]'}`}>2</button>
          <button className="p-1 hover:bg-[#2a2a2a] rounded text-white/60"><Plus size={12} /></button>
        </div>
        <button onClick={undo} className="ml-auto p-1.5 hover:bg-[#2a2a2a] rounded text-white/60" title="Desfazer"><Undo2 size={13} /></button>
        <button onClick={exportPNG} className="px-3 py-1 rounded bg-success text-success-foreground text-xs font-semibold hover:opacity-90">PNG</button>
      </footer>
    </div>
  );
}

function ShapePreview({ shape }) {
  const fillColor = shape.filled ? '#FFFFFF' : 'transparent';
  const strokeColor = shape.filled ? 'transparent' : '#FFFFFF';
  const strokeWidth = shape.filled ? 0 : 2;
  if (shape.kind === 'rect') return <svg width="36" height="36" viewBox="0 0 36 36"><rect x="3" y="3" width="30" height="30" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} rx={shape.rounded ? 8 : 0} /></svg>;
  if (shape.kind === 'circle') return <svg width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} /></svg>;
  if (shape.kind === 'triangle') return <svg width="36" height="36" viewBox="0 0 36 36"><polygon points="18,4 32,30 4,30" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} /></svg>;
  if (shape.kind === 'star') return <svg width="36" height="36" viewBox="0 0 36 36"><polygon points="18,3 22,13 33,13 24,20 27,31 18,24 9,31 12,20 3,13 14,13" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} /></svg>;
  if (shape.kind === 'heart') return <svg width="36" height="36" viewBox="0 0 36 36"><path d="M18,30 C18,18 6,12 6,6 C6,0 18,0 18,6 C18,0 30,0 30,6 C30,12 18,18 18,30 Z" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} /></svg>;
  if (shape.kind === 'hexagon') return <svg width="36" height="36" viewBox="0 0 36 36"><polygon points="18,3 31,11 31,25 18,33 5,25 5,11" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} /></svg>;
  if (shape.kind === 'line') return <svg width="36" height="36" viewBox="0 0 36 36"><line x1="3" y1="18" x2="33" y2="18" stroke="#FFFFFF" strokeWidth="3" /></svg>;
  if (shape.kind === 'bubble') return <svg width="36" height="36" viewBox="0 0 36 36"><rect x="4" y="6" width="28" height="20" rx="6" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} /></svg>;
  return null;
}
