'use client';

import { useState, useEffect } from 'react';
import { Instagram, Facebook, Twitter, Linkedin, ExternalLink, Check } from 'lucide-react';

const STORAGE_KEY = 'ururau-social-accounts-v1';

const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: '#E1306C', desc: 'Publique fotos e stories diretamente' },
  { id: 'facebook',  name: 'Facebook',  icon: Facebook,  color: '#1877F2', desc: 'Compartilhe em suas páginas' },
  { id: 'twitter',   name: 'X / Twitter', icon: Twitter, color: '#000000', desc: 'Publique tweets com suas artes' },
  { id: 'threads',   name: 'Threads', icon: null, color: '#000000', desc: 'Compartilhe no Threads da Meta', emoji: '🧵' },
  { id: 'linkedin',  name: 'LinkedIn', icon: Linkedin, color: '#0A66C2', desc: 'Publique em perfis e páginas' },
  { id: 'tiktok',    name: 'TikTok', icon: null, color: '#000000', desc: 'Publique vídeos e fotos no TikTok', emoji: '🎵' },
];

export default function SocialAccountsPage() {
  const [accounts, setAccounts] = useState({});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      setAccounts(stored);
    } catch {}
  }, []);

  function toggleConnect(id) {
    const next = { ...accounts };
    if (next[id]) {
      if (!confirm('Desconectar esta conta?')) return;
      delete next[id];
    } else {
      // Em produção, abre OAuth. Por enquanto, marca como conectado.
      next[id] = { connectedAt: new Date().toISOString(), username: `@ururau_${id}` };
    }
    setAccounts(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Contas Conectadas</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Conecte suas contas para publicar diretamente nas redes sociais</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PLATFORMS.map((p) => {
          const Icon = p.icon;
          const connected = !!accounts[p.id];
          return (
            <div key={p.id} className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
              <div className="p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl shrink-0"
                  style={{ background: p.color }}>
                  {Icon ? <Icon size={22} /> : <span>{p.emoji}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{p.name}</p>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      connected ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                    }`}>
                      {connected ? 'Conectado' : 'Desconectado'}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{p.desc}</p>
                  {connected && <p className="text-[10px] text-muted-foreground mt-0.5">{accounts[p.id].username}</p>}
                </div>
              </div>
              <button onClick={() => toggleConnect(p.id)}
                className={`w-full flex items-center justify-center gap-1.5 py-2.5 border-t border-border text-xs font-semibold transition-colors ${
                  connected ? 'hover:bg-destructive/10 text-destructive' : 'hover:bg-muted text-foreground'
                }`}>
                {connected ? <>Desconectar</> : <><ExternalLink size={12} /> Conectar {p.name}</>}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
