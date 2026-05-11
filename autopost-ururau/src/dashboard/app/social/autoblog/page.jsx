'use client';

import { useState, useEffect } from 'react';
import { Rss, Plus, Trash2, Instagram, Facebook, Twitter, Linkedin, MessageSquare, Zap } from 'lucide-react';

const KEY = 'ururau-autoblog-v1';

export default function AutoblogPage() {
  const [config, setConfig] = useState({ feeds: [], enabled: false, schedule: ['07:00', '12:00', '18:00'] });
  const [feedUrl, setFeedUrl] = useState('');
  const [feedName, setFeedName] = useState('');

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(KEY) || '{}');
      setConfig({ feeds: stored.feeds || [], enabled: !!stored.enabled, schedule: stored.schedule || ['07:00', '12:00', '18:00'] });
    } catch {}
  }, []);

  function persist(next) {
    setConfig(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  }

  function addFeed() {
    if (!feedUrl || !feedName) return;
    persist({ ...config, feeds: [{ id: `f_${Date.now()}`, name: feedName, url: feedUrl, createdAt: new Date().toISOString() }, ...config.feeds] });
    setFeedUrl(''); setFeedName('');
  }

  function removeFeed(id) {
    persist({ ...config, feeds: config.feeds.filter((f) => f.id !== id) });
  }

  function toggleEnabled() {
    persist({ ...config, enabled: !config.enabled });
  }

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Autoblog 24/7</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Publique no piloto automático a partir de feeds RSS</p>
      </div>

      {config.feeds.length === 0 ? (
        <div className="text-center py-16 bg-card border border-dashed border-border rounded-xl">
          <div className="relative inline-block mb-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Rss size={32} className="text-primary" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[#E1306C] flex items-center justify-center text-white"><Instagram size={14} /></div>
            <div className="absolute -bottom-2 -right-3 w-7 h-7 rounded-full bg-[#1877F2] flex items-center justify-center text-white"><Facebook size={12} /></div>
            <div className="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-black flex items-center justify-center text-white"><Twitter size={12} /></div>
            <div className="absolute -bottom-2 -left-3 w-7 h-7 rounded-full bg-[#0A66C2] flex items-center justify-center text-white"><Linkedin size={12} /></div>
          </div>
          <p className="text-lg font-semibold mb-1">Publique no piloto automático</p>
          <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">Conecte seu feed RSS e deixe o Autoblog criar e publicar artes automaticamente sempre que uma nova notícia sair.</p>
        </div>
      ) : null}

      {/* Form de adicionar feed */}
      <div className="bg-card border border-border rounded-xl shadow-soft p-5 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Rss size={14} /> Conectar Feed RSS</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input type="text" value={feedName} onChange={(e) => setFeedName(e.target.value)}
            placeholder="Nome do feed (ex.: Ururau Últimas)"
            className="bg-muted border border-transparent focus:bg-background focus:border-primary rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          <input type="url" value={feedUrl} onChange={(e) => setFeedUrl(e.target.value)}
            placeholder="https://www.ururau.com.br/feed.xml"
            className="bg-muted border border-transparent focus:bg-background focus:border-primary rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <button onClick={addFeed} disabled={!feedName || !feedUrl}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50">
          <Plus size={14} /> Adicionar feed
        </button>
      </div>

      {/* Feeds existentes */}
      {config.feeds.length > 0 && (
        <div className="bg-card border border-border rounded-xl shadow-soft divide-y divide-border">
          {config.feeds.map((f) => (
            <div key={f.id} className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Rss size={16} className="text-primary" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{f.name}</p>
                <p className="text-xs text-muted-foreground truncate">{f.url}</p>
              </div>
              <button onClick={() => removeFeed(f.id)} className="p-2 hover:bg-destructive/10 hover:text-destructive rounded">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Configurações do Autoblog */}
      {config.feeds.length > 0 && (
        <div className="bg-card border border-border rounded-xl shadow-soft p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2"><Zap size={14} className="text-primary" /> Autoblog automático</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Quando ativo, publica novas notícias dos feeds nos horários programados</p>
            </div>
            <button onClick={toggleEnabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.enabled ? 'bg-success' : 'bg-muted-foreground/30'
              }`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition shadow ${config.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Horários de publicação</p>
            <div className="flex flex-wrap gap-2">
              {config.schedule.map((time) => (
                <span key={time} className="px-3 py-1.5 rounded-md bg-primary/10 text-primary text-xs font-semibold">{time}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
