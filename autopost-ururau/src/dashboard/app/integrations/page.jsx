'use client';

import { useState, useEffect } from 'react';
import { Link2, Plus, Trash2, ExternalLink, Globe, Rss } from 'lucide-react';

const STORAGE_KEY = 'ururau-integrations-v1';

const INTEGRATION_TYPES = [
  { id: 'site', label: 'Site de notícias', icon: Globe, hint: 'Extrai conteúdo por URL de matérias individuais' },
  { id: 'rss', label: 'Feed RSS', icon: Rss, hint: 'Monitora um feed RSS e cria posts automaticamente' },
];

export default function IntegrationsPage() {
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'site', name: '', url: '' });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      setItems(stored);
    } catch {}
  }, []);

  function persist(next) {
    setItems(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }

  function add() {
    if (!form.name || !form.url) return;
    const next = [{ id: `int_${Date.now()}`, ...form, createdAt: new Date().toISOString() }, ...items];
    persist(next);
    setForm({ type: 'site', name: '', url: '' });
    setShowForm(false);
    showToast('Integração criada');
  }

  function remove(id) {
    if (!confirm('Remover integração?')) return;
    persist(items.filter((i) => i.id !== id));
    showToast('Integração removida');
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  return (
    <div className="space-y-5 animate-fade-up">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg bg-success text-success-foreground shadow-card text-sm font-medium animate-fade-up">
          ✓ {toast}
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Integrações</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Configure integrações para extração automática de conteúdo</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 shadow-soft">
          <Plus size={15} /> Adicionar
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl shadow-soft p-5 space-y-3">
          <h3 className="text-sm font-semibold">Nova integração</h3>
          <div className="grid grid-cols-2 gap-2">
            {INTEGRATION_TYPES.map((t) => {
              const Icon = t.icon;
              const active = form.type === t.id;
              return (
                <button key={t.id} onClick={() => setForm({ ...form, type: t.id })}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    active ? 'bg-primary/10 border-primary/40' : 'bg-muted/30 border-border hover:bg-muted/60'
                  }`}>
                  <Icon size={16} className={active ? 'text-primary' : 'text-muted-foreground'} />
                  <p className="text-sm font-semibold mt-1">{t.label}</p>
                  <p className="text-[11px] text-muted-foreground">{t.hint}</p>
                </button>
              );
            })}
          </div>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nome da integração (ex.: G1 Rio)"
            className="w-full bg-muted border border-transparent focus:bg-background focus:border-primary rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          <input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder={form.type === 'rss' ? 'https://exemplo.com/feed.xml' : 'https://www.exemplo.com.br'}
            className="w-full bg-muted border border-transparent focus:bg-background focus:border-primary rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          <div className="flex items-center gap-2 pt-1">
            <button onClick={add} disabled={!form.name || !form.url}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50">
              Criar
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-md bg-muted text-foreground text-sm font-medium">Cancelar</button>
          </div>
        </div>
      )}

      {items.length === 0 && !showForm ? (
        <div className="text-center py-24 bg-card border border-dashed border-border rounded-xl">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Link2 size={28} className="text-primary" strokeWidth={1.5} />
          </div>
          <p className="text-lg font-semibold text-foreground mb-1">Nenhuma integração configurada</p>
          <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">Crie uma integração para extrair automaticamente conteúdo de sites de notícias e outras fontes.</p>
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 shadow-soft">
            <Plus size={16} /> Criar Primeira Integração
          </button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl shadow-soft divide-y divide-border">
          {items.map((it) => {
            const T = INTEGRATION_TYPES.find((t) => t.id === it.type) || INTEGRATION_TYPES[0];
            const Icon = T.icon;
            return (
              <div key={it.id} className="flex items-center gap-4 p-4 hover:bg-muted/30">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{it.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{it.url}</p>
                </div>
                <a href={it.url} target="_blank" rel="noreferrer" className="p-2 hover:bg-muted rounded text-muted-foreground">
                  <ExternalLink size={14} />
                </a>
                <button onClick={() => remove(it.id)}
                  className="p-2 hover:bg-destructive/10 hover:text-destructive rounded text-muted-foreground">
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
