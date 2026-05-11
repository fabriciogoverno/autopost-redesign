'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Layers, Edit3, Copy, Trash2, MoreVertical, Maximize2, Search } from 'lucide-react';

const STORAGE_KEY = 'ururau-my-templates-v1';

const LIBRARY = [
  { id: 'tpl_news_01',     name: 'Notícia Esporte',         category: 'noticia',  accent: '#2A9D8F', preview: 'esporte' },
  { id: 'tpl_news_02',     name: 'Notícia Política',         category: 'noticia',  accent: '#1D3557', preview: 'politica' },
  { id: 'tpl_news_03',     name: 'Notícia Segurança',        category: 'noticia',  accent: '#E9C46A', preview: 'seguranca' },
  { id: 'tpl_news_04',     name: 'Notícia Economia',         category: 'noticia',  accent: '#F4A261', preview: 'economia' },
  { id: 'tpl_news_05',     name: 'Notícia Geral',            category: 'noticia',  accent: '#6C757D', preview: 'geral' },
  { id: 'tpl_news_06',     name: 'Notícia Opinião',          category: 'noticia',  accent: '#E63946', preview: 'opiniao' },
  { id: 'tpl_news_07',     name: 'Notícia Internacional',    category: 'noticia',  accent: '#4361EE', preview: 'internacional' },
  { id: 'tpl_news_08',     name: 'Notícia Saúde',            category: 'noticia',  accent: '#06A77D', preview: 'saude' },
  { id: 'tpl_news_09',     name: 'Notícia Educação',         category: 'noticia',  accent: '#7209B7', preview: 'educacao' },
  { id: 'tpl_news_10',     name: 'Notícia Cultura',          category: 'noticia',  accent: '#F72585', preview: 'cultura' },
  { id: 'tpl_pesar_01',    name: 'Nota de Pesar — Sóbria',   category: 'pesar',    accent: '#1F1F1F', preview: 'pesar1' },
  { id: 'tpl_pesar_02',    name: 'Nota de Pesar — Clara',    category: 'pesar',    accent: '#374151', preview: 'pesar2' },
  { id: 'tpl_pesar_03',    name: 'Nota de Pesar — Discreta', category: 'pesar',    accent: '#525252', preview: 'pesar3' },
];

const CATEGORIES = [
  { key: 'todos',   label: 'Todos' },
  { key: 'noticia', label: 'Notícia' },
  { key: 'pesar',   label: 'Nota de Pesar' },
];

function TemplateThumb({ tpl }) {
  return (
    <svg viewBox="0 0 270 480" className="w-full h-full block" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`bg-${tpl.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tpl.accent} stopOpacity="0.85" />
          <stop offset="100%" stopColor="#0a0a1a" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <rect width="270" height="480" fill={`url(#bg-${tpl.id})`} />
      <text x="22" y="40" fill="white" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="14">URURAU</text>
      <rect x="22" y="50" width="40" height="2" fill="#FFD700" />
      <text x="22" y="65" fill="#FFD700" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="9">19 ANOS</text>
      <rect x="22" y="290" width="60" height="20" rx="3" fill={tpl.accent} />
      <text x="32" y="304" fill="white" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="10">{tpl.category.toUpperCase()}</text>
      <text x="22" y="335" fill="white" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="18">Título</text>
      <text x="22" y="358" fill="white" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="18">da matéria</text>
      <rect x="22" y="370" width="35" height="3" fill="#c11f25" />
      <text x="22" y="395" fill="#E0E0E0" fontFamily="Inter, sans-serif" fontSize="10">Resumo gerado pela IA</text>
      <text x="22" y="410" fill="#E0E0E0" fontFamily="Inter, sans-serif" fontSize="10">a partir do link original</text>
      <text x="22" y="465" fill="white" fontFamily="Inter, sans-serif" fontSize="7" opacity="0.4" letterSpacing="1">URURAU.COM.BR</text>
    </svg>
  );
}

export default function TemplatesPage() {
  const [tab, setTab] = useState('biblioteca');
  const [filter, setFilter] = useState('todos');
  const [search, setSearch] = useState('');
  const [myTemplates, setMyTemplates] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      setMyTemplates(stored);
    } catch {}
  }, []);

  function persist(next) {
    setMyTemplates(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }

  function adicionar(tpl) {
    const cloned = {
      ...tpl,
      id: `mine_${Date.now()}`,
      sourceId: tpl.id,
      name: tpl.name,
      createdAt: new Date().toISOString(),
    };
    persist([cloned, ...myTemplates]);
    showToast(`"${tpl.name}" adicionado aos seus templates`);
    setTab('meus');
  }

  function duplicar(tpl) {
    const dup = { ...tpl, id: `mine_${Date.now()}`, name: `${tpl.name} (cópia)`, createdAt: new Date().toISOString() };
    persist([dup, ...myTemplates]);
    showToast('Template duplicado');
  }

  function excluir(id) {
    if (!confirm('Excluir este template?')) return;
    persist(myTemplates.filter((t) => t.id !== id));
    showToast('Template excluído');
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  const filtered = LIBRARY.filter((t) => {
    if (filter !== 'todos' && t.category !== filter) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-5 animate-fade-up">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg bg-success text-success-foreground shadow-card text-sm font-medium animate-fade-up">
          ✓ {toast}
        </div>
      )}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Criar Post</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Escolha um template para personalizar e adicionar à sua biblioteca.
          </p>
        </div>
        <div className="flex bg-muted rounded-lg p-1">
          <button onClick={() => setTab('meus')}
            className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-all ${
              tab === 'meus' ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground'
            }`}>
            Meus Templates ({myTemplates.length})
          </button>
          <button onClick={() => setTab('biblioteca')}
            className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-all ${
              tab === 'biblioteca' ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground'
            }`}>
            Biblioteca
          </button>
        </div>
      </div>

      {tab === 'biblioteca' && (
        <div className="flex items-center gap-2 flex-wrap">
          {CATEGORIES.map((c) => (
            <button key={c.key} onClick={() => setFilter(c.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                filter === c.key ? 'bg-primary text-primary-foreground shadow-soft' : 'bg-card border border-border text-foreground hover:bg-muted'
              }`}>
              {c.label}
            </button>
          ))}
          <div className="ml-auto relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar template..."
              className="bg-card border border-border rounded-md pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 w-64" />
          </div>
        </div>
      )}

      {tab === 'biblioteca' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map((tpl) => (
            <div key={tpl.id} className="bg-card border border-border rounded-xl shadow-soft hover:shadow-card transition-all overflow-hidden group">
              <div className="aspect-[9/16] bg-muted overflow-hidden">
                <TemplateThumb tpl={tpl} />
              </div>
              <div className="p-2 border-t border-border">
                <p className="text-xs font-medium text-foreground truncate">{tpl.name}</p>
              </div>
              <button onClick={() => adicionar(tpl)}
                className="w-full flex items-center justify-center gap-1.5 py-2 border-t border-border bg-card hover:bg-primary hover:text-primary-foreground transition-colors text-xs font-semibold">
                <Plus size={13} strokeWidth={2.5} />
                Adicionar
              </button>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-16 text-muted-foreground text-sm">
              Nenhum template encontrado.
            </div>
          )}
        </div>
      )}

      {tab === 'meus' && (
        <>
          {myTemplates.length === 0 ? (
            <div className="text-center py-20 bg-card border border-dashed border-border rounded-xl">
              <Layers size={36} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">Você ainda não tem templates salvos</p>
              <p className="text-xs text-muted-foreground mb-4">Adicione um da biblioteca para começar.</p>
              <button onClick={() => setTab('biblioteca')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
                <Plus size={14} /> Ir para a biblioteca
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {myTemplates.map((tpl) => (
                <div key={tpl.id} className="bg-card border border-border rounded-xl shadow-soft hover:shadow-card transition-all overflow-hidden">
                  <div className="aspect-[9/16] bg-muted overflow-hidden">
                    <TemplateThumb tpl={tpl} />
                  </div>
                  <div className="p-2 border-t border-border flex items-center justify-between gap-1">
                    <p className="text-xs font-medium text-foreground truncate flex-1">{tpl.name}</p>
                    <button onClick={() => duplicar(tpl)} className="p-1 hover:bg-muted rounded text-muted-foreground" title="Duplicar"><Copy size={12} /></button>
                    <button onClick={() => excluir(tpl.id)} className="p-1 hover:bg-destructive/10 hover:text-destructive rounded text-muted-foreground" title="Excluir"><Trash2 size={12} /></button>
                  </div>
                  <div className="grid grid-cols-2 border-t border-border divide-x divide-border">
                    <Link href={`/editor?id=${tpl.id}`}
                      className="flex items-center justify-center gap-1 py-2 text-xs font-semibold hover:bg-muted">
                      <Edit3 size={12} /> Editar
                    </Link>
                    <Link href={`/editor?id=${tpl.id}&action=create`}
                      className="flex items-center justify-center gap-1 py-2 text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90">
                      Criar Post
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
