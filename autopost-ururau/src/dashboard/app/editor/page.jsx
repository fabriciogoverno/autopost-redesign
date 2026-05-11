'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Save, X, Undo2, Type, Image as ImgIcon, Square, Sparkles, Upload,
  ChevronDown, Plus, Copy, Trash2, ArrowUp, ArrowDown, ZoomIn, ZoomOut, Eye, Link2,
  Loader2, Lock, EyeOff, AlertCircle, Globe, Send, FileText,
  Bold, Italic, AlignLeft, AlignCenter, AlignRight, Minus, MoreHorizontal,
  QrCode, ScanBarcode, Languages, Keyboard, FlipHorizontal, FlipVertical, Crop, Replace,
  Scissors, Anchor, Layers as LayersIcon, Star,
} from 'lucide-react';
import { proxiedUrl } from '@/lib/imgProxy';
import { TEMPLATE_LAYERS, LAYER_ORDER, LAYER_DISPLAY_NAMES, CATEGORY_COLORS, URURAU_RED, exportTemplate, importTemplate } from '@/lib/templateLayers';
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
];

const SHAPES = [
  { id: 'rect-fill', kind: 'rect', filled: true },
  { id: 'circle-fill', kind: 'circle', filled: true },
  { id: 'triangle-fill', kind: 'triangle', filled: true },
  { id: 'star-fill', kind: 'star', filled: true },
  { id: 'heart-fill', kind: 'heart', filled: true },
  { id: 'hex-fill', kind: 'hexagon', filled: true },
];

const EFFECTS_PRESETS = [
  { id: 'none', label: 'None', filters: {} },
  { id: 'grayscale', label: 'Grayscale', filters: { grayscale: true } },
  { id: 'sepia', label: 'Sepia', filters: { sepia: true } },
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
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-primary" /></div>}>
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
  const [scale, setScale] = useState(0.3);
  const [tool, setTool] = useState('texto');
  const [showEffects, setShowEffects] = useState(false);
  const [layersOpen, setLayersOpen] = useState(true);
  const [templateName, setTemplateName] = useState('M001');
  const [currentPage, setCurrentPage] = useState(2);
  const [materiaUrl, setMateriaUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);
  const [imageFilters, setImageFilters] = useState({ blur: 0, brightness: 1, contrast: 1, saturation: 1 });
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
        if (found.state) setTimeout(() => importTemplate(nodesRef.current, found.state), 500);
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
      keepRatio: false, rotateEnabled: true,
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
    let z = 0;
    for (const key of LAYER_ORDER) {
      const n = nodesRef.current[key];
      if (n) n.zIndex(z++);
      if (key === 'image-5' && realArticle) realArticle.zIndex(z++);
      if (key === 'overlay' && baseTemplate) baseTemplate.zIndex(z++);
    }
    userElsRef.current.forEach((id) => { const n = nodesRef.current[id]; if (n) n.zIndex(z++); });
    transformerRef.current?.moveToTop();
    layer.draw();
  }

  function createNode(Konva, key, def) {
    const d = def.defaults;
    const base = { name: key, id: key, draggable: d.listening !== false };
    switch (def.kind) {
      case 'rect': return new Konva.Rect({ ...base, ...d });
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
  }

  function selectElement(key) {
    deselect();
    setSelectedKey(key);
    refresh();
  }

  function deselect() {
    setSelectedKey(null);
    if (!layerRef.current) return;
    layerRef.current.find('.selection-indicator').forEach((i) => i.destroy());
    transformerRef.current?.nodes([]);
    layerRef.current.draw();
  }

  function centerBadge() {
    const txt = nodesRef.current.category_text;
    const bg = nodesRef.current.category;
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
      fontSize: node.fontSize() * scale + 'px', color: node.fill(),
      background: 'rgba(255,255,255,0.97)', border: '2px solid #2563EB',
      borderRadius: '6px', padding: '4px 8px', resize: 'none', outline: 'none', zIndex: '9999',
    });
    document.body.appendChild(a);
    a.focus(); a.select();
    a.addEventListener('blur', () => {
      saveUndo();
      node.text(a.value);
      if (key === 'category_text') {
        const color = categoryColorsRef.current[a.value.toUpperCase()];
        const bg = nodesRef.current.category;
        if (bg && color) bg.fill(color);
        centerBadge();
      }
      layerRef.current.draw();
      try { document.body.removeChild(a); } catch {}
      refresh();
    });
    a.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); a.blur(); }
      if (e.key === 'Escape') { a.value = node.text(); a.blur(); }
    });
  }

  function saveUndo() {
    const snap = {};
    Object.entries(nodesRef.current).forEach(([k, n]) => {
      snap[k] = { x: n.x(), y: n.y(), visible: n.visible(), opacity: n.opacity() };
      if (n.getClassName() === 'Text') { snap[k].text = n.text(); }
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
    });
    layerRef.current?.draw();
    refresh();
  }

  function toggleVisibility(key) {
    const n = nodesRef.current[key];
    if (!n) return;
    n.visible(!n.visible());
    layerRef.current?.draw();
    refresh();
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
    node.on('click tap', (e) => { e.cancelBubble = true; transformerRef.current?.nodes([node]); setSelectedKey(id); layer.draw(); });
    node.on('dblclick dbltap', (e) => { e.cancelBubble = true; editTextInline(node, id); });
    layer.add(node);
    nodesRef.current[id] = node;
    userElsRef.current.push(id);
    restoreZOrder();
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
    if (shape.kind === 'rect') node = new Konva.Rect({ id, name: `user-rect ${id}`, draggable: true, x: 400, y: 700, width: 280, height: 280, fill, stroke, strokeWidth });
    else if (shape.kind === 'circle') node = new Konva.Circle({ id, name: `user-circle ${id}`, draggable: true, x: 540, y: 800, radius: 140, fill, stroke, strokeWidth });
    else if (shape.kind === 'triangle') node = new Konva.RegularPolygon({ id, name: `user-tri ${id}`, draggable: true, x: 540, y: 800, sides: 3, radius: 160, fill, stroke, strokeWidth });
    else if (shape.kind === 'star') node = new Konva.Star({ id, name: `user-star ${id}`, draggable: true, x: 540, y: 800, numPoints: 5, innerRadius: 60, outerRadius: 140, fill, stroke, strokeWidth });
    else if (shape.kind === 'hexagon') node = new Konva.RegularPolygon({ id, name: `user-hex ${id}`, draggable: true, x: 540, y: 800, sides: 6, radius: 150, fill, stroke, strokeWidth });
    if (!node) return;
    node.on('click tap', (e) => { e.cancelBubble = true; transformerRef.current?.nodes([node]); setSelectedKey(id); layer.draw(); });
    layer.add(node);
    nodesRef.current[id] = node;
    userElsRef.current.push(id);
    restoreZOrder();
    showToast('Forma adicionada');
  }

  function setArticleImageURL(src) {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const Konva = window.Konva;
      const layer = layerRef.current;
      const slot = nodesRef.current['image-5'];
      if (!slot || !layer) return;
      const old = layer.findOne('.article-image-actual');
      if (old) old.destroy();
      const ratioImg = img.width / img.height;
      let drawW, drawH, offX, offY;
      if (ratioImg > (1080/1920)) { drawH = 1920; drawW = 1920 * ratioImg; offX = -(drawW - 1080) / 2; offY = 0; }
      else { drawW = 1080; drawH = 1080 / ratioImg; offX = 0; offY = -(drawH - 1920) / 2; }
      const imgNode = new Konva.Image({ x: offX, y: offY, width: drawW, height: drawH, image: img, name: 'article-image-actual', id: 'article-image-actual', draggable: true, listening: true });
      imgNode.cache();
      imgNode.on('click tap', (e) => { e.cancelBubble = true; transformerRef.current?.nodes([imgNode]); setSelectedKey('article-image-actual'); layer.draw(); });
      layer.add(imgNode);
      restoreZOrder();
      showToast('Foto inserida');
    };
    img.onerror = () => showError('Falha ao carregar imagem');
    img.src = proxiedUrl(src);
  }

  function applyImageFilters(preset) {
    const Konva = window.Konva;
    const img = layerRef.current?.findOne('.article-image-actual');
    if (!img) { showError('Selecione a imagem primeiro'); return; }
    const filters = [];
    if (preset.filters.grayscale) filters.push(Konva.Filters.Grayscale);
    if (preset.filters.sepia) filters.push(Konva.Filters.Sepia);
    img.filters(filters);
    img.cache();
    layerRef.current.draw();
    showToast(`Efeito: ${preset.label}`);
  }

  function applyImageAdjustment(prop, value) {
    const Konva = window.Konva;
    const img = layerRef.current?.findOne('.article-image-actual');
    if (!img) return;
    const filters = img.filters() || [];
    if (prop === 'blur') {
      if (!filters.includes(Konva.Filters.Blur)) filters.push(Konva.Filters.Blur);
      img.blurRadius(value);
    } else if (prop === 'brightness') {
      if (!filters.includes(Konva.Filters.Brighten)) filters.push(Konva.Filters.Brighten);
      img.brightness(value - 1);
    } else if (prop === 'contrast') {
      if (!filters.includes(Konva.Filters.Contrast)) filters.push(Konva.Filters.Contrast);
      img.contrast((value - 1) * 100);
    } else if (prop === 'saturation') {
      if (!filters.includes(Konva.Filters.HSL)) filters.push(Konva.Filters.HSL);
      img.saturation(value - 1);
    }
    img.filters(filters);
    img.cache();
    layerRef.current.draw();
    setImageFilters({ ...imageFilters, [prop]: value });
  }

  async function extrairMateria() {
    if (!materiaUrl) { showError('Cole a URL'); return; }
    setExtracting(true);
    try {
      const res = await fetch('/api/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: materiaUrl }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      if (nodesRef.current.title && d.title) nodesRef.current.title.text(d.title);
      if (nodesRef.current.subtitle && d.summary) nodesRef.current.subtitle.text(d.summary);
      if (nodesRef.current.category_text && d.category) {
        const t = d.category.toUpperCase();
        nodesRef.current.category_text.text(t);
        const bg = nodesRef.current.category;
        const color = categoryColorsRef.current[t] || URURAU_RED;
        if (bg) bg.fill(color);
        centerBadge();
      }
      if (d.image) setArticleImageURL(d.image);
      layerRef.current?.draw();
      showToast('Matéria extraída');
    } catch (err) { showError('Erro: ' + err.message); }
    finally { setExtracting(false); }
  }

  function handleSave() {
    if (!stageRef.current) return;
    const state = exportTemplate(nodesRef.current);
    const tr = transformerRef.current;
    if (tr) tr.nodes([]);
    layerRef.current?.find('.selection-indicator').forEach((i) => i.visible(false));
    const slot = nodesRef.current['image-5'];
    const slotVis = slot?.visible();
    if (slot) slot.visible(false);
    layerRef.current?.draw();
    const thumb = stageRef.current.toDataURL({ pixelRatio: 0.3, mimeType: 'image/jpeg', quality: 0.7, width: 1080, height: 1920 });
    if (slot) slot.visible(slotVis);
    layerRef.current?.draw();

    const isEdit = templateId && templateId.startsWith('mine_');
    const id = isEdit ? templateId : `mine_${Date.now()}`;
    const entry = { id, name: templateName, accent: nodesRef.current.category?.fill() || URURAU_RED, category: 'noticia', createdAt: new Date().toISOString(), state, baseImage: baseDataURLRef.current, thumb };
    try {
      const all = JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]');
      const filtered = all.filter((t) => t.id !== id);
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify([entry, ...filtered]));
      showToast(isEdit ? 'Atualizado' : 'Salvo em Meus Templates');
    } catch (e) { showError('Erro: ' + e.message); }
  }

  function applyBase(dataURL) {
    baseDataURLRef.current = dataURL;
    const Konva = window.Konva;
    const img = new window.Image();
    img.onload = () => {
      const layer = layerRef.current;
      const old = layer.findOne('.base-template');
      if (old) old.destroy();
      const baseImg = new Konva.Image({ x: 0, y: 0, width: 1080, height: 1920, image: img, name: 'base-template', id: 'logo', listening: false });
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

  function closeEditor() {
    if (!confirm('Fechar sem salvar? Mudanças serão perdidas.')) return;
    router.push('/templates');
  }

  const isImageSelected = selectedKey === 'article-image-actual';

  return (
    <div className="h-screen w-screen flex flex-col bg-white">
      <div className="h-9 bg-white border-b border-gray-200 flex items-center justify-between px-4 text-xs shrink-0">
        <span className="font-medium">Editor</span>
        <button onClick={closeEditor} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
          Fechar sem salvar <X size={12} />
        </button>
      </div>

      <header className="h-14 bg-[#0a0a0a] text-white flex items-center px-4 gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center"><Sparkles size={14} /></div>
          <span className="font-bold text-sm">AutoPost<sup className="text-[8px]">®</sup></span>
        </div>
        <input value={templateName} onChange={(e) => setTemplateName(e.target.value)}
          className="bg-transparent border-b border-transparent focus:border-white outline-none px-2 text-sm w-28" />
        <div className="flex-1 flex items-center gap-2 max-w-xl mx-3">
          <Globe size={13} className="text-white/60 shrink-0" />
          <input value={materiaUrl} onChange={(e) => setMateriaUrl(e.target.value)}
            placeholder="Cole o link da matéria..."
            className="flex-1 bg-white/10 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-white/30" />
          <button onClick={extrairMateria} disabled={extracting}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-white text-xs font-medium hover:opacity-90 disabled:opacity-50">
            {extracting ? <Loader2 size={11} className="animate-spin" /> : 'Extrair'}
          </button>
        </div>
        <div className="flex items-center gap-1 text-xs"><Languages size={14} /> BR</div>
        <Keyboard size={14} className="text-white/60" />
        <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-white text-xs font-semibold">
          Salvar <kbd className="bg-white/20 px-1 py-0.5 rounded text-[9px]">⌘+S</kbd>
        </button>
      </header>

      {isImageSelected && (
        <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-1 shrink-0 text-sm">
          <button className="px-3 py-1.5 hover:bg-gray-100 rounded font-medium flex items-center gap-1.5"><Replace size={14} /> Substituir</button>
          <button className="px-3 py-1.5 hover:bg-gray-100 rounded font-medium flex items-center gap-1.5"><Scissors size={14} /> Remover Fundo</button>
          <div className="w-px h-6 bg-gray-300 mx-1" />
          <button className="p-2 hover:bg-gray-100 rounded"><Crop size={14} /></button>
          <div className="w-px h-6 bg-gray-300 mx-1" />
          <button className="p-2 hover:bg-gray-100 rounded"><FlipHorizontal size={14} /></button>
          <button className="p-2 hover:bg-gray-100 rounded"><FlipVertical size={14} /></button>
          <button onClick={() => setShowEffects(!showEffects)} className={`px-3 py-1.5 rounded font-medium ${showEffects ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}>Efeitos</button>
          <button className="px-3 py-1.5 hover:bg-gray-100 rounded font-medium">Posição</button>
          <Anchor size={14} className="ml-2 text-muted-foreground" />
        </div>
      )}

      {error && <div className="bg-red-50 border-b border-red-200 text-red-700 text-xs px-4 py-2">{error}</div>}
      {toast && <div className="fixed bottom-6 right-6 z-50 px-4 py-2 rounded-lg bg-green-500 text-white text-sm shadow-lg">{toast}</div>}

      <div className="flex-1 flex overflow-hidden">
        <nav className="w-20 bg-[#1a1a1a] flex flex-col items-center py-2 gap-1 shrink-0">
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
                className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center gap-0.5 ${active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>
                <Icon size={20} />
                <span className="text-[10px] font-medium">{t.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="w-80 bg-[#1a1a1a] text-white overflow-y-auto">
          {tool === 'texto' && (
            <div className="p-3 space-y-2">
              {TEXT_PRESETS.map((p) => (
                <button key={p.id} onClick={() => addText(p.id)} className="w-full p-4 rounded-lg bg-white/10 hover:bg-white/20 text-left">
                  <p style={{ fontSize: p.id === 'heading' ? '28px' : p.id === 'subheading' ? '18px' : '14px', fontWeight: p.weight }}>{p.label}</p>
                </button>
              ))}
              <div className="grid grid-cols-2 gap-2 mt-3">
                {TEXT_STYLES.map((s, i) => (
                  <button key={i} onClick={() => addText('heading', s)} className="aspect-[3/2] rounded-lg flex items-center justify-center text-center px-2 font-bold text-[11px] leading-tight"
                    style={{ background: s.bg || 'rgba(255,255,255,0.1)', color: s.color, fontStyle: s.italic ? 'italic' : 'normal' }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {tool === 'formas' && (
            <div className="p-3 grid grid-cols-3 gap-2">
              {SHAPES.map((s) => (
                <button key={s.id} onClick={() => addShape(s)} className="aspect-square rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center">
                  <ShapePreview shape={s} />
                </button>
              ))}
            </div>
          )}
          {tool === 'imagens' && (
            <div className="p-3 space-y-3">
              <label className="cursor-pointer block w-full border-2 border-dashed border-white/30 rounded-lg p-5 text-center hover:bg-white/5">
                <ImgIcon size={20} className="mx-auto mb-2 text-white/60" />
                <p className="text-xs font-semibold">Enviar do PC</p>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && uploadArticleImage(e.target.files[0])} />
              </label>
            </div>
          )}
          {tool === 'vetores' && (
            <div className="p-3 space-y-3">
              <input placeholder="Pesquisar vetores..." className="w-full bg-white/10 rounded px-3 py-2 text-xs" />
              <div className="grid grid-cols-3 gap-2">
                {['📷','📰','📺','🎥','📱','💻','📚','✈️','🚗','🏠','⭐','❤️'].map((emoji, i) => (
                  <button key={i} className="aspect-square rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-3xl">{emoji}</button>
                ))}
              </div>
            </div>
          )}
          {tool === 'uploads' && (
            <div className="p-3">
              <label className="cursor-pointer block w-full border-2 border-dashed border-white/30 rounded-lg p-6 text-center hover:bg-white/5">
                <Upload size={20} className="mx-auto mb-2 text-white/60" />
                <p className="text-xs font-semibold">Enviar imagem</p>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && uploadArticleImage(e.target.files[0])} />
              </label>
            </div>
          )}
          {tool === 'mais' && (
            <div className="p-3 space-y-2">
              <button className="w-full p-3 rounded-lg bg-white/10 hover:bg-white/20 flex items-center gap-3 text-left">
                <QrCode size={18} /> <span className="text-sm">QR Code</span>
              </button>
              <button className="w-full p-3 rounded-lg bg-white/10 hover:bg-white/20 flex items-center gap-3 text-left">
                <ScanBarcode size={18} /> <span className="text-sm">Código de Barras</span>
              </button>
              <button className="w-full p-3 rounded-lg bg-white/10 hover:bg-white/20 flex items-center gap-3 text-left">
                <Star size={18} /> <span className="text-sm">Avaliação</span>
              </button>
            </div>
          )}
        </div>

        {showEffects && isImageSelected && (
          <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto p-4 text-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm">Efeitos de Imagem</h3>
              <button onClick={() => setShowEffects(false)} className="text-muted-foreground">Redefinir</button>
            </div>
            <h4 className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Presets</h4>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {EFFECTS_PRESETS.map((p) => (
                <button key={p.id} onClick={() => applyImageFilters(p)} className="aspect-square rounded-lg bg-gray-100 hover:ring-2 hover:ring-primary flex items-end p-1 text-[10px] font-medium">
                  {p.label}
                </button>
              ))}
            </div>
            <h4 className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Ajustes</h4>
            {[
              { id: 'blur', label: 'Desfoque', min: 0, max: 20, step: 0.5 },
              { id: 'brightness', label: 'Brilho', min: 0.5, max: 2, step: 0.05 },
              { id: 'contrast', label: 'Contraste', min: 0.5, max: 2, step: 0.05 },
              { id: 'saturation', label: 'Saturação', min: 0, max: 2, step: 0.05 },
            ].map((adj) => (
              <div key={adj.id} className="mb-3">
                <label className="text-[10px] block mb-1">{adj.label}</label>
                <input type="range" min={adj.min} max={adj.max} step={adj.step} value={imageFilters[adj.id] || (adj.id === 'blur' ? 0 : 1)}
                  onChange={(e) => applyImageAdjustment(adj.id, parseFloat(e.target.value))}
                  className="w-full accent-primary" />
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-auto bg-[#fafafa] p-6 relative">
          <div className="text-[10px] text-muted-foreground font-mono mb-2 text-center">story</div>
          {(!konvaReady || !fontReady) && (
            <div className="flex items-center justify-center h-96 text-muted-foreground text-sm">
              <Loader2 className="animate-spin mr-3" size={18} /> Carregando…
            </div>
          )}
          <div id="konva-stage" className="mx-auto mt-4 rounded shadow-lg"
            style={{ width: 1080 * scale, height: 1920 * scale, background: '#000' }} />

          <div className="absolute top-12 right-6 w-56 bg-white border border-gray-200 rounded-lg shadow-md">
            <button onClick={() => setLayersOpen(!layersOpen)} className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50">
              <span className="text-xs font-semibold">Camadas <span className="text-muted-foreground text-[9px]">ⓘ</span></span>
              <ChevronDown size={14} className={`transition-transform ${layersOpen ? '' : '-rotate-90'}`} />
            </button>
            {layersOpen && (
              <div className="max-h-96 overflow-y-auto p-1.5 space-y-0.5 text-xs">
                <div className="text-[10px] text-muted-foreground font-mono px-2 py-1">post</div>
                {LAYER_DISPLAY_NAMES.map((key) => {
                  const n = nodesRef.current[key];
                  const isActive = selectedKey === key;
                  const visible = n ? n.visible() : true;
                  return (
                    <div key={`p-${key}`} className={`flex items-center gap-1 p-1.5 rounded ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                      <span className="text-muted-foreground cursor-grab">⋮⋮</span>
                      <span className="text-muted-foreground">{key.includes('image') || key === 'logo' ? '🖼' : key === 'overlay' ? '◉' : '𝐓'}</span>
                      <button onClick={() => n && selectElement(key)} className="flex-1 text-left truncate text-xs">{key}</button>
                      <button onClick={() => n && toggleVisibility(key)}>{visible ? <Eye size={10} /> : <EyeOff size={10} />}</button>
                      <span className="text-muted-foreground">⋯</span>
                    </div>
                  );
                })}
                <div className="text-[10px] text-muted-foreground font-mono px-2 py-1 mt-2">story</div>
                {LAYER_DISPLAY_NAMES.map((key) => (
                  <div key={`s-${key}`} className="flex items-center gap-1 p-1.5 rounded hover:bg-gray-50">
                    <span className="text-muted-foreground cursor-grab">⋮⋮</span>
                    <span className="text-muted-foreground">{key.includes('image') || key === 'logo' ? '🖼' : key === 'overlay' ? '◉' : '𝐓'}</span>
                    <button className="flex-1 text-left truncate text-xs">{key}</button>
                    <Eye size={10} className="text-muted-foreground" />
                    <span className="text-muted-foreground">⋯</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="h-11 bg-white border-t border-gray-200 flex items-center px-4 gap-3 shrink-0">
        <button onClick={() => setScale((s) => Math.max(0.1, s - 0.05))} className="p-1.5 hover:bg-gray-100 rounded"><ZoomOut size={13} /></button>
        <input type="range" min="0.1" max="1" step="0.05" value={scale} onChange={(e) => setScale(parseFloat(e.target.value))} className="w-28 accent-primary" />
        <button onClick={() => setScale((s) => Math.min(1, s + 0.05))} className="p-1.5 hover:bg-gray-100 rounded"><ZoomIn size={13} /></button>
        <button onClick={undo} className="p-1.5 hover:bg-gray-100 rounded text-muted-foreground"><Undo2 size={13} /></button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Páginas</span>
          <button onClick={() => setCurrentPage(1)} className={`w-7 h-7 rounded text-xs font-semibold ${currentPage === 1 ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>1</button>
          <button onClick={() => setCurrentPage(2)} className={`w-7 h-7 rounded text-xs font-semibold ${currentPage === 2 ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>2</button>
        </div>
      </footer>
    </div>
  );
}

function ShapePreview({ shape }) {
  const fill = shape.filled ? '#FFFFFF' : 'transparent';
  const stroke = shape.filled ? 'transparent' : '#FFFFFF';
  const sw = shape.filled ? 0 : 2;
  if (shape.kind === 'rect') return <svg width="36" height="36" viewBox="0 0 36 36"><rect x="3" y="3" width="30" height="30" fill={fill} stroke={stroke} strokeWidth={sw} /></svg>;
  if (shape.kind === 'circle') return <svg width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" fill={fill} stroke={stroke} strokeWidth={sw} /></svg>;
  if (shape.kind === 'triangle') return <svg width="36" height="36" viewBox="0 0 36 36"><polygon points="18,4 32,30 4,30" fill={fill} stroke={stroke} strokeWidth={sw} /></svg>;
  if (shape.kind === 'star') return <svg width="36" height="36" viewBox="0 0 36 36"><polygon points="18,3 22,13 33,13 24,20 27,31 18,24 9,31 12,20 3,13 14,13" fill={fill} stroke={stroke} strokeWidth={sw} /></svg>;
  if (shape.kind === 'heart') return <svg width="36" height="36" viewBox="0 0 36 36"><path d="M18,30 C18,18 6,12 6,6 C6,0 18,0 18,6 C18,0 30,0 30,6 C30,12 18,18 18,30 Z" fill={fill} stroke={stroke} strokeWidth={sw} /></svg>;
  if (shape.kind === 'hexagon') return <svg width="36" height="36" viewBox="0 0 36 36"><polygon points="18,3 31,11 31,25 18,33 5,25 5,11" fill={fill} stroke={stroke} strokeWidth={sw} /></svg>;
  return null;
}
