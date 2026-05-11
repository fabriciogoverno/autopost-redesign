'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Layers, Edit3, Copy, Trash2, MoreVertical, Maximize2, Search } from 'lucide-react';

const STORAGE_KEY = 'ururau-my-templates-v1';

const LIBRARY = [
  { id: 'tpl_news_01',     name: 'Notícia Esporte',         category: 'noticia',  accent: '#2A9D8F' },
  { id: 'tpl_news_02',     name: 'Notícia Política',         category: 'noticia',  accent: '#1D3557' },
  { id: 'tpl_news_03',     name: 'Notícia Segurança',        category: 'noticia',  accent: '#E9C46A' },
  { id: 'tpl_news_04',     name: 'Notícia Economia',         category: 'noticia',  accent: '#F4A261' },
  { id: 'tpl_news_05',     name: 'Notícia Geral',            category: 'noticia',  accent: '#6C757D' },
  { id: 'tpl_news_06',     name: 'Notícia Opinião',          category: 'noticia',  accent: '#E63946' },
  { id: 'tpl_news_07',     name: 'Notícia Internacional',    category: 'noticia',  accent: '#4361EE' },
  { id: 'tpl_news_08',     name: 'Notícia Saúde',            category: 'noticia',  accent: '#06A77D' },
  { id: 'tpl_news_09',     name: 'Notícia Educação',         category: 'noticia',  accent: '#7209B7' },
  { id: 'tpl_news_10',     name: 'Notícia Cultura',          category: 'noticia',  accent: '#F72585' },
  { id: 'tpl_pesar_01',    name: 'Nota de Pesar — Sóbria',   category: 'pesar',    accent: '#1F1F1F' },
  { id: 'tpl_pesar_02',    name: 'Nota de Pesar — Clara',    category: 'pesar',    accent: '#374151' },
];

function TemplateThumb({ tpl }) {
  if (tpl.thumb) {
    return <img src={tpl.thumb} alt={tpl.name} className="w-full h-full object-cover block" />;
  }
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
  const [tab, setTab] = useState('meus');
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
    const cloned = { ...tpl, id: `mine_${Date.now()}`, sourceId: tpl.id, createdAt: new Date().toISOString() };
    persist([cloned, ...myTemplates]);
    showToast(`"${tpl.name}" adicionado`);
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

  return (
    <div className="space-y-5 animate-fade-up">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg bg-success text-success-foreground shadow-card text-sm font-medium animate-fade-up">
          ✓ {toast}
        </div>
      )}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Criar Post</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Selecione um template para criar sua arte</p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => setTab('meus')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              tab === 'meus' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}>
            Meus Templates ({myTemplates.length})
          </button>
          <button onClick={() => setTab('biblioteca')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              tab === 'biblioteca' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}>
            Biblioteca
          </button>
        </div>
      </div>

      {tab === 'meus' && myTemplates.length === 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          <Link href="/editor"
            className="aspect-[9/16] bg-white border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-center p-4 hover:border-primary hover:bg-blue-50/50 transition-colors">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-2">
              <Plus size={20} className="text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">Criar template</p>
            <p className="text-xs text-muted-foreground mt-1">Do zero no editor</p>
          </Link>
        </div>
      )}

      {tab === 'meus' && myTemplates.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {myTemplates.map((tpl) => (
            <div key={tpl.id} className="bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all overflow-hidden group">
              <div className="aspect-[9/16] bg-gray-50 overflow-hidden relative">
                <TemplateThumb tpl={tpl} />
                <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => duplicar(tpl)} className="w-7 h-7 rounded bg-white shadow-sm hover:bg-gray-50 flex items-center justify-center" title="Mais opções">
                    <MoreVertical size={13} />
                  </button>
                  <button className="w-7 h-7 rounded bg-white shadow-sm hover:bg-gray-50 flex items-center justify-center" title="Expandir">
                    <Maximize2 size={12} />
                  </button>
                </div>
              </div>
              <div className="p-3 border-t border-gray-100">
                <p className="text-sm font-medium text-foreground truncate">{tpl.name}</p>
              </div>
              <div className="grid grid-cols-2 border-t border-gray-100 divide-x divide-gray-100">
                <Link href={`/editor?id=${tpl.id}`}
                  className="flex items-center justify-center py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">
                  Editar
                </Link>
                <Link href={`/editor?id=${tpl.id}&action=create`}
                  className="flex items-center justify-center py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">
                  Criar
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'biblioteca' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {LIBRARY.map((tpl) => (
            <div key={tpl.id} className="bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all overflow-hidden">
              <div className="aspect-[9/16] bg-gray-50 overflow-hidden">
                <TemplateThumb tpl={tpl} />
              </div>
              <div className="p-3 border-t border-gray-100">
                <p className="text-sm font-medium text-foreground truncate">{tpl.name}</p>
              </div>
              <button onClick={() => adicionar(tpl)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 border-t border-gray-100 hover:bg-gray-50 transition-colors text-sm font-medium">
                <Plus size={13} /> Adicionar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
