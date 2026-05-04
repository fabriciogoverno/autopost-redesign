'use client';
import { useEffect, useMemo, useState } from 'react';
import { Save, RotateCcw, Eye, Move } from 'lucide-react';

const apiBase = 'http://localhost:3001';

export default function TemplatesPage() {
  const [template, setTemplate] = useState(null);
  const [selectedLayer, setSelectedLayer] = useState('title');
  const [preview, setPreview] = useState({ url: '', title: 'Título de teste do template', summary: 'Resumo de teste', category: 'GERAL' });
  const [previewUrl, setPreviewUrl] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });

  const layers = template?.layers || {};

  const loadTemplate = async () => {
    try {
      const res = await fetch(`${apiBase}/api/template`);
      const data = await res.json();
      setTemplate(data);
      setStatus({ type: '', message: '' });
    } catch {
      setStatus({ type: 'error', message: 'Erro ao carregar template.' });
    }
  };
  useEffect(() => { loadTemplate(); }, []);

  const updateLayer = (key, patch) => setTemplate(t => ({ ...t, layers: { ...t.layers, [key]: { ...t.layers[key], ...patch } } }));
  const nudge = (dx, dy) => updateLayer(selectedLayer, { x: (layers[selectedLayer]?.x || 0) + dx, y: (layers[selectedLayer]?.y || 0) + dy });

  const saveTemplate = async () => {
    const res = await fetch(`${apiBase}/api/template`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(template) });
    if (res.ok) setStatus({ type: 'success', message: 'Template salvo com sucesso.' });
    else setStatus({ type: 'error', message: 'Erro ao salvar template.' });
  };

  const resetTemplate = async () => {
    const res = await fetch(`${apiBase}/api/template/reset`, { method: 'POST' });
    const data = await res.json();
    setTemplate(data.template);
    setStatus({ type: 'success', message: 'Template restaurado para o padrão.' });
  };

  const scrapeFromUrl = async () => {
    if (!preview.url) return;
    const res = await fetch(`${apiBase}/api/template/scrape`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: preview.url }) });
    const data = await res.json();
    if (res.ok) setPreview(p => ({ ...p, ...data }));
    else setStatus({ type: 'error', message: data.error || 'Falha ao extrair dados da URL.' });
  };

  const generatePreview = async () => {
    const res = await fetch(`${apiBase}/api/template/preview`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(preview) });
    const data = await res.json();
    if (res.ok) setPreviewUrl(`${apiBase}/api/media?path=${encodeURIComponent(data.mediaPath)}`);
    else setStatus({ type: 'error', message: data.error || 'Falha no preview.' });
  };

  const visualLayers = useMemo(() => Object.entries(layers).filter(([, l]) => typeof l.x === 'number' && typeof l.y === 'number'), [layers]);

  if (!template) return <div className="p-6">Carregando template...</div>;

  return <div className="space-y-6 animate-fade-up">
    <div className="flex justify-between items-center">
      <div><h2 className="text-2xl font-bold">Templates</h2><p className="text-sm text-muted-foreground">Editor visual simplificado com persistência backend.</p></div>
      <div className="flex gap-2">
        <button onClick={resetTemplate} className="px-3 py-2 border rounded-lg flex items-center gap-2"><RotateCcw size={14} /> Restaurar</button>
        <button onClick={saveTemplate} className="px-3 py-2 bg-primary text-primary-foreground rounded-lg flex items-center gap-2"><Save size={14} /> Salvar</button>
      </div>
    </div>

    {status.message && <div className={`p-3 rounded-lg text-sm ${status.type === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>{status.message}</div>}

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      <div className="xl:col-span-2 bg-card border border-border rounded-xl p-4">
        <h3 className="font-semibold mb-3">Editor visual</h3>
        <div className="flex gap-4">
          <div className="relative rounded-lg overflow-hidden border" style={{ width: 270, height: 480, background: '#050510' }}>
            {visualLayers.map(([key, l]) => (
              <button key={key} onClick={() => setSelectedLayer(key)} style={{ left: (l.x || 0) / 4, top: (l.y || 0) / 4 }} className={`absolute px-2 py-1 text-[10px] rounded ${selectedLayer === key ? 'bg-primary text-white' : 'bg-white/80'}`}>
                {key}
              </button>
            ))}
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-medium">Camada selecionada: {selectedLayer}</p>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" className="border rounded px-2 py-1" value={layers[selectedLayer]?.x ?? 0} onChange={e => updateLayer(selectedLayer, { x: Number(e.target.value) })} />
              <input type="number" className="border rounded px-2 py-1" value={layers[selectedLayer]?.y ?? 0} onChange={e => updateLayer(selectedLayer, { y: Number(e.target.value) })} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => nudge(0, -5)} className="border rounded px-2 py-1">↑</button>
              <button onClick={() => nudge(-5, 0)} className="border rounded px-2 py-1">←</button>
              <button onClick={() => nudge(5, 0)} className="border rounded px-2 py-1">→</button>
              <button onClick={() => nudge(0, 5)} className="border rounded px-2 py-1">↓</button>
              <button onClick={() => nudge(-20, 0)} className="border rounded px-2 py-1"><Move size={12} /></button>
              <button onClick={() => nudge(20, 0)} className="border rounded px-2 py-1"><Move size={12} /></button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-2">
        <h3 className="font-semibold">Preview da matéria</h3>
        <input placeholder="URL da matéria para teste" className="w-full border rounded px-2 py-1" value={preview.url} onChange={e => setPreview(p => ({ ...p, url: e.target.value }))} />
        <button onClick={scrapeFromUrl} className="w-full border rounded px-2 py-1">Extrair do link</button>
        <input className="w-full border rounded px-2 py-1" value={preview.title} onChange={e => setPreview(p => ({ ...p, title: e.target.value }))} />
        <textarea className="w-full border rounded px-2 py-1" rows={3} value={preview.summary} onChange={e => setPreview(p => ({ ...p, summary: e.target.value }))} />
        <select className="w-full border rounded px-2 py-1" value={preview.category} onChange={e => setPreview(p => ({ ...p, category: e.target.value }))}>
          {Object.keys(template.categoryColors || { GERAL: '#6c757d' }).map(c => <option key={c}>{c}</option>)}
        </select>
        <button onClick={generatePreview} className="w-full bg-primary text-white rounded px-2 py-2 flex items-center justify-center gap-2"><Eye size={14} /> Gerar preview real</button>
        {previewUrl && <img src={previewUrl} alt="preview" className="w-full rounded border" />}
      </div>
    </div>
  </div>;
}
