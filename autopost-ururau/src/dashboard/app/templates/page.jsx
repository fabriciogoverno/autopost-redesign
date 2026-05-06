'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Save, RotateCcw, Eye, ExternalLink, Link2, Maximize2, Minimize2 } from 'lucide-react';

const apiBase = '';
const URURAU_OFFICIAL_RED = '#af0014';

export default function TemplatesPage() {
  const iframeRef = useRef(null);
  const [previewForm, setPreviewForm] = useState({
    url: '',
    title: 'Titulo de teste do template',
    summary: 'Resumo de teste para visualizar o preview real.',
    category: 'GERAL',
    image: '',
    author: '',
    date: '',
  });
  const [previewUrl, setPreviewUrl] = useState('');
  const [categoryColors, setCategoryColors] = useState({ GERAL: URURAU_OFFICIAL_RED });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [editorNonce, setEditorNonce] = useState(Date.now());
  const [editorExpanded, setEditorExpanded] = useState(false);
  const [previewPanelOpen, setPreviewPanelOpen] = useState(true);

  const loadTemplateState = useCallback(async () => {
    const res = await fetch(`${apiBase}/api/template`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (data?.categoryColors) setCategoryColors({ GERAL: URURAU_OFFICIAL_RED, ...data.categoryColors });
    if (data?.defaults) {
      setPreviewForm(p => ({
        ...p,
        title: data.defaults.title || p.title,
        summary: data.defaults.summary || p.summary,
        category: data.defaults.category || p.category,
      }));
    }
    return data;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadTemplateState();
        if (cancelled) return;
      } catch {
        if (!cancelled) {
          setStatus({ type: 'error', message: 'Nao foi possivel carregar o template do backend (porta 3001).' });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [loadTemplateState]);

  useEffect(() => {
    const refreshAfterTemplateSave = async () => {
      setPreviewUrl('');
      setEditorNonce(Date.now());
      try {
        await loadTemplateState();
        setStatus({ type: 'success', message: 'Template salvo/atualizado. Editor e preview recarregados.' });
      } catch {
        setStatus({ type: 'error', message: 'Template salvo, mas nao foi possivel recarregar o estado atual.' });
      }
    };
    const onStorage = event => {
      if (event.key === 'autopost:template-saved') refreshAfterTemplateSave();
    };
    const onMessage = event => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'autopost:template-saved') refreshAfterTemplateSave();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('message', onMessage);
    };
  }, [loadTemplateState]);

  const sendArticleToEditor = article => {
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    target.postMessage({
      type: 'autopost:article-data',
      payload: {
        category: article.category || '',
        title: article.title || '',
        summary: article.summary || '',
        image: article.image || '',
        author: article.author || '',
        date: article.date || '',
        url: article.url || '',
      },
    }, window.location.origin);
  };

  const requestEditorSnapshot = () => new Promise((resolve, reject) => {
    const target = iframeRef.current?.contentWindow;
    if (!target) return reject(new Error('Editor visual ainda nao esta carregado.'));
    const requestId = `preview-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const timeout = setTimeout(() => {
      window.removeEventListener('message', onMessage);
      reject(new Error('Editor visual nao respondeu com o snapshot atual.'));
    }, 4000);
    const onMessage = event => {
      if (event.origin !== window.location.origin) return;
      const message = event.data || {};
      if (message.type !== 'autopost:template-snapshot-response' || message.requestId !== requestId) return;
      clearTimeout(timeout);
      window.removeEventListener('message', onMessage);
      if (message.payload?.layers) resolve(message.payload);
      else reject(new Error('Snapshot do editor veio vazio.'));
    };
    window.addEventListener('message', onMessage);
    target.postMessage({ type: 'autopost:template-snapshot-request', requestId }, window.location.origin);
  });

  const buildPreviewMediaUrl = data => {
    const rawUrl = data?.url || (data?.mediaPath ? `/api/media?path=${encodeURIComponent(data.mediaPath)}` : '');
    if (!rawUrl) return '';
    const separator = rawUrl.includes('?') ? '&' : '?';
    return `${rawUrl}${separator}_=${Date.now()}`;
  };

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
      if (res.ok && data.success) {
        const nextArticle = {
          url: data.url || previewForm.url,
          title: data.title || previewForm.title,
          summary: data.summary || previewForm.summary,
          category: data.category || previewForm.category,
          image: data.image || previewForm.image,
          author: data.author || previewForm.author || '',
          date: data.date || data.publishedAt || previewForm.date || '',
        };
        setPreviewForm(p => ({ ...p, ...nextArticle }));
        if (data.category) {
          setCategoryColors(colors => ({ ...colors, [data.category]: colors[data.category] || URURAU_OFFICIAL_RED }));
        }
        sendArticleToEditor(nextArticle);
        setStatus({ type: 'success', message: 'Dados extraidos e aplicados ao editor.' });
      } else {
        setStatus({ type: 'error', message: data.error || 'Falha ao extrair dados da URL.' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Erro de conexao ao extrair URL.' });
    }
  };

  const generatePreview = async () => {
    setStatus({ type: 'info', message: 'Gerando preview real...' });
    setPreviewUrl('');
    try {
      let template;
      try {
        template = await requestEditorSnapshot();
      } catch {
        template = await loadTemplateState();
      }
      const imageUrl = previewForm.image || template?.layers?.articleImage?.src || '';
      if (imageUrl && template?.layers?.articleImage) template.layers.articleImage.src = imageUrl;
      const res = await fetch(`${apiBase}/api/template/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: previewForm.title,
          summary: previewForm.summary,
          category: previewForm.category,
          imageUrl,
          image: imageUrl,
          author: previewForm.author || template?.articleData?.author || '',
          date: previewForm.date || template?.articleData?.date || '',
          template,
        }),
      });
      const data = await res.json().catch(() => ({}));
      const nextPreviewUrl = buildPreviewMediaUrl(data);
      if (res.ok && nextPreviewUrl) {
        setPreviewUrl(nextPreviewUrl);
        setStatus({ type: 'success', message: 'Preview real gerado.' });
      } else {
        setStatus({ type: 'error', message: data.error || 'Falha ao gerar preview.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: `Erro de conexao ao gerar preview: ${err.message || 'falha desconhecida'}` });
    }
  };

  const reloadEditor = () => {
    setPreviewUrl('');
    setEditorNonce(Date.now());
  };

  const workspaceGridClass = previewPanelOpen
    ? 'grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_360px] gap-3 min-h-[calc(100vh-118px)] px-1 2xl:px-2'
    : 'grid grid-cols-1 gap-3 min-h-[calc(100vh-118px)] px-1 2xl:px-2';

  return (
    <div
      className="space-y-2 animate-fade-up relative left-1/2 -translate-x-1/2"
      style={{
        width: 'calc(100vw - 16rem - 2rem)',
        maxWidth: 'none',
      }}
    >
      <div className="flex justify-between items-center gap-3 flex-wrap px-1 2xl:px-2 py-1">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold leading-none">Templates</h2>
            <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">Template Studio</span>
            <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">Konva</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Editor visual integrado, importacao por URL, preview real e salvamento do template ativo.</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <button onClick={reloadEditor} className="px-3 py-2 border rounded-lg flex items-center gap-2 text-sm hover:bg-muted bg-card">
            <RotateCcw size={14} /> Recarregar editor
          </button>
          <button onClick={() => setPreviewPanelOpen(v => !v)} className="px-3 py-2 border rounded-lg flex items-center gap-2 text-sm hover:bg-muted bg-card">
            {previewPanelOpen ? <Minimize2 size={14} /> : <Eye size={14} />} {previewPanelOpen ? 'Ocultar painel' : 'Mostrar painel'}
          </button>
          <button onClick={() => setEditorExpanded(true)} className="px-3 py-2 border rounded-lg flex items-center gap-2 text-sm hover:bg-muted bg-card">
            <Maximize2 size={14} /> Expandir editor
          </button>
          <a href="/konva-editor.html" target="_blank" rel="noopener noreferrer"
             className="px-3 py-2 border rounded-lg flex items-center gap-2 text-sm hover:bg-muted bg-card">
            <ExternalLink size={14} /> Abrir em nova aba
          </a>
        </div>
      </div>

      {status.message && (
        <div className={`mx-2 2xl:mx-4 p-3 rounded-lg text-sm ${status.type === 'error' ? 'bg-destructive/10 text-destructive' : status.type === 'info' ? 'bg-muted text-foreground' : 'bg-success/10 text-success'}`}>
          {status.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 px-1 2xl:px-2">
        <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-sm">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Fluxo</p>
          <p className="text-sm font-medium">Importe URL, ajuste camadas, salve e gere preview.</p>
        </div>
        <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-sm">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Canvas</p>
          <p className="text-sm font-medium">1080 x 1920, Reels vertical.</p>
        </div>
        <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-sm">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Fonte</p>
          <p className="text-sm font-medium">Aileron 400/700.</p>
        </div>
        <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-sm">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Painel</p>
          <p className="text-sm font-medium">{previewPanelOpen ? 'Preview lateral ativo.' : 'Modo foco no editor.'}</p>
        </div>
      </div>

      <div className={workspaceGridClass}>
        <div className={`bg-card border border-border rounded-xl overflow-hidden shadow-sm ${editorExpanded ? 'fixed inset-3 z-50 flex flex-col' : ''}`}>
          <div className="px-4 py-2.5 border-b border-border flex items-center justify-between gap-3 bg-card/95 backdrop-blur">
            <div>
              <h3 className="font-semibold">Editor visual</h3>
              <p className="text-xs text-muted-foreground">Use o painel interno para upload, crop, camadas, preview e salvamento.</p>
            </div>
            <span className="text-xs text-muted-foreground hidden lg:inline">
              <Save size={12} className="inline mr-1" />
              Salvar no editor grava em templates/ururau-reels.json
            </span>
            {editorExpanded && (
              <button onClick={() => setEditorExpanded(false)} className="px-3 py-2 border rounded-lg flex items-center gap-2 text-sm hover:bg-muted">
                <Minimize2 size={14} /> Sair
              </button>
            )}
          </div>
          <div className="bg-muted/40 flex-1" style={{ height: editorExpanded ? 'auto' : 'calc(100vh - 162px)', minHeight: editorExpanded ? 0 : 860 }}>
            <iframe
              ref={iframeRef}
              src={`/konva-editor.html?v=${editorNonce}`}
              title="Editor Visual de Template"
              style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
              onLoad={() => { if (previewForm.url) sendArticleToEditor(previewForm); }}
              sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-modals allow-forms"
            />
          </div>
        </div>

        {previewPanelOpen && (
        <div className="bg-card border border-border rounded-xl p-3 space-y-3 shadow-sm 2xl:sticky 2xl:top-2 self-start max-h-[calc(100vh-96px)] overflow-auto">
          <h3 className="font-semibold flex items-center gap-2">
            <Eye size={16} /> Preview real (com conteudo arbitrario)
          </h3>
          <p className="text-xs text-muted-foreground">
            Extraia uma URL para preencher categoria, titulo, resumo e imagem no editor.
            Para posicionar elementos, use o editor a esquerda.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Link2 size={12} /> URL da materia (opcional)
            </label>
            <input placeholder="https://exemplo.com/noticia"
                   className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                   value={previewForm.url}
                   onChange={e => setPreviewForm(p => ({ ...p, url: e.target.value }))} />
            <button onClick={scrapeFromUrl} disabled={!previewForm.url}
                    className="w-full border rounded-lg px-3 py-2 text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed">
              Extrair dados da materia
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Titulo</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                   value={previewForm.title}
                   onChange={e => setPreviewForm(p => ({ ...p, title: e.target.value }))} />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Resumo</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                      rows={3} value={previewForm.summary}
                      onChange={e => setPreviewForm(p => ({ ...p, summary: e.target.value }))} />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Categoria</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                    value={previewForm.category}
                    onChange={e => setPreviewForm(p => ({ ...p, category: e.target.value }))}>
              {Object.keys(categoryColors).map(c => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>

          {previewForm.image && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Imagem principal</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                     value={previewForm.image}
                     onChange={e => {
                       const image = e.target.value;
                       setPreviewForm(p => ({ ...p, image }));
                       sendArticleToEditor({ ...previewForm, image });
                     }} />
            </div>
          )}

          <button onClick={generatePreview}
                  className="w-full bg-primary text-primary-foreground rounded-lg px-3 py-2.5 flex items-center justify-center gap-2 text-sm font-medium hover:opacity-90">
            <Eye size={14} /> Gerar preview real
          </button>

          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="preview real"
              className="w-full rounded border mt-2"
              onError={() => {
                setPreviewUrl('');
                setStatus({ type: 'error', message: 'Preview gerado, mas a imagem nao pode ser carregada em /api/media.' });
              }}
            />
          )}
        </div>
        )}
      </div>
    </div>
  );
}
