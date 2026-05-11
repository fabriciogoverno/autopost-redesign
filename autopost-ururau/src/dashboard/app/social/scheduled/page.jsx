'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, RefreshCw, PlusCircle, Clock, X } from 'lucide-react';

const KEY = 'ururau-scheduled-v1';

function formatDate(d) {
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function ScheduledPage() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    try { setItems(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch {}
  }

  function cancel(id) {
    if (!confirm('Cancelar este agendamento?')) return;
    const next = items.filter((i) => i.id !== id);
    setItems(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  }

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Agendados</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Posts agendados para publicação automática</p>
        </div>
        <button onClick={refresh}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border text-sm font-semibold hover:bg-muted">
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-24 bg-card border border-dashed border-border rounded-xl">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Calendar size={28} className="text-primary" strokeWidth={1.5} />
          </div>
          <p className="text-lg font-semibold mb-1">Nenhum post agendado</p>
          <p className="text-sm text-muted-foreground mb-5">Quando você agendar uma publicação, ela aparecerá aqui.</p>
          <Link href="/templates" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 shadow-soft">
            <PlusCircle size={16} /> Agendar publicação
          </Link>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl shadow-soft divide-y divide-border">
          {items.map((s) => (
            <div key={s.id} className="flex items-center gap-4 p-4 hover:bg-muted/30">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Clock size={20} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{s.title}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="uppercase font-medium">{(s.platforms || []).join(', ')}</span> · {formatDate(s.scheduledFor)}
                </p>
              </div>
              <button onClick={() => cancel(s.id)} className="p-2 hover:bg-destructive/10 hover:text-destructive rounded">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
