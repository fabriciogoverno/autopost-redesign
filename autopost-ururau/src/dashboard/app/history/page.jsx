'use client';
import { useState, useEffect } from 'react';
import { History, Image as ImgIcon } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function HistoryPage() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('ururau-my-templates-v1') || '[]');
      setItems(stored);
    } catch {}
  }, []);
  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Histórico</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Templates criados e posts publicados</p>
      </div>
      {items.length === 0 ? (
        <div className="text-center py-20 bg-card border border-dashed border-border rounded-xl">
          <History size={36} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium">Nenhum item no histórico ainda</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl shadow-soft divide-y divide-border">
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-4 p-4 hover:bg-muted/40">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><ImgIcon size={18} /></div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{it.name}</p>
                <p className="text-xs text-muted-foreground">Criado em {formatDate(it.createdAt)}</p>
              </div>
              <a href={`/editor?id=${it.id}`} className="px-3 py-1.5 rounded bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20">Editar</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
