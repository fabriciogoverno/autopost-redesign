'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Save, X, Undo2, Type, Image as ImgIcon, Square, Sparkles, Upload,
  Layers as LayersIcon, ChevronLeft, Plus, Copy, Trash2,
  ArrowUp, ArrowDown, ZoomIn, ZoomOut, Eye, Link2,
  Loader2, Lock, Unlock, EyeOff, AlertCircle, Globe, Send, FileText,
} from 'lucide-react';
import { proxiedUrl, loadVisualIdentity } from '@/lib/imgProxy';
import { TEMPLATE_LAYERS, LAYER_ORDER, LAYER_GROUPS, CATEGORY_COLORS } from '@/lib/templateLayers';

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

  const [konvaReady, setKonvaReady] = useState(false);
  const [fontReady, setFontReady] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);
  const [scale, setScale] = useState(0.32);
  const [tool, setTool] = useState('camadas');
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const [materiaUrl, setMateriaUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);
  const [, force] = useState(0);
  const refresh = () => force((n) => n + 1);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2500); }
  function showError(msg) { setError(msg); setTimeout(() => setError(null), 3500); }

  // === Konva loader ===
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

  // === pdf.js ===
  useEffect(() => {
    if (typeof window === 'undefined' || window.pdfjsLib) return;
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
    s.async = true;
    s.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
      }
    };
    document.head.appendChild(s);
  }, []);

  // === Fontes ===
  useEffect(() => {
    if (typeof window === 'undefined' || !('fonts' in document)) { setFontReady(true); return; }
    const safety = setTimeout(() => setFontReady(true), 4000);
    Promise.all([
      document.fonts.load('800 80px "Aileron"'),
      document.fonts.load('700 36px "Aileron"'),
      document.fonts.load('400 32px "Aileron"'),
    ]).finally(() => { clearTimeout(safety); setFontReady(true); });
  }, []);

  // === Init Konva ===
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
    stage.on('click tap', (e) => { if (e.target === stage) deselect(); });
    layer.draw();
    refresh();
  }, [konvaReady, fontReady]);

  // === Scale ===
  useEffect(() => {
    if (!stageRef.current) return;
    stageRef.current.scale({ x: scale, y: scale });
    stageRef.current.width(1080 * scale);
    stageRef.current.height(1920 * scale);
    layerRef.current?.batchDraw();
  }, [scale]);

  // === Atalhos ===
  useEffect(() => {
    function onKey(e) {
      const t = e.target.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); return; }
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
        case 'Delete': case 'Backspace': toggleVisibility(selectedKey); break;
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

  function createNode(Konva, key, def) {
    const d = def.defaults;
    const base = { name: key, id: key, draggable: d.listening !== false };
    switch (def.kind) {
      case 'rect':
        return new Konva.Rect({ ...base, ...d });
      case 'rect-stroke':
        return new Konva.Rect({ ...base, ...d, fill: d.fill || 'transparent' });
      case 'circle':
        return new Konva.Circle({ ...base, x: d.x, y: d.y, radius: d.radius, fill: d.fill });
      case 'text':
        return new Konva.Text({ ...base, ...d });
      case 'image-slot': {
        // Slot vazio: rect com hachura suave indicando área da imagem
        return new Konva.Rect({
          ...base, x: d.x, y: d.y, width: d.width, height: d.height,
          fill: 'rgba(255,255,255,0.04)', stroke: 'rgba(255,255,255,0.15)',
          strokeWidth: 2, dash: [12, 8], listening: false,
        });
      }
      case 'gradient-rect':
        return new Konva.Rect({
          ...base, x: d.x, y: d.y, width: d.width, height: d.height,
          fillLinearGradientStartPoint: { x: 0, y: d.height * d.gradientStart },
          fillLinearGradientEndPoint: { x: 0, y: d.height * d.gradientEnd },
          fillLinearGradientColorStops: [0, d.colorTop, 0.4, d.colorMid, 1, d.colorBottom],
        });
      default:
        return null;
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
    refresh();
  }

  function deselect() {
    setSelectedKey(null);
    if (!layerRef.current) return;
    layerRef.current.find('.selection-indicator').forEach((i) => i.destroy());
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
    layerRef.current.draw();
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
      // Auto-ajustar bg do badge ao trocar texto da categoria
      if (key === 'category_text') {
        const bg = nodesRef.current.category_bg;
        if (bg) {
          const newW = Math.max(a.value.length * 22 + 60, 180);
          bg.width(newW);
          const color = CATEGORY_COLORS[a.value.toUpperCase()];
          if (color) bg.fill(color);
        }
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
    if (['x', 'y', 'width', 'height', 'fontSize', 'rotation', 'cornerRadius', 'letterSpacing', 'radius', 'strokeWidth'].includes(prop)) {
      n.setAttr(prop, parseFloat(value));
    } else if (prop === 'opacity') {
      n.opacity(parseFloat(value));
    } else if (prop === 'text') {
      n.text(value);
    } else {
      n.setAttr(prop, value);
    }
    layerRef.current?.draw();
    refreshSel();
    refresh();
  }

  function saveUndo() {
    const snap = {};
    Object.entries(nodesRef.current).forEach(([k, n]) => {
      snap[k] = { x: n.x(), y: n.y(), visible: n.visible(), opacity: n.opacity() };
      if (n.getClassName() === 'Text') snap[k].text = n.text();
      if (n.getClassName() === 'Rect') { snap[k].width = n.width(); snap[k].height = n.height(); }
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
    if (dir === 'up') n.moveUp(); else n.moveDown();
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

  function setArticleImageURL(src) {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      articleImgRef.current = img;
      const Konva = window.Konva;
      const layer = layerRef.current;
      const slot = nodesRef.current.article_image;
      if (!slot || !layer) return;
      // Remove old image
      const old = layer.findOne('.article-image-actual');
      if (old) old.destroy();
      // Add image on top of slot
      const imgNode = new Konva.Image({
        x: slot.x(), y: slot.y(), width: slot.width(), height: slot.height(),
        image: img, name: 'article-image-actual', listening: false,
      });
      layer.add(imgNode);
      imgNode.zIndex(slot.zIndex() + 1);
      layer.draw();
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
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Erro');

      const titleNode = nodesRef.current.title;
      const summaryNode = nodesRef.current.summary;
      const catText = nodesRef.current.category_text;
      const catBg = nodesRef.current.category_bg;

      if (titleNode && d.title) titleNode.text(d.title);
      if (summaryNode && d.summary) summaryNode.text(d.summary);
      if (catText && d.category) {
        const t = d.category.toUpperCase();
        catText.text(t);
        if (catBg) {
          const newW = Math.max(t.length * 22 + 60, 180);
          catBg.width(newW);
          if (CATEGORY_COLORS[t]) catBg.fill(CATEGORY_COLORS[t]);
        }
      }
      if (d.image) setArticleImageURL(d.image);
      layerRef.current?.draw();
      showToast(`Matéria extraída`);
    } catch (err) {
      showError('Erro: ' + err.message);
    } finally { setExtracting(false); }
  }

  function handleSave() {
    const state = {};
    Object.entries(nodesRef.current).forEach(([k, n]) => {
      state[k] = { x: Math.round(n.x()), y: Math.round(n.y()), visible: n.visible() };
      if (n.getClassName() === 'Text') {
        state[k].text = n.text();
        state[k].fontSize = n.fontSize();
        state[k].fill = n.fill();
      }
      if (n.getClassName() === 'Rect') {
        state[k].width = Math.round(n.width());
        state[k].height = Math.round(n.height());
        state[k].fill = n.fill();
      }
    });
    try { localStorage.setItem(`ururau-tpl-${templateId || 'novo'}`, JSON.stringify(state)); } catch {}
    showToast('Template salvo no navegador');
  }

  function exportPNG() {
    if (!stageRef.current) return;
    const layer = layerRef.current;
    layer.find('.selection-indicator').forEach((i) => i.visible(false));
    layer.draw();
    const url = stageRef.current.toDataURL({ pixelRatio: 1, mimeType: 'image/png', width: 1080, height: 1920 });
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
    const Konva = window.Konva;
    const img = new window.Image();
    img.onload = () => {
      const layer = layerRef.current;
      const old = layer.findOne('.base-template');
      if (old) old.destroy();
      const baseImg = new Konva.Image({
        x: 0, y: 0, width: 1080, height: 1920,
        image: img, name: 'base-template', listening: false,
      });
      layer.add(baseImg);
      // Above gradient, below interactive layers
      const grad = nodesRef.current.gradient_overlay;
      if (grad) baseImg.zIndex(grad.zIndex() + 1);
      layer.draw();
      showToast('Template base aplicado');
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
  const def = selectedKey ? TEMPLATE_LAYERS[selectedKey] : null;

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      {/* Topbar */}
      <header className="h-14 border-b border-border bg-card flex items-center px-3 gap-2 shrink-0">
        <button onClick={() => router.push('/templates')} className="p-1.5 hover:bg-muted rounded"><X size={18} /></button>
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-primary" />
          <span className="font-bold text-sm">Editor</span>
          <span className="text-[10px] text-muted-foreground font-mono">#{templateId || 'novo'}</span>
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
        <button onClick={undo} className="p-1.5 hover:bg-muted rounded text-muted-foreground" title="Desfazer"><Undo2 size={15} /></button>
        <div className="w-px h-6 bg-border" />
        <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90">
          <Save size={11} /> Salvar
        </button>
        <button onClick={exportPNG} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-success text-success-foreground text-xs font-semibold hover:opacity-90">
          <Send size={11} /> Exportar PNG
        </button>
      </header>

      {error && <div className="bg-destructive/10 border-b border-destructive/20 text-destructive text-xs px-4 py-2 flex items-center gap-2"><AlertCircle size={14} /> {error}</div>}
      {toast && <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg bg-success text-success-foreground shadow-card text-sm font-medium animate-fade-up">✓ {toast}</div>}

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar de ferramentas */}
        <nav className="w-16 bg-card border-r border-border flex flex-col items-center py-3 gap-1 shrink-0">
          {[
            { id: 'camadas',  label: 'Camadas',  icon: LayersIcon },
            { id: 'imagens',  label: 'Imagens',  icon: ImgIcon },
            { id: 'template', label: 'Template', icon: FileText },
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

        {/* Painel esquerdo (depende do tool) */}
        <div className="w-72 bg-card border-r border-border overflow-y-auto">
          {tool === 'camadas' && (
            <div className="p-2 space-y-2">
              <div className="px-2 pt-2 pb-1">
                <h3 className="text-xs font-bold uppercase text-muted-foreground">Camadas</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Clique para selecionar e editar</p>
              </div>
              {LAYER_GROUPS.map((group) => {
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
                          if (!def || !n) return null;
                          const isActive = selectedKey === key;
                          const visible = n.visible();
                          const locked = !n.draggable();
                          return (
                            <div key={key}
                              className={`flex items-center gap-1 p-1.5 rounded text-[11px] ${
                                isActive ? 'bg-primary/15 border border-primary/30' : 'hover:bg-muted'
                              }`}>
                              <button onClick={() => selectElement(key)} className="flex-1 text-left truncate">
                                {def.label}
                              </button>
                              <button onClick={() => toggleVisibility(key)} className="p-0.5 hover:bg-card rounded" title="Mostrar/ocultar">
                                {visible ? <Eye size={10} /> : <EyeOff size={10} className="text-muted-foreground" />}
                              </button>
                              <button onClick={() => toggleLock(key)} className="p-0.5 hover:bg-card rounded" title="Bloquear">
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

          {tool === 'imagens' && (
            <div className="p-3 space-y-3">
              <h3 className="text-xs font-bold uppercase text-muted-foreground">Imagem da matéria</h3>
              <label className="cursor-pointer block w-full border-2 border-dashed border-border rounded-lg p-5 text-center hover:bg-muted/30">
                <ImgIcon size={20} className="mx-auto mb-2 text-muted-foreground" />
                <p className="text-xs font-semibold">Enviar do PC</p>
                <p className="text-[10px] text-muted-foreground mt-1">Preenche o slot da matéria</p>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && uploadArticleImage(e.target.files[0])} />
              </label>
              <button onClick={() => {
                const url = prompt('URL da imagem:');
                if (url) setArticleImageURL(url);
              }} className="w-full py-2 rounded-lg bg-muted text-xs font-medium hover:bg-muted/80">
                Por URL
              </button>
            </div>
          )}

          {tool === 'template' && (
            <div className="p-3 space-y-3">
              <h3 className="text-xs font-bold uppercase text-muted-foreground">Template base</h3>
              <p className="text-[11px] text-muted-foreground">Importe PDF/PNG do Canva como template visual.</p>
              <label className="cursor-pointer block w-full border-2 border-dashed border-primary/40 rounded-lg p-4 text-center hover:bg-primary/5">
                <FileText size={20} className="mx-auto mb-1 text-primary" />
                <p className="text-xs font-semibold text-primary">Importar PDF do Canva</p>
                <input type="file" accept=".pdf,image/png,image/jpeg" className="hidden"
                  onChange={(e) => e.target.files[0] && uploadBaseTemplate(e.target.files[0])} />
              </label>
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

        {/* Canvas */}
        <div className="flex-1 overflow-auto bg-muted/30 p-6">
          {(!konvaReady || !fontReady) && (
            <div className="flex items-center justify-center h-96 text-muted-foreground text-sm">
              <Loader2 className="animate-spin mr-3" size={18} />
              {!konvaReady ? 'Carregando Konva.js...' : 'Carregando fontes...'}
            </div>
          )}
          <div id="konva-stage" className="mx-auto rounded-md shadow-2xl"
            style={{ width: 1080 * scale, height: 1920 * scale, background: '#0a0a0a' }} />
        </div>

        {/* Painel direito: Propriedades */}
        <div className="w-80 bg-card border-l border-border overflow-y-auto">
          <div className="p-3 border-b border-border">
            <h3 className="text-xs font-bold uppercase text-muted-foreground">Propriedades</h3>
          </div>
          <div className="p-3">
            {!node ? (
              <p className="text-[11px] text-muted-foreground">Selecione uma camada para editar suas propriedades</p>
            ) : (
              <div className="space-y-3">
                <div className="px-2 py-1.5 rounded bg-primary/10 text-primary text-[11px] font-bold text-center">
                  {def?.label || selectedKey}
                </div>

                {/* Visibilidade + Lock + Move */}
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleVisibility(selectedKey)} className="flex-1 py-1.5 rounded bg-muted text-[10px] font-semibold hover:bg-muted/80">
                    {node.visible() ? 'Ocultar' : 'Mostrar'}
                  </button>
                  <button onClick={() => toggleLock(selectedKey)} className="flex-1 py-1.5 rounded bg-muted text-[10px] font-semibold hover:bg-muted/80">
                    {node.draggable() ? 'Bloquear' : 'Liberar'}
                  </button>
                  <button onClick={() => moveLayer(selectedKey, 'up')} className="p-1.5 rounded bg-muted hover:bg-muted/80" title="Pra frente">
                    <ArrowUp size={11} />
                  </button>
                  <button onClick={() => moveLayer(selectedKey, 'down')} className="p-1.5 rounded bg-muted hover:bg-muted/80" title="Pra trás">
                    <ArrowDown size={11} />
                  </button>
                  <button onClick={() => resetLayer(selectedKey)} className="p-1.5 rounded bg-warning/10 text-warning hover:bg-warning/20" title="Resetar">
                    <Undo2 size={11} />
                  </button>
                </div>

                {/* Posição */}
                <Section title="Posição">
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="X"><NumInput value={Math.round(node.x())} onChange={(v) => updateProp('x', v)} /></Field>
                    <Field label="Y"><NumInput value={Math.round(node.y())} onChange={(v) => updateProp('y', v)} /></Field>
                  </div>
                </Section>

                {/* Tamanho */}
                {(nodeType === 'Text' || nodeType === 'Rect') && (
                  <Section title="Tamanho">
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Largura"><NumInput value={Math.round(node.width() || 0)} onChange={(v) => updateProp('width', v)} /></Field>
                      {nodeType === 'Rect' && <Field label="Altura"><NumInput value={Math.round(node.height() || 0)} onChange={(v) => updateProp('height', v)} /></Field>}
                    </div>
                  </Section>
                )}

                {/* Círculo */}
                {nodeType === 'Circle' && (
                  <Section title="Raio">
                    <NumInput value={Math.round(node.radius())} onChange={(v) => updateProp('radius', v)} />
                  </Section>
                )}

                {/* Texto */}
                {nodeType === 'Text' && (
                  <>
                    <Section title="Texto">
                      <textarea value={node.text()} onChange={(e) => updateProp('text', e.target.value)} rows={2}
                        className="w-full bg-muted rounded px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                    </Section>
                    <div className="grid grid-cols-2 gap-2">
                      <Section title="Fonte (px)">
                        <NumInput value={node.fontSize()} onChange={(v) => updateProp('fontSize', v)} />
                      </Section>
                      <Section title="Cor">
                        <input type="color" value={node.fill()} onChange={(e) => updateProp('fill', e.target.value)}
                          className="w-full h-8 rounded p-1 cursor-pointer" />
                      </Section>
                    </div>
                    <Section title={`Espaçamento entre letras (${node.letterSpacing() || 0})`}>
                      <input type="range" min="-5" max="20" step="0.5" value={node.letterSpacing() || 0}
                        onChange={(e) => updateProp('letterSpacing', e.target.value)} className="w-full accent-primary" />
                    </Section>
                  </>
                )}

                {/* Forma */}
                {(nodeType === 'Rect' || nodeType === 'Circle') && (
                  <>
                    <Section title="Cor de preenchimento">
                      <input type="color" value={node.fill() || '#ffffff'} onChange={(e) => updateProp('fill', e.target.value)}
                        className="w-full h-9 rounded p-1 cursor-pointer" />
                    </Section>
                    {nodeType === 'Rect' && (
                      <Section title="Arredondamento">
                        <NumInput value={node.cornerRadius() || 0} onChange={(v) => updateProp('cornerRadius', v)} />
                      </Section>
                    )}
                  </>
                )}

                {/* Opacidade */}
                <Section title={`Opacidade · ${Math.round(node.opacity() * 100)}%`}>
                  <input type="range" min="0" max="1" step="0.05" value={node.opacity()}
                    onChange={(e) => updateProp('opacity', e.target.value)} className="w-full accent-primary" />
                </Section>

                {/* Badge especial: paleta */}
                {selectedKey === 'category_bg' && (
                  <Section title="Cores rápidas por categoria">
                    <div className="grid grid-cols-6 gap-1">
                      {Object.entries(CATEGORY_COLORS).slice(0, 12).map(([name, c]) => (
                        <button key={name + c} onClick={() => updateProp('fill', c)}
                          className="aspect-square rounded border border-border hover:scale-110 transition-transform"
                          style={{ background: c }} title={name} />
                      ))}
                    </div>
                  </Section>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="h-11 border-t border-border bg-card flex items-center px-4 gap-3 shrink-0">
        <button onClick={() => setScale((s) => Math.max(0.1, s - 0.05))} className="p-1.5 hover:bg-muted rounded"><ZoomOut size={13} /></button>
        <input type="range" min="0.1" max="1" step="0.05" value={scale} onChange={(e) => setScale(parseFloat(e.target.value))} className="w-32 accent-primary" />
        <button onClick={() => setScale((s) => Math.min(1, s + 0.05))} className="p-1.5 hover:bg-muted rounded"><ZoomIn size={13} /></button>
        <span className="text-[10px] font-mono text-muted-foreground w-10">{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale(0.32)} className="text-[10px] px-2 py-1 hover:bg-muted rounded">Ajustar</button>
        <div className="ml-auto text-[9px] text-muted-foreground hidden md:flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 bg-muted rounded">Ctrl+S</kbd>salvar
          <kbd className="px-1.5 py-0.5 bg-muted rounded">Setas</kbd>mover
          <kbd className="px-1.5 py-0.5 bg-muted rounded">2-click</kbd>editar
          <kbd className="px-1.5 py-0.5 bg-muted rounded">Del</kbd>ocultar
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
