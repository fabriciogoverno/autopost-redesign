'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { History, FileText, PlusCircle, Trash2 } from 'lucide-react';

const MY_TEMPLATES_KEY = 'ururau-my-templates-v1';
const HISTORY_KEY = 'ururau-history-v1';

function formatDate(d) {
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function HistoryPage() {
  const [items, setItems] = useState([]);
  const [publishedHistory, setPublishedHistory] = useState([]);

  useEffect(() => {
    try {
      const t = JSON.parse(localStorage.getItem(MY_TEMPLATES_KEY) || '[]');
      setItems(t);
      const h = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      setPublishedHistory(h);
    } catch {}
  }, []);

  function deleteItem(id) {
    if (!confirm('Excluir este post do histórico?')) return;
    const next = items.filter((it) => it.id !== id);
    setItems(next);
    try { localStorage.setItem(MY_TEMPLATES_KEY, JSON.stringify(next)); } catch {}
  }

  const totalPosts = items.length + publishedHistory.length;

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Histórico</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{totalPosts} {totalPosts === 1 ? 'post' : 'posts'}</p>
        </div>
        <Link href="/templates"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 shadow-soft">
          <PlusCircle size={15} /> Criar Post
        </Link>
      </div>

      {totalPosts === 0 ? (
        <div className="text-center py-24 bg-card border border-dashed border-border rounded-xl">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <FileText size={28} className="text-primary" strokeWidth={1.5} />
          </div>
          <p className="text-lg font-semibold text-foreground mb-1">Nenhum post ainda</p>
          <p className="text-sm text-muted-foreground mb-5">Crie seu primeiro post para começar a divulgar suas notícias</p>
          <Link href="/templates"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 shadow-soft">
            <PlusCircle size={16} /> Criar primeiro post
          </Link>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl shadow-soft divide-y divide-border">
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: it.accent ? `${it.accent}20` : 'hsl(var(--muted))' }}>
                <FileText size={20} style={{ color: it.accent || 'hsl(var(--muted-foreground))' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{it.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {it.category && <span className="uppercase font-medium mr-2">{it.category}</span>}
                  Criado em {formatDate(it.createdAt)}
                </p>
              </div>
              <Link href={`/editor?id=${it.id}`}
                className="px-3 py-1.5 rounded-md bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20">Editar</Link>
              <button onClick={() => deleteItem(it.id)}
                className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-md text-muted-foreground">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {publishedHistory.map((p) => (
            <div key={p.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                <History size={20} className="text-success" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{p.title || 'Post publicado'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Publicado em {formatDate(p.publishedAt)}</p>
              </div>
              <span className="px-2 py-1 rounded text-[10px] font-bold bg-success/10 text-success border border-success/20">PUBLICADO</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
