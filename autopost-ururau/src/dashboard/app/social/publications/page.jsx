'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Send, PlusCircle, ExternalLink, Filter } from 'lucide-react';

const KEY = 'ururau-publications-v1';

function formatDate(d) {
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function PublicationsPage() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch {}
  }, []);

  const filtered = filter === 'all' ? items : items.filter((i) => i.platform === filter);

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Publicações</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Todos os posts publicados nas redes</p>
        </div>
        <Link href="/templates"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
          <PlusCircle size={15} /> Nova publicação
        </Link>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={14} className="text-muted-foreground" />
        {[
          { key: 'all', label: 'Todas' },
          { key: 'instagram', label: 'Instagram' },
          { key: 'facebook', label: 'Facebook' },
          { key: 'twitter', label: 'X / Twitter' },
          { key: 'linkedin', label: 'LinkedIn' },
        ].map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              filter === f.key ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-24 bg-card border border-dashed border-border rounded-xl">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Send size={28} className="text-primary" strokeWidth={1.5} />
          </div>
          <p className="text-lg font-semibold mb-1">Nenhuma publicação ainda</p>
          <p className="text-sm text-muted-foreground mb-5">Crie e publique seu primeiro post nas redes sociais.</p>
          <Link href="/templates" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 shadow-soft">
            <PlusCircle size={16} /> Criar primeiro post
          </Link>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl shadow-soft divide-y divide-border">
          {filtered.map((p) => (
            <div key={p.id} className="flex items-center gap-4 p-4 hover:bg-muted/30">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Send size={16} className="text-success" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{p.title || 'Post publicado'}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="uppercase font-medium">{p.platform}</span> · {formatDate(p.publishedAt)}
                </p>
              </div>
              {p.url && (
                <a href={p.url} target="_blank" rel="noreferrer" className="p-2 hover:bg-muted rounded">
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
