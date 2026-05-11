'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Save, X, Undo2, Redo2, Type, Image as ImgIcon, Square, Sparkles, Upload,
  MoreHorizontal, Layers as LayersIcon, ChevronLeft, ChevronRight, Plus,
  Copy, Trash2, ArrowUp, ArrowDown, Maximize2, ZoomIn, ZoomOut, Eye, Link2,
  Loader2, Lock, Unlock, EyeOff, AlertCircle, Check, Globe, Send, FileText,
} from 'lucide-react';

const CATEGORY_COLORS = {
  PRISAO: '#E63946', 'PRISÃO': '#E63946',
  OPINIAO: '#E63946', 'OPINIÃO': '#E63946',
  POLITICA: '#1D3557', 'POLÍTICA': '#1D3557',
  ESPORTE: '#2A9D8F',
  SEGURANCA: '#E9C46A', 'SEGURANÇA': '#E9C46A',
  ECONOMIA: '#F4A261',
  GERAL: '#6C757D',
  INTERNACIONAL: '#4361EE',
  SAUDE: '#06A77D', 'SAÚDE': '#06A77D',
  EDUCACAO: '#7209B7', 'EDUCAÇÃO': '#7209B7',
  CULTURA: '#F72585',
};

const DEFAULT_PAGES = [
  { id: 'stories', name: 'Stories/Reels', width: 1080, height: 1920 },
];

const SHAPES = [
  { name: 'Retângulo', kind: 'rect',     w: 200, h: 120 },
  { name: 'Quadrado',  kind: 'square',   w: 160, h: 160 },
  { name: 'Círculo',   kind: 'circle',   w: 160, h: 160 },
  { name: 'Estrela',   kind: 'star',     w: 160, h: 160 },
  { name: 'Triângulo', kind: 'triangle', w: 160, h: 160 },
  { name: 'Hexágono',  kind: 'hexagon',  w: 160, h: 160 },
  { name: 'Losango',   kind: 'diamond',  w: 160, h: 160 },
  { name: 'Cápsula',   kind: 'capsule',  w: 240, h: 80  },
];

const TEXT_PRESETS = [
  { label: 'Título principal', size: 64, weight: '800' },
  { label: 'Subtítulo',        size: 36, weight: '600' },
  { label: 'Corpo do texto',   size: 28, weight: '400' },
  { label: 'Legenda pequena',  size: 18, weight: '500' },
];

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

  const stageRefs = useRef({});
  const layerRefs = useRef({});
  const elementsRef = useRef({});
  const undoStackRef = useRef([]);
  const baseImageRef = useRef(null);
  const articleImageRef = useRef(null);

  const [konvaReady, setKonvaReady] = useState(false);
  const [fontReady, setFontReady] = useState(false);
  const [pages, setPages] = useState(DEFAULT_PAGES);
  const [activePageId, setActivePageId] = useState('stories');
  const [tool, setTool] = useState('texto');
  const [selectedKey, setSelectedKey] = useState(null);
  const [scale, setScale] = useState(0.35);
  const [showLayers, setShowLayers] = useState(true);

  const [materiaUrl, setMateriaUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [titulo, setTitulo] = useState('Título do post');
  const [resumo, setResumo] = useState('Resumo gerado automaticamente da matéria.');
  const [categoria, setCategoria] = useState('PRISÃO');
  const [imagemUrl, setImagemUrl] = useState('');

  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);
  const [, force] = useState(0);
  const refresh = () => force((n) => n + 1);

  function showToast(msg) {
    setToast({ msg });
    setTimeout(() => setToast(null), 2500);
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.Konva) { setKonvaReady(true); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/konva@9.3.18/konva.min.js';
    s.async = true;
    s.onload = () => setKonvaReady(true);
    s.onerror = () => setError('Falha ao carregar editor');
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.pdfjsLib) return;
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
    s.async = true;
    s.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
      }
    };
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('fonts' in document)) { setFontReady(true); return; }
    const safety = setTimeout(() => setFontReady(true), 4000);
    Promise.all([
      document.fonts.load('800 64px "Aileron"'),
      document.fonts.load('600 36px "Aileron"'),
      document.fonts.load('700 26px "Aileron"'),
      document.fonts.load('900 60px "Inter"'),
    ]).finally(() => { clearTimeout(safety); setFontReady(true); });
  }, []);

  useEffect(() => {
    if (!konvaReady || !fontReady) return;
    const Konva = window.Konva;
    pages.forEach((p) => {
      if (stageRefs.current[p.id]) return;
      const container = document.getElementById(`stage-${p.id}`);
      if (!container) return;
      const stage = new Konva.Stage({
        container, width: p.width * scale, height: p.height * scale,
        scaleX: scale, scaleY: scale,
      });
      const layer = new Konva.Layer();
      stage.add(layer);
      stageRefs.current[p.id] = stage;
      layerRefs.current[p.id] = layer;
      createAllElements(p);
      stage.on('click tap', (e) => { if (e.target === stage) deselectAll(); });
      layer.draw();
    });
    refresh();
  }, [konvaReady, fontReady, pages]);

  useEffect(() => {
    pages.forEach((p) => {
      const s = stageRefs.current[p.id];
      if (!s) return;
      s.scale({ x: scale, y: scale });
      s.width(p.width * scale);
      s.height(p.height * scale);
      layerRefs.current[p.id]?.batchDraw();
    });
  }, [scale]);

  useEffect(() => {
    function onKey(e) {
      const t = e.target.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); return; }
      if (!selectedKey) return;
      const node = elementsRef.current[activePageId]?.[selectedKey];
      if (!node) return;
      const step = e.shiftKey ? 10 : 1;
      let h = true;
      switch (e.key) {
        case 'ArrowLeft':  saveUndo(); node.x(node.x() - step); break;
        case 'ArrowRight': saveUndo(); node.x(node.x() + step); break;
        case 'ArrowUp':    saveUndo(); node.y(node.y() - step); break;
        case 'ArrowDown':  saveUndo(); node.y(node.y() + step); break;
        case 'Delete': case 'Backspace': deleteElement(selectedKey); break;
        case 'd': if (e.ctrlKey || e.metaKey) duplicateElement(selectedKey); else h = false; break;
        default: h = false;
      }
      if (h) { e.preventDefault(); layerRefs.current[activePageId]?.draw(); refreshSel(); refresh(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedKey, activePageId]);

  function createAllElements(p) {
    const Konva = window.Konva;
    const layer = layerRefs.current[p.id];
    if (!Konva || !layer) return;
    elementsRef.current[p.id] = elementsRef.current[p.id] || {};
    const W = p.width, H = p.height;

    const bg = new Konva.Rect({ x: 0, y: 0, width: W, height: H, fill: '#0a0a0a', name: 'background', listening: false });
    layer.add(bg);
    elementsRef.current[p.id]._background = bg;

    if (articleImageRef.current) {
      const imgNode = new Konva.Image({ x: 0, y: 0, width: W, height: H * 0.65, image: articleImageRef.current, name: 'article-image', listening: false });
      layer.add(imgNode);
      elementsRef.current[p.id]._articleImage = imgNode;
    }

    const gradient = new Konva.Rect({
      x: 0, y: 0, width: W, height: H, name: 'gradient-overlay', listening: false,
      fillLinearGradientStartPoint: { x: 0, y: H * 0.35 },
      fillLinearGradientEndPoint: { x: 0, y: H * 0.6 },
      fillLinearGradientColorStops: [0, 'rgba(10,10,10,0)', 0.4, 'rgba(10,10,10,0.7)', 1, 'rgba(10,10,10,1)'],
    });
    layer.add(gradient);
    elementsRef.current[p.id]._gradient = gradient;

    if (baseImageRef.current) {
      const baseImg = new Konva.Image({ x: 0, y: 0, width: W, height: H, image: baseImageRef.current, name: 'base-template', listening: false });
      layer.add(baseImg);
      elementsRef.current[p.id]._baseImage = baseImg;
    }

    const logoGroup = new Konva.Group({ x: W - 380, y: 60, name: 'logo-group', id: 'logo', draggable: true });
    const logoText = new Konva.Text({ x: 0, y: 0, text: 'ururau', fontSize: 64, fontFamily: 'Aileron, Inter, Arial', fontStyle: 'bold', fill: '#FFFFFF', name: 'logo-text' });
    const goldLine1 = new Konva.Rect({ x: 0, y: 78, width: 60, height: 3, fill: '#FFD700', name: 'logo-line1' });
    const anosText = new Konva.Text({ x: 70, y: 70, text: '19 ANOS', fontSize: 20, fontFamily: 'Aileron, Inter, Arial', fontStyle: 'bold', fill: '#FFD700', letterSpacing: 2, name: 'logo-anos' });
    const goldLine2 = new Konva.Rect({ x: 165, y: 78, width: 60, height: 3, fill: '#FFD700', name: 'logo-line2' });
    const circle = new Konva.Circle({ x: 300, y: 40, radius: 48, fill: '#E63946', name: 'logo-circle' });
    const atSymbol = new Konva.Text({ x: 270, y: 5, text: '@', fontSize: 80, fontFamily: 'Inter, Arial', fontStyle: 'bold', fill: '#FFFFFF', width: 60, align: 'center', name: 'logo-at' });
    logoGroup.add(logoText, goldLine1, anosText, goldLine2, circle, atSymbol);
    bind(logoGroup, 'logo', p.id);
    logoGroup.draggable(false);
    layer.add(logoGroup);
    elementsRef.current[p.id].logo = logoGroup;

    const cat = (categoria || 'GERAL').toUpperCase();
    const badgeColor = CATEGORY_COLORS[cat] || CATEGORY_COLORS.GERAL;
    const badgeW = Math.max(cat.length * 22 + 60, 180);
    const badgeY = H - 700;
    const badgeGroup = new Konva.Group({ x: 55, y: badgeY, draggable: true, name: 'category', id: 'category' });
    badgeGroup.add(new Konva.Rect({ width: badgeW, height: 70, fill: badgeColor, cornerRadius: 8, name: 'badge-bg' }));
    badgeGroup.add(new Konva.Text({ x: 30, y: 22, text: cat, fontSize: 26, fontFamily: 'Aileron, Inter, Arial', fontStyle: 'bold', fill: '#FFFFFF', letterSpacing: 1, name: 'badge-text' }));
    bind(badgeGroup, 'category', p.id);
    layer.add(badgeGroup);
    elementsRef.current[p.id].category = badgeGroup;

    const title = new Konva.Text({ x: 55, y: badgeY + 100, text: titulo, fontSize: 64, fontFamily: 'Aileron, Inter, Arial', fontStyle: 'bold', fill: '#FFFFFF', width: W - 110, lineHeight: 1.15, draggable: true, name: 'title', id: 'title' });
    bind(title, 'title', p.id);
    layer.add(title);
    elementsRef.current[p.id].title = title;

    const sep = new Konva.Rect({ x: 55, y: badgeY + 380, width: 260, height: 6, fill: '#C11F25', cornerRadius: 3, draggable: true, name: 'separator', id: 'separator' });
    bind(sep, 'separator', p.id);
    layer.add(sep);
    elementsRef.current[p.id].separator = sep;

    const sum = new Konva.Text({ x: 55, y: badgeY + 420, text: resumo, fontSize: 32, fontFamily: 'Aileron, Inter, Arial', fill: '#E0E0E0', width: W - 110, lineHeight: 1.35, draggable: true, name: 'summary', id: 'summary' });
    bind(sum, 'summary', p.id);
    layer.add(sum);
    elementsRef.current[p.id].summary = sum;

    const wm = new Konva.Text({ x: 55, y: H - 50, text: 'URURAU.COM.BR', fontSize: 18, fontFamily: 'Aileron, Inter, Arial', fill: '#FFFFFF', opacity: 0.5, letterSpacing: 2, draggable: true, name: 'watermark', id: 'watermark' });
    bind(wm, 'watermark', p.id);
    layer.add(wm);
    elementsRef.current[p.id].watermark = wm;
  }

  function bind(node, key, pageId) {
    node.on('dragstart', () => saveUndo());
    node.on('dragend', () => { selectElement(key, pageId); refresh(); });
    node.on('click tap', (e) => { e.cancelBubble = true; selectElement(key, pageId); });
    node.on('dblclick dbltap', (e) => {
      e.cancelBubble = true;
      if (node.getClassName() === 'Text') editText(node, key, pageId);
    });
    node.on('mouseenter', () => { document.body.style.cursor = 'move'; });
    node.on('mouseleave', () => { document.body.style.cursor = 'default'; });
  }

  function selectElement(key, pageId) {
    if (pageId) setActivePageId(pageId);
    deselectAll();
    setSelectedKey(key);
    refreshSel(key, pageId || activePageId);
    refresh();
  }

  function deselectAll() {
    setSelectedKey(null);
    Object.values(layerRefs.current).forEach((l) => {
      if (!l) return;
      l.find('.selection-indicator').forEach((i) => i.destroy());
      l.draw();
    });
  }

  function refreshSel(keyOverride, pageOverride) {
    const Konva = window.Konva;
    if (!Konva) return;
    const k = keyOverride || selectedKey;
    const pid = pageOverride || activePageId;
    const layer = layerRefs.current[pid];
    if (!k || !layer) return;
    const node = elementsRef.current[pid]?.[k];
    if (!node) return;
    layer.find('.selection-indicator').forEach((i) => i.destroy());
    const b = node.getClientRect({ relativeTo: layer });
    const r = new Konva.Rect({ x: b.x - 4, y: b.y - 4, width: b.width + 8, height: b.height + 8, stroke: '#2563EB', strokeWidth: 3, dash: [10, 6], name: 'selection-indicator', listening: false });
    layer.add(r); r.moveToTop();
    layer.draw();
  }

  function editText(node, key, pageId) {
    const stage = stageRefs.current[pageId];
    const sb = stage.container().getBoundingClientRect();
    const p = node.absolutePosition();
    const a = document.createElement('textarea');
    a.value = node.text();
    Object.assign(a.style, {
      position: 'fixed', left: sb.left + p.x + 'px', top: sb.top + p.y + 'px',
      width: (node.width() || 400) * scale + 'px',
      minHeight: node.fontSize() * scale + 8 + 'px',
      fontSize: node.fontSize() * scale + 'px', fontFamily: node.fontFamily(),
      fontWeight: node.fontStyle() || 'normal',
      color: node.fill(), background: 'rgba(255,255,255,0.97)',
      border: '2px solid #2563EB', borderRadius: '6px',
      padding: '4px 8px', resize: 'none', outline: 'none',
      zIndex: '9999', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    });
    document.body.appendChild(a);
    a.focus(); a.select();
    const finish = () => {
      saveUndo();
      const v = a.value;
      node.text(v);
      if (key === 'category') {
        const t = v.toUpperCase();
        node.findOne('.badge-text').text(t);
        const newW = Math.max(t.length * 22 + 60, 180);
        node.findOne('.badge-bg').width(newW);
        if (CATEGORY_COLORS[t]) {
          node.findOne('.badge-bg').fill(CATEGORY_COLORS[t]);
          setCategoria(t);
        }
      }
      if (key === 'title') setTitulo(v);
      if (key === 'summary') setResumo(v);
      pages.forEach((pp) => {
        const other = elementsRef.current[pp.id]?.[key];
        if (other && other !== node && other.getClassName() === 'Text') {
          other.text(v);
          layerRefs.current[pp.id]?.draw();
        }
      });
      layerRefs.current[pageId]?.draw();
      refreshSel(key, pageId);
      try { document.body.removeChild(a); } catch {}
      refresh();
    };
    a.addEventListener('blur', finish);
    a.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); a.blur(); }
      if (e.key === 'Escape') { a.value = node.text(); a.blur(); }
    });
  }

  function updateProp(prop, value) {
    if (!selectedKey) return;
    const node = elementsRef.current[activePageId]?.[selectedKey];
    if (!node) return;
    saveUndo();
    if (['x', 'y', 'width', 'height', 'fontSize', 'rotation'].includes(prop)) {
      node.setAttr(prop, parseFloat(value));
    } else if (prop === 'opacity') {
      node.opacity(parseFloat(value));
    } else if (prop === 'text') {
      node.text(value);
    } else if (prop === 'badgeColor' && selectedKey === 'category') {
      node.findOne('.badge-bg').fill(value);
    } else if (prop === 'badgeRadius' && selectedKey === 'category') {
      node.findOne('.badge-bg').cornerRadius(parseFloat(value));
    } else {
      node.setAttr(prop, value);
    }
    layerRefs.current[activePageId]?.draw();
    refreshSel();
    refresh();
  }

  function saveUndo() {
    const snap = {};
    pages.forEach((p) => {
      snap[p.id] = {};
      Object.entries(elementsRef.current[p.id] || {}).forEach(([k, n]) => {
        if (k.startsWith('_')) return;
        snap[p.id][k] = { x: n.x(), y: n.y() };
        if (n.getClassName() === 'Text') snap[p.id][k].text = n.text();
        if (n.getClassName() === 'Rect') {
          snap[p.id][k].width = n.width();
          snap[p.id][k].height = n.height();
        }
      });
    });
    undoStackRef.current.push(snap);
    if (undoStackRef.current.length > 50) undoStackRef.current.shift();
  }

  function undo() {
    const prev = undoStackRef.current.pop();
    if (!prev) return;
    Object.entries(prev).forEach(([pid, els]) => {
      Object.entries(els).forEach(([k, s]) => {
        const n = elementsRef.current[pid]?.[k];
        if (!n) return;
        n.x(s.x); n.y(s.y);
        if (s.text !== undefined && n.getClassName() === 'Text') n.text(s.text);
        if (s.width !== undefined) n.width(s.width);
        if (s.height !== undefined) n.height(s.height);
      });
      layerRefs.current[pid]?.draw();
    });
    refreshSel(); refresh();
  }

  function duplicateElement(key) {
    const Konva = window.Konva;
    const node = elementsRef.current[activePageId]?.[key];
    if (!node || !Konva) return;
    const clone = node.clone({ x: node.x() + 30, y: node.y() + 30 });
    const newKey = key + '_' + Date.now();
    bind(clone, newKey, activePageId);
    layerRefs.current[activePageId].add(clone);
    elementsRef.current[activePageId][newKey] = clone;
    selectElement(newKey, activePageId);
    layerRefs.current[activePageId].draw();
    showToast('Elemento duplicado');
  }

  function deleteElement(key) {
    const node = elementsRef.current[activePageId]?.[key];
    if (!node) return;
    if (['logo','category','title','separator','summary','watermark'].includes(key)) {
      node.visible(!node.visible());
      layerRefs.current[activePageId].draw();
      refresh();
      showToast(node.visible() ? 'Visível' : 'Oculto');
      return;
    }
    node.destroy();
    delete elementsRef.current[activePageId][key];
    deselectAll();
    layerRefs.current[activePageId].draw();
  }

  function lockElement(key) {
    const node = elementsRef.current[activePageId]?.[key];
    if (!node) return;
    node.draggable(!node.draggable());
    refresh();
    showToast(node.draggable() ? 'Desbloqueado' : 'Bloqueado');
  }

  function moveLayer(key, dir) {
    const n = elementsRef.current[activePageId]?.[key];
    if (!n) return;
    if (dir === 'up') n.moveUp(); else n.moveDown();
    layerRefs.current[activePageId].draw();
  }

  function addText(preset) {
    const Konva = window.Konva;
    const id = 'txt_' + Date.now();
    const n = new Konva.Text({
      x: 100, y: 200, text: preset?.label || 'Novo texto',
      fontSize: preset?.size || 40, fontFamily: 'Aileron, Inter, Arial',
      fontStyle: preset?.weight || '600', fill: '#FFFFFF',
      width: 800, draggable: true, name: id, id,
    });
    bind(n, id, activePageId);
    layerRefs.current[activePageId].add(n);
    elementsRef.current[activePageId][id] = n;
    selectElement(id, activePageId);
    layerRefs.current[activePageId].draw();
  }

  function addShape(shape) {
    const Konva = window.Konva;
    const id = 'shp_' + Date.now();
    let n;
    const opts = { x: 200, y: 400, fill: '#cccccc', draggable: true, name: id, id };
    if (shape.kind === 'rect' || shape.kind === 'square') {
      n = new Konva.Rect({ ...opts, width: shape.w, height: shape.h, cornerRadius: 4 });
    } else if (shape.kind === 'capsule') {
      n = new Konva.Rect({ ...opts, width: shape.w, height: shape.h, cornerRadius: shape.h / 2 });
    } else if (shape.kind === 'circle') {
      n = new Konva.Circle({ ...opts, radius: shape.w / 2 });
    } else if (shape.kind === 'star') {
      n = new Konva.Star({ ...opts, numPoints: 5, innerRadius: shape.w / 4, outerRadius: shape.w / 2 });
    } else if (shape.kind === 'triangle') {
      n = new Konva.RegularPolygon({ ...opts, sides: 3, radius: shape.w / 2 });
    } else if (shape.kind === 'hexagon') {
      n = new Konva.RegularPolygon({ ...opts, sides: 6, radius: shape.w / 2 });
    } else if (shape.kind === 'diamond') {
      n = new Konva.Rect({ ...opts, width: shape.w, height: shape.h, rotation: 45 });
    }
    bind(n, id, activePageId);
    layerRefs.current[activePageId].add(n);
    elementsRef.current[activePageId][id] = n;
    selectElement(id, activePageId);
    layerRefs.current[activePageId].draw();
  }

  function uploadImage(file) {
    const r = new FileReader();
    r.onload = (e) => {
      const Konva = window.Konva;
      const img = new window.Image();
      img.onload = () => {
        const id = 'upl_' + Date.now();
        const ratio = img.width / img.height;
        const w = 400, h = w / ratio;
        const n = new Konva.Image({ x: 200, y: 400, image: img, width: w, height: h, draggable: true, name: id, id });
        bind(n, id, activePageId);
        layerRefs.current[activePageId].add(n);
        elementsRef.current[activePageId][id] = n;
        selectElement(id, activePageId);
        layerRefs.current[activePageId].draw();
      };
      img.src = e.target.result;
    };
    r.readAsDataURL(file);
  }

  function setArticleImage(src) {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      articleImageRef.current = img;
      const Konva = window.Konva;
      pages.forEach((p) => {
        const layer = layerRefs.current[p.id];
        if (!layer) return;
        const old = layer.findOne('.article-image');
        if (old) old.destroy();
        const bg = elementsRef.current[p.id]._background;
        const imgNode = new Konva.Image({ x: 0, y: 0, width: p.width, height: p.height * 0.65, image: img, name: 'article-image', listening: false });
        layer.add(imgNode);
        imgNode.zIndex(bg ? bg.zIndex() + 1 : 1);
        elementsRef.current[p.id]._articleImage = imgNode;
        layer.draw();
      });
    };
    img.onerror = () => setError('Falha ao carregar imagem da matéria');
    img.src = src;
  }

  function uploadArticleImage(file) {
    const r = new FileReader();
    r.onload = (e) => setArticleImage(e.target.result);
    r.readAsDataURL(file);
  }

  async function uploadBaseTemplate(file) {
    if (file.type === 'application/pdf') {
      if (!window.pdfjsLib) {
        setError('pdf.js ainda carregando, tente em 2 segundos');
        setTimeout(() => setError(null), 3000);
        return;
      }
      try {
        const buf = await file.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
        const dataURL = canvas.toDataURL('image/png');
        applyBaseImage(dataURL);
        showToast('PDF importado como template base');
      } catch (err) {
        setError('Erro ao processar PDF: ' + err.message);
        setTimeout(() => setError(null), 4000);
      }
    } else {
      const r = new FileReader();
      r.onload = (e) => {
        applyBaseImage(e.target.result);
        showToast('Imagem importada como template base');
      };
      r.readAsDataURL(file);
    }
  }

  function applyBaseImage(src) {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      baseImageRef.current = img;
      const Konva = window.Konva;
      pages.forEach((p) => {
        const layer = layerRefs.current[p.id];
        if (!layer) return;
        const old = layer.findOne('.base-template');
        if (old) old.destroy();
        const baseImg = new Konva.Image({ x: 0, y: 0, width: p.width, height: p.height, image: img, name: 'base-template', listening: false });
        layer.add(baseImg);
        const grad = layer.findOne('.gradient-overlay');
        if (grad) baseImg.zIndex(grad.zIndex() + 1);
        elementsRef.current[p.id]._baseImage = baseImg;
        layer.draw();
      });
    };
    img.src = src;
  }

  function removeBaseTemplate() {
    if (!confirm('Remover template importado e voltar ao padrão Ururau?')) return;
    baseImageRef.current = null;
    pages.forEach((p) => {
      const layer = layerRefs.current[p.id];
      if (!layer) return;
      const old = layer.findOne('.base-template');
      if (old) old.destroy();
      layer.draw();
    });
    showToast('Template base removido');
  }

  async function extrairMateria() {
    if (!materiaUrl) { setError('Cole a URL da matéria'); return; }
    setExtracting(true);
    try {
      const res = await fetch('/api/extract', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: materiaUrl }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Erro');
      setTitulo(d.title || '');
      setResumo(d.summary || '');
      setCategoria((d.category || 'GERAL').toUpperCase());
      setImagemUrl(d.image || '');
      pages.forEach((p) => {
        const els = elementsRef.current[p.id];
        if (!els) return;
        if (els.title) els.title.text(d.title || '');
        if (els.summary) els.summary.text(d.summary || '');
        if (els.category) {
          const t = (d.category || 'GERAL').toUpperCase();
          els.category.findOne('.badge-text').text(t);
          els.category.findOne('.badge-bg').width(Math.max(t.length * 22 + 60, 180));
          if (CATEGORY_COLORS[t]) els.category.findOne('.badge-bg').fill(CATEGORY_COLORS[t]);
        }
        layerRefs.current[p.id]?.draw();
      });
      if (d.image) setArticleImage(d.image);
      showToast(`Matéria extraída de ${d.siteName || 'fonte'}`);
    } catch (err) {
      setError('Erro: ' + err.message);
      setTimeout(() => setError(null), 3000);
    } finally { setExtracting(false); }
  }

  function handleSave() { showToast('Template salvo'); }

  function exportPNG(pageId) {
    const stage = stageRefs.current[pageId];
    if (!stage) return;
    const layer = layerRefs.current[pageId];
    layer.find('.selection-indicator').forEach((i) => i.visible(false));
    layer.draw();
    const p = pages.find((pp) => pp.id === pageId);
    const url = stage.toDataURL({ pixelRatio: 1, mimeType: 'image/png', width: p.width, height: p.height });
    layer.find('.selection-indicator').forEach((i) => i.visible(true));
    layer.draw();
    const a = document.createElement('a');
    a.href = url; a.download = `${p.name}-${Date.now()}.png`;
    document.body.appendChild(a); a.click(); a.remove();
  }

  const node = selectedKey ? elementsRef.current[activePageId]?.[selectedKey] : null;
  const nodeType = node?.getClassName?.();
  const isText = nodeType === 'Text';
  const isRect = nodeType === 'Rect';
  const isGroup = nodeType === 'Group';
  const allLayers = elementsRef.current[activePageId]
    ? Object.entries(elementsRef.current[activePageId]).filter(([k]) => !k.startsWith('_'))
    : [];

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0">
        <button onClick={() => router.push('/templates')} className="p-1.5 hover:bg-muted rounded">
          <X size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-primary" />
          <span className="font-bold text-sm">Editor</span>
          <span className="text-xs text-muted-foreground font-mono">#{templateId || 'novo'}</span>
        </div>

        <div className="flex-1 flex items-center gap-2 max-w-2xl mx-4">
          <Globe size={14} className="text-muted-foreground" />
          <input value={materiaUrl} onChange={(e) => setMateriaUrl(e.target.value)}
            placeholder="Cole o link da matéria do ururau.com.br ou outro site de notícias..."
            className="flex-1 bg-muted border border-transparent focus:bg-background focus:border-primary rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20" />
          <button onClick={extrairMateria} disabled={extracting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50">
            {extracting ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
            Extrair
          </button>
        </div>

        <button onClick={undo} className="p-1.5 hover:bg-muted rounded text-muted-foreground" title="Desfazer (Ctrl+Z)"><Undo2 size={16} /></button>
        <div className="w-px h-6 bg-border" />
        <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90">
          <Save size={12} /> Salvar
        </button>
        <button onClick={() => exportPNG(activePageId)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-success text-success-foreground text-xs font-semibold hover:opacity-90">
          <Send size={12} /> Exportar
        </button>
      </header>

      {error && <div className="bg-destructive/10 border-b border-destructive/20 text-destructive text-xs px-4 py-2 flex items-center gap-2"><AlertCircle size={14} /> {error}</div>}
      {toast && <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg bg-success text-success-foreground shadow-card text-sm font-medium animate-fade-up">✓ {toast.msg}</div>}

      <div className="flex-1 flex overflow-hidden">
        <nav className="w-16 bg-card border-r border-border flex flex-col items-center py-3 gap-1 shrink-0">
          {[
            { id: 'texto',    label: 'Texto',    icon: Type },
            { id: 'imagens',  label: 'Imagens',  icon: ImgIcon },
            { id: 'formas',   label: 'Formas',   icon: Square },
            { id: 'base',     label: 'Template', icon: FileText },
            { id: 'uploads',  label: 'Uploads',  icon: Upload },
          ].map((t) => {
            const Icon = t.icon;
            const active = tool === t.id;
            return (
              <button key={t.id} onClick={() => setTool(active ? null : t.id)}
                className={`w-12 h-14 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all ${
                  active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}>
                <Icon size={18} />
                <span className="text-[9px] font-semibold">{t.label}</span>
              </button>
            );
          })}
        </nav>

        {tool && (
          <div className="w-72 bg-card border-r border-border overflow-y-auto">
            {tool === 'texto' && (
              <div className="p-3">
                <h3 className="text-xs font-bold uppercase mb-3 text-muted-foreground">Adicionar texto</h3>
                {TEXT_PRESETS.map((p) => (
                  <button key={p.label} onClick={() => addText(p)}
                    className="w-full text-left p-3 rounded-lg hover:bg-muted mb-1 transition-colors">
                    <span style={{ fontSize: Math.min(p.size / 2.5, 22), fontWeight: p.weight }}>{p.label}</span>
                  </button>
                ))}
                <button onClick={() => addText()} className="w-full mt-3 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90">
                  + Texto em branco
                </button>
              </div>
            )}

            {tool === 'imagens' && (
              <div className="p-3 space-y-3">
                <div>
                  <h3 className="text-xs font-bold uppercase mb-2 text-muted-foreground">Imagem da matéria (fundo)</h3>
                  <label className="cursor-pointer block w-full border-2 border-dashed border-border rounded-lg p-4 text-center hover:bg-muted/30">
                    <ImgIcon size={18} className="mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs font-medium">Enviar imagem de fundo</p>
                    <p className="text-[10px] text-muted-foreground">Substitui a imagem extraída da matéria</p>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && uploadArticleImage(e.target.files[0])} />
                  </label>
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase mb-2 text-muted-foreground">Imagem adicional</h3>
                  <label className="cursor-pointer block w-full p-3 rounded-lg bg-muted hover:bg-muted/80 text-xs font-medium text-center">
                    <Upload size={14} className="inline mr-1" /> Enviar do PC
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && uploadImage(e.target.files[0])} />
                  </label>
                </div>
              </div>
            )}

            {tool === 'formas' && (
              <div className="p-3">
                <h3 className="text-xs font-bold uppercase mb-3 text-muted-foreground">Formas</h3>
                <div className="grid grid-cols-2 gap-2">
                  {SHAPES.map((s) => (
                    <button key={s.kind} onClick={() => addShape(s)}
                      className="aspect-square bg-muted hover:bg-primary/10 rounded-lg flex flex-col items-center justify-center text-xs font-medium transition-colors">
                      <ShapeIcon kind={s.kind} />
                      <span className="mt-1 text-[10px]">{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tool === 'base' && (
              <div className="p-3 space-y-3">
                <h3 className="text-xs font-bold uppercase text-muted-foreground">Template base</h3>
                <p className="text-[11px] text-muted-foreground">
                  Importe seu template pronto do <strong>Canva</strong> (PDF ou PNG). Será aplicado como camada visual, e você ainda pode editar textos por cima.
                </p>
                <label className="cursor-pointer block w-full border-2 border-dashed border-primary/40 rounded-lg p-5 text-center hover:bg-primary/5 hover:border-primary">
                  <FileText size={22} className="mx-auto mb-1 text-primary" />
                  <p className="text-xs font-semibold text-primary">Importar PDF do Canva</p>
                  <p className="text-[10px] text-muted-foreground mt-1">ou PNG/JPG</p>
                  <input type="file" accept=".pdf,image/png,image/jpeg,image/jpg" className="hidden"
                    onChange={(e) => e.target.files[0] && uploadBaseTemplate(e.target.files[0])} />
                </label>
                {baseImageRef.current && (
                  <button onClick={removeBaseTemplate}
                    className="w-full py-2 rounded-md bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20">
                    Remover template importado
                  </button>
                )}
                <div className="text-[10px] text-muted-foreground bg-muted/40 p-2 rounded">
                  <strong>Dica:</strong> No Canva, exporte como PDF. O PDF é convertido aqui no navegador via pdf.js — não vai pra nenhum servidor.
                </div>
              </div>
            )}

            {tool === 'uploads' && (
              <div className="p-3">
                <h3 className="text-xs font-bold uppercase mb-3 text-muted-foreground">Uploads</h3>
                <label className="cursor-pointer block w-full border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/30">
                  <Upload size={20} className="mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs font-medium">Enviar imagem</p>
                  <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG</p>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && uploadImage(e.target.files[0])} />
                </label>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-auto bg-muted/30 p-6">
          <div className="flex gap-6 items-start">
            {pages.map((p) => (
              <div key={p.id} className="flex-shrink-0">
                <div className="flex items-center justify-between mb-2 text-[11px] text-muted-foreground">
                  <button onClick={() => setActivePageId(p.id)} className={`font-semibold ${activePageId === p.id ? 'text-primary' : ''}`}>
                    {p.name} <span className="font-mono opacity-60">{p.width}×{p.height}</span>
                  </button>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => exportPNG(p.id)} className="p-1 hover:bg-muted rounded" title="Exportar PNG"><Eye size={11} /></button>
                  </div>
                </div>
                <div id={`stage-${p.id}`} className="rounded-md shadow-2xl"
                  style={{ width: p.width * scale, height: p.height * scale, background: '#0a0a0a' }} />
              </div>
            ))}
          </div>
        </div>

        {showLayers && (
          <div className="w-80 bg-card border-l border-border overflow-y-auto">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2"><LayersIcon size={12} /> Camadas</h3>
              <button onClick={() => setShowLayers(false)} className="p-1 hover:bg-muted rounded text-muted-foreground"><X size={12} /></button>
            </div>
            <div className="p-2 space-y-1">
              {allLayers.map(([key, n]) => {
                const isActive = selectedKey === key;
                const visible = n.visible();
                const locked = !n.draggable();
                const labels = {
                  logo: 'Logo Ururau (bloq.)',
                  category: 'Badge categoria',
                  title: 'Título',
                  separator: 'Linha decorativa',
                  summary: 'Subtítulo / Resumo',
                  watermark: 'Marca d\'água',
                };
                const label = labels[key] || key;
                return (
                  <div key={key} className={`p-2 rounded text-[11px] flex items-center gap-1 ${isActive ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted'}`}>
                    <button onClick={() => selectElement(key, activePageId)} className="flex-1 text-left truncate font-medium">
                      {label}
                    </button>
                    <button onClick={() => deleteElement(key)} className="p-0.5 hover:bg-card rounded">{visible ? <Eye size={10} /> : <EyeOff size={10} />}</button>
                    <button onClick={() => lockElement(key)} className="p-0.5 hover:bg-card rounded">{locked ? <Lock size={10} /> : <Unlock size={10} />}</button>
                    <button onClick={() => moveLayer(key, 'up')} className="p-0.5 hover:bg-card rounded"><ArrowUp size={10} /></button>
                    <button onClick={() => moveLayer(key, 'down')} className="p-0.5 hover:bg-card rounded"><ArrowDown size={10} /></button>
                  </div>
                );
              })}
            </div>

            <div className="p-3 border-t border-border">
              <h3 className="text-xs font-bold uppercase text-muted-foreground mb-2">Propriedades</h3>
              {!node ? <p className="text-[11px] text-muted-foreground">Selecione um elemento para editar</p> : (
                <div className="space-y-2.5">
                  <div className="px-2 py-1.5 rounded bg-primary/10 text-primary text-[11px] font-bold text-center">{selectedKey}</div>
                  <div>
                    <label className="text-[9px] uppercase font-bold text-muted-foreground">Posição</label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div>
                        <span className="text-[9px] text-muted-foreground">X</span>
                        <input type="number" value={Math.round(node.x())} onChange={(e) => updateProp('x', e.target.value)}
                          className="w-full bg-muted rounded px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <div>
                        <span className="text-[9px] text-muted-foreground">Y</span>
                        <input type="number" value={Math.round(node.y())} onChange={(e) => updateProp('y', e.target.value)}
                          className="w-full bg-muted rounded px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                    </div>
                  </div>

                  {(isText || isRect) && (
                    <div>
                      <label className="text-[9px] uppercase font-bold text-muted-foreground">Tamanho</label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <div>
                          <span className="text-[9px] text-muted-foreground">Largura</span>
                          <input type="number" value={Math.round(node.width() || 0)} onChange={(e) => updateProp('width', e.target.value)}
                            className="w-full bg-muted rounded px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>
                        {isRect && (
                          <div>
                            <span className="text-[9px] text-muted-foreground">Altura</span>
                            <input type="number" value={Math.round(node.height() || 0)} onChange={(e) => updateProp('height', e.target.value)}
                              className="w-full bg-muted rounded px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/30" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {isText && (
                    <>
                      <div>
                        <label className="text-[9px] uppercase font-bold text-muted-foreground">Texto</label>
                        <textarea value={node.text()} onChange={(e) => updateProp('text', e.target.value)} rows={3}
                          className="w-full bg-muted rounded px-2 py-1 text-[11px] mt-1 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[9px] text-muted-foreground">Tamanho fonte</span>
                          <input type="number" value={node.fontSize()} onChange={(e) => updateProp('fontSize', e.target.value)}
                            className="w-full bg-muted rounded px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>
                        <div>
                          <span className="text-[9px] text-muted-foreground">Cor</span>
                          <input type="color" value={node.fill()} onChange={(e) => updateProp('fill', e.target.value)}
                            className="w-full h-8 rounded p-1 cursor-pointer" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] uppercase font-bold text-muted-foreground">Opacidade · {Math.round(node.opacity() * 100)}%</label>
                        <input type="range" min="0" max="1" step="0.05" value={node.opacity()} onChange={(e) => updateProp('opacity', e.target.value)}
                          className="w-full accent-primary" />
                      </div>
                    </>
                  )}

                  {isRect && (
                    <div>
                      <span className="text-[9px] text-muted-foreground">Cor da forma</span>
                      <input type="color" value={node.fill() || '#cccccc'} onChange={(e) => updateProp('fill', e.target.value)}
                        className="w-full h-8 rounded p-1 cursor-pointer" />
                    </div>
                  )}

                  {selectedKey === 'category' && isGroup && (
                    <>
                      <div className="pt-2 border-t border-border">
                        <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Cor do badge</label>
                        <input type="color" value={node.findOne('.badge-bg').fill()}
                          onChange={(e) => updateProp('badgeColor', e.target.value)}
                          className="w-full h-9 rounded p-1 cursor-pointer" />
                        <div className="grid grid-cols-6 gap-1 mt-2">
                          {Object.entries(CATEGORY_COLORS).slice(0, 12).map(([name, c]) => (
                            <button key={name+c} onClick={() => updateProp('badgeColor', c)}
                              className="aspect-square rounded border border-border hover:scale-110 transition-transform"
                              style={{ background: c }} title={name} />
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-[9px] text-muted-foreground">Arredondamento</span>
                        <input type="number" min="0" max="40" value={node.findOne('.badge-bg').cornerRadius() || 0}
                          onChange={(e) => updateProp('badgeRadius', e.target.value)}
                          className="w-full bg-muted rounded px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        {!showLayers && (
          <button onClick={() => setShowLayers(true)} className="w-8 bg-card border-l border-border flex items-center justify-center hover:bg-muted">
            <ChevronLeft size={14} />
          </button>
        )}
      </div>

      <footer className="h-12 border-t border-border bg-card flex items-center px-4 gap-3 shrink-0">
        <button onClick={() => setScale((s) => Math.max(0.1, s - 0.05))} className="p-1.5 hover:bg-muted rounded"><ZoomOut size={14} /></button>
        <input type="range" min="0.1" max="1" step="0.05" value={scale} onChange={(e) => setScale(parseFloat(e.target.value))} className="w-32 accent-primary" />
        <button onClick={() => setScale((s) => Math.min(1, s + 0.05))} className="p-1.5 hover:bg-muted rounded"><ZoomIn size={14} /></button>
        <span className="text-[11px] font-mono text-muted-foreground w-10">{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale(0.35)} className="text-[11px] px-2 py-1 hover:bg-muted rounded">Ajustar</button>
        <div className="ml-auto text-[10px] text-muted-foreground hidden md:flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 bg-muted rounded">Ctrl+S</kbd> salvar ·
          <kbd className="px-1.5 py-0.5 bg-muted rounded">Setas</kbd> mover ·
          <kbd className="px-1.5 py-0.5 bg-muted rounded">2-click</kbd> editar ·
          <kbd className="px-1.5 py-0.5 bg-muted rounded">Ctrl+Z</kbd> desfazer
        </div>
      </footer>
    </div>
  );
}

function ShapeIcon({ kind }) {
  const sty = { fill: '#9ca3af' };
  if (kind === 'rect' || kind === 'square') return <svg viewBox="0 0 28 28" width="28" height="28"><rect x="3" y="6" width="22" height="16" {...sty} /></svg>;
  if (kind === 'capsule') return <svg viewBox="0 0 28 28" width="28" height="28"><rect x="2" y="10" width="24" height="8" rx="4" {...sty} /></svg>;
  if (kind === 'circle') return <svg viewBox="0 0 28 28" width="28" height="28"><circle cx="14" cy="14" r="10" {...sty} /></svg>;
  if (kind === 'star') return <svg viewBox="0 0 28 28" width="28" height="28"><polygon points="14,3 17,11 25,11 18,16 21,24 14,19 7,24 10,16 3,11 11,11" {...sty} /></svg>;
  if (kind === 'triangle') return <svg viewBox="0 0 28 28" width="28" height="28"><polygon points="14,3 25,24 3,24" {...sty} /></svg>;
  if (kind === 'hexagon') return <svg viewBox="0 0 28 28" width="28" height="28"><polygon points="14,3 24,9 24,19 14,25 4,19 4,9" {...sty} /></svg>;
  if (kind === 'diamond') return <svg viewBox="0 0 28 28" width="28" height="28"><polygon points="14,3 25,14 14,25 3,14" {...sty} /></svg>;
  return null;
}
