'use client';
import { useEffect, useRef, useState } from 'react';
import { Save, RotateCcw, Eye, ExternalLink, Link2 } from 'lucide-react';

const apiBase = 'http://localhost:3001';

export default function TemplatesPage() {
  const iframeRef = useRef(null);
  const [previewForm, setPreviewForm] = useState({
    url: '',
    title: 'Titulo de teste do template',
    summary: 'Resumo de teste para visualizar o preview real.',
    category: 'GERAL',
  });
  const [previewUrl, setPreviewUrl] = useState('');
  const [categoryColors, setCategoryColors] = useState({ GERAL: '#6c757d' });
  const [status, setStatus] = useState({ type: '', message: '' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${apiBase}/api/template`);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (cancelled) return;
        if (data?.categoryColors) setCategoryColors(data.categoryColors);
      } catch {
        if (!cancelled) {
          setStatus({ type: 'error', message: 'Nao foi possivel carregar o template do backend (porta 3001).' });
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const scrapeFromUrl = async () => {
    if (!previewForm.url) return;
    setStatus({ type: 'info', message: 'Extraindo dados da URL...' });
    try {
      const res = await fetch(`${apiBase}/api/template/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: previewForm.url }),
      });
      const data = await res.json();
      if (res.ok) {
        setPreviewForm(p => ({ ...p, title: data.title || p.title, summary: data.summary || p.summary }));
        setStatus({ type: 'success', message: 'Dados extraidos.' });
      } else {
        setStatus({ type: 'error', message: data.error || 'Falha ao extrair dados da URL.' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Erro de conexao ao extrair URL.' });
    }
  };

  const generatePreview = async () => {
    setStatus({ type: 'info', message: 'Gerando preview real...' });
    try {
      const res = await fetch(`${apiBase}/api/template/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: previewForm.title,
          summary: previewForm.summary,
          category: previewForm.category,
        }),
      });
      const data = await res.json();
      if (res.ok && data.mediaPath) {
        setPreviewUrl(`${apiBase}/api/media?path=${encodeURIComponent(data.mediaPath)}&_=${Date.now()}`);
        setStatus({ type: 'success', message: 'Preview real gerado.' });
      } else {
        setStatus({ type: 'error', message: data.error || 'Falha ao gerar preview.' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Erro de conexao ao gerar preview.' });
    }
  };

  const reloadEditor = () => {
    if (iframeRef.current) iframeRef.current.src = iframeRef.current.src;
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">Templates</h2>
          <p className="text-sm text-muted-foreground">
            Editor visual Konva com persistencia no backend. Arraste elementos com o mouse,
            edite texto com duplo clique, ajuste com setas (1px) ou Shift+setas (10px).
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={reloadEditor} className="px-3 py-2 border rounded-lg flex items-center gap-2 text-sm hover:bg-muted">
            <RotateCcw size={14} /> Recarregar editor
          </button>
          <a href="/konva-editor.html" target="_blank" rel="noopener noreferrer"
             className="px-3 py-2 border rounded-lg flex items-center gap-2 text-sm hover:bg-muted">
            <ExternalLink size={14} /> Abrir em nova aba
          </a>
        </div>
      </div>

      {status.message && (
        <div className={`p-3 rounded-lg text-sm ${status.type === 'error' ? 'bg-destructive/10 text-destructive' : status.type === 'info' ? 'bg-muted text-foreground' : 'bg-success/10 text-success'}`}>
          {status.message}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold">Editor visual</h3>
            <span className="text-xs text-muted-foreground">
              <Save size={12} className="inline mr-1" />
              Salvar no editor grava em templates/ururau-reels.json
            </span>
          </div>
          <div className="bg-[#0a0a1a]" style={{ height: 'min(85vh, 980px)' }}>
            <iframe
              ref={iframeRef}
              src="/konva-editor.html"
              title="Editor Visual de Template"
              style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
              sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-modals allow-forms"
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Eye size={16} /> Preview real (com conteudo arbitrario)
          </h3>
          <p className="text-xs text-muted-foreground">
            Gera um PNG real usando o template salvo + o conteudo abaixo. Para
            posicionar elementos, use o editor a esquerda.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Link2 size={12} /> URL da materia (opcional)
            </label>
            <input placeholder="https://exemplo.com/noticia"
                   className="w-full border rounded px-2 py-1.5 text-sm bg-background"
                   value={previewForm.url}
                   onChange={e => setPreviewForm(p => ({ ...p, url: e.target.value }))} />
            <button onClick={scrapeFromUrl} disabled={!previewForm.url}
                    className="w-full border rounded px-2 py-1.5 text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed">
              Extrair titulo e resumo do link
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Titulo</label>
            <input className="w-full border rounded px-2 py-1.5 text-sm bg-background"
                   value={previewForm.title}
                   onChange={e => setPreviewForm(p => ({ ...p, title: e.target.value }))} />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Resumo</label>
            <textarea className="w-full border rounded px-2 py-1.5 text-sm bg-background"
                      rows={3} value={previewForm.summary}
                      onChange={e => setPreviewForm(p => ({ ...p, summary: e.target.value }))} />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Categoria</label>
            <select className="w-full border rounded px-2 py-1.5 text-sm bg-background"
                    value={previewForm.category}
                    onChange={e => setPreviewForm(p => ({ ...p, category: e.target.value }))}>
              {Object.keys(categoryColors).map(c => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>

          <button onClick={generatePreview}
                  className="w-full bg-primary text-primary-foreground rounded px-2 py-2 flex items-center justify-center gap-2 text-sm font-medium hover:opacity-90">
            <Eye size={14} /> Gerar preview real
          </button>

          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="preview real" className="w-full rounded border mt-2" />
          )}
        </div>
      </div>
    </div>
  );
}
