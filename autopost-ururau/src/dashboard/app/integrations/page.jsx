'use client';

import { useState } from 'react';
import { Link2, FileText, List, Rss, Code, X, Sparkles, Clipboard } from 'lucide-react';

const TYPES = [
  { id: 'extract', icon: FileText, color: 'bg-blue-500', label: 'Extrair conteúdo da notícia', desc: 'Captura o conteúdo completo de uma notícia através do link.' },
  { id: 'list',    icon: List,     color: 'bg-purple-500', label: 'Buscar últimas notícias da página', desc: 'Extraia uma lista de notícias de uma página específica.' },
  { id: 'rss',     icon: Rss,      color: 'bg-orange-500', label: 'Buscar últimas notícias via RSS/Atom', desc: 'Conecte um feed RSS ou Atom para buscar notícias automaticamente.' },
  { id: 'custom',  icon: Code,     color: 'bg-gray-700', label: 'Extrair conteúdo personalizado do site', desc: 'Escolha quais informações você deseja extrair do seu site.' },
];

export default function IntegrationsPage() {
  const [modal, setModal] = useState(null);
  const [url, setUrl] = useState('');
  const [step, setStep] = useState(1);

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Integrações</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Configure integrações para extração automática de conteúdo</p>
        </div>
        <button onClick={() => setModal('chooser')} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
          <span>+</span> Adicionar
        </button>
      </div>

      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-4">
          <Link2 size={28} className="text-primary" />
        </div>
        <h2 className="text-base font-semibold text-foreground">Nenhuma integração configurada</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">Crie uma integração para extrair automaticamente conteúdo de sites de notícias e outras fontes.</p>
        <button onClick={() => setModal('chooser')} className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
          <span>+</span> Criar Primeira Integração
        </button>
      </div>

      {modal === 'chooser' && (
        <Modal onClose={() => setModal(null)}>
          <h2 className="text-lg font-bold mb-4">Escolha o tipo de integração</h2>
          <div className="space-y-3">
            {TYPES.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => { setModal(t.id); setStep(1); }} className="w-full p-4 rounded-lg border border-border hover:bg-muted/30 flex items-center gap-4 text-left transition-colors">
                  <div className={`w-12 h-12 rounded-lg ${t.color} flex items-center justify-center text-white shrink-0`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{t.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">0/1</span>
                </button>
              );
            })}
          </div>
        </Modal>
      )}

      {modal === 'extract' && (
        <Modal onClose={() => setModal(null)}>
          <div className="flex items-center justify-center gap-2 mb-6">
            <Step n={1} active={step >= 1} label="Cole URL" />
            <div className="w-12 h-px border-t border-dashed border-border" />
            <Step n={2} active={step >= 2} label="Preview" />
            <div className="w-12 h-px border-t border-dashed border-border" />
            <Step n={3} active={step >= 3} label="Conectado!" />
          </div>
          <div className="flex justify-center mb-4"><FileText size={40} className="text-primary" /></div>
          <h3 className="text-center font-bold text-lg">Vamos conectar seu site?</h3>
          <p className="text-center text-sm text-muted-foreground mb-4">Cole um link de notícia do seu site.</p>
          <div className="relative">
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://seusite.com/noticias/exemplo" className="w-full bg-muted/30 border border-border rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-muted rounded"><Clipboard size={14} /></button>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">Vamos analisar o conteúdo com IA e extrair as informações automaticamente.</p>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-lg border border-border hover:bg-muted/30 text-sm font-medium">Cancelar</button>
            <button className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 flex items-center justify-center gap-2">
              <Sparkles size={14} /> Analisar com IA
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-xl p-6 max-w-xl w-full relative">
        <button onClick={onClose} className="absolute top-3 right-3 p-1 hover:bg-muted rounded-full"><X size={16} /></button>
        {children}
      </div>
    </div>
  );
}

function Step({ n, active, label }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${active ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>{n}</div>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
