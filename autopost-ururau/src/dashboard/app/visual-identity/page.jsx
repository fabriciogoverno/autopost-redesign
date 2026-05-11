'use client';

import { useState, useEffect } from 'react';
import { Upload, Check, AlertCircle } from 'lucide-react';

const STORAGE_KEY = 'ururau-visual-identity-v1';

const LOGO_SLOTS = [
  { id: 'light', label: 'Logo Fundo Claro', hint: 'Para fundos brancos ou claros', bg: '#FFFFFF' },
  { id: 'dark', label: 'Logo Fundo Escuro', hint: 'Para fundos pretos ou escuros', bg: 'linear-gradient(135deg, #1a1a1a 0%, #4a3a2a 100%)' },
  { id: 'colored', label: 'Logo Fundo Colorido', hint: 'Para usar com sua cor primária', bg: '#2563EB' },
];

export default function VisualIdentityPage() {
  const [identity, setIdentity] = useState({ logos: {}, primaryColor: '#2563EB' });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      setIdentity({ logos: stored.logos || {}, primaryColor: stored.primaryColor || '#2563EB' });
    } catch {}
  }, []);

  function persist(next) {
    setIdentity(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
    showToast('Identidade visual salva');
  }

  function uploadLogo(slot, file) {
    if (!file) return;
    const r = new FileReader();
    r.onload = (e) => {
      persist({ ...identity, logos: { ...identity.logos, [slot]: e.target.result } });
    };
    r.readAsDataURL(file);
  }

  function removeLogo(slot) {
    const newLogos = { ...identity.logos };
    delete newLogos[slot];
    persist({ ...identity, logos: newLogos });
  }

  function updateColor(color) {
    persist({ ...identity, primaryColor: color });
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg bg-success text-success-foreground shadow-card text-sm font-medium animate-fade-up">
          ✓ {toast}
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Identidade Visual</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Configure os logos e cores que serão utilizadas nos seus templates</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {LOGO_SLOTS.map((slot) => {
          const hasLogo = !!identity.logos[slot.id];
          return (
            <div key={slot.id} className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
              <label className="block cursor-pointer aspect-video relative overflow-hidden"
                style={{ background: slot.bg }}>
                {hasLogo ? (
                  <img src={identity.logos[slot.id]} alt={slot.label}
                    className="absolute inset-0 w-full h-full object-contain p-6" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/90">
                    <Upload size={28} strokeWidth={1.5} />
                    <span className="text-xs font-medium mt-2">Clique para enviar</span>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => e.target.files[0] && uploadLogo(slot.id, e.target.files[0])} />
              </label>
              <div className="p-3 border-t border-border flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{slot.label}</p>
                  <p className="text-[11px] text-muted-foreground">{slot.hint}</p>
                </div>
                {hasLogo && (
                  <button onClick={() => removeLogo(slot.id)}
                    className="text-[11px] text-destructive hover:underline">Remover</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-card border border-border rounded-xl shadow-soft p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Cor Primária</h3>
        <div className="flex items-center gap-3">
          <input type="color" value={identity.primaryColor}
            onChange={(e) => updateColor(e.target.value)}
            className="w-12 h-12 rounded-lg border border-border cursor-pointer p-1" />
          <input type="text" value={identity.primaryColor}
            onChange={(e) => updateColor(e.target.value)}
            className="bg-muted border border-transparent focus:bg-background focus:border-primary rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 w-40" />
          <span className="text-xs text-muted-foreground">Esta cor aparece nos badges e elementos do template</span>
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-xs text-muted-foreground flex items-start gap-2">
        <AlertCircle size={14} className="text-primary shrink-0 mt-0.5" />
        <p>Sua identidade visual fica salva no navegador (localStorage) e é aplicada automaticamente nos templates do editor.</p>
      </div>
    </div>
  );
}
