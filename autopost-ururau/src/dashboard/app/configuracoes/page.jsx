'use client';

import { useState } from 'react';
import { Save, Check, Shield, Clock, Image as ImgIcon, MessageSquare, Bot, Plug } from 'lucide-react';

export default function ConfigPage() {
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [autoblog, setAutoblog] = useState(true);

  const tabs = [
    { id: 'general',   label: 'Geral',          icon: Shield },
    { id: 'autoblog',  label: 'Autoblog',       icon: Clock },
    { id: 'platforms', label: 'Plataformas',    icon: ImgIcon },
    { id: 'ai',        label: 'IA & Legendas',  icon: Bot },
    { id: 'whatsapp',  label: 'WhatsApp',       icon: MessageSquare },
  ];
  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Configurações</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie todas as opções do AutoPost Ururau</p>
        </div>
        <button onClick={handleSave}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all shadow-soft ${
            saved ? 'bg-success text-success-foreground' : 'bg-primary text-primary-foreground hover:opacity-90'
          }`}>
          {saved ? <Check size={15} strokeWidth={2.5} /> : <Save size={15} strokeWidth={2.5} />}
          {saved ? 'Salvo!' : 'Salvar Configurações'}
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
        <div className="flex flex-wrap gap-1 border-b border-border px-3 pt-3 bg-muted/30">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium rounded-t-lg transition-all border-b-2 -mb-px ${
                  active ? 'border-primary text-primary bg-card' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}>
                <Icon size={15} strokeWidth={2.5} /> {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {activeTab === 'general' && (
            <div className="space-y-5 max-w-3xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Timezone" hint="Fuso horário usado em todas as datas">
                  <select className="form-select"><option>America/Sao_Paulo</option><option>America/Rio_Branco</option><option>America/Fortaleza</option></select>
                </Field>
                <Field label="Limite de posts por dia" hint="Máximo de publicações em 24h"><input type="number" defaultValue={25} className="form-input" /></Field>
                <Field label="Limite por hora" hint="Throttle anti-spam"><input type="number" defaultValue={4} className="form-input" /></Field>
                <Field label="Template padrão" hint="Aplicado quando não especificado">
                  <select className="form-select"><option>ururau-reels</option><option>ururau-classic</option><option>ururau-light</option></select>
                </Field>
              </div>
            </div>
          )}

          {activeTab === 'autoblog' && (
            <div className="space-y-5 max-w-3xl">
              <Toggle title="Autoblog Ativo" subtitle="Publica automaticamente nos time slots configurados" value={autoblog} onChange={setAutoblog} />
              <Field label="Time slots" hint="Horários onde o autoblog é executado">
                <div className="flex flex-wrap gap-2">
                  {['07:00', '09:00', '12:00', '15:00', '18:00', '21:00'].map(time => (
                    <span key={time} className="px-3 py-1.5 rounded-md bg-primary/10 text-primary text-xs font-semibold border border-primary/20">{time}</span>
                  ))}
                  <button className="px-3 py-1.5 rounded-md bg-muted text-muted-foreground text-xs font-medium border border-dashed border-border hover:bg-muted/70">+ adicionar</button>
                </div>
              </Field>
              <Field label="Dias da semana" hint="Quando o autoblog roda">
                <div className="flex flex-wrap gap-2">
                  {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day, i) => (
                    <button key={day} className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${
                      i < 5 ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted text-muted-foreground border-border'
                    }`}>{day}</button>
                  ))}
                </div>
              </Field>
              <Field label="Keywords excluídas" hint="Notícias com essas palavras são descartadas"><input type="text" defaultValue="falecimento, luto, morte, obito" className="form-input" /></Field>
            </div>
          )}

          {activeTab === 'platforms' && (
            <div className="space-y-3 max-w-3xl">
              {[
                { name: 'Instagram', status: 'Não configurado', tone: 'warn' },
                { name: 'Facebook', status: 'Não configurado', tone: 'warn' },
                { name: 'Twitter/X', status: 'Não configurado', tone: 'warn' },
                { name: 'LinkedIn', status: 'Não configurado', tone: 'warn' },
                { name: 'WhatsApp', status: 'Conectado', tone: 'ok' },
              ].map(p => (
                <div key={p.name} className="flex items-center justify-between p-4 rounded-lg bg-muted/40 border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center"><Plug size={16} className="text-muted-foreground" /></div>
                    <div>
                      <p className="font-medium text-foreground">{p.name}</p>
                      <p className={`text-xs ${p.tone === 'ok' ? 'text-success' : 'text-warning'}`}>{p.status}</p>
                    </div>
                  </div>
                  <button className="px-3 py-1.5 rounded-md bg-card border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors">{p.tone === 'ok' ? 'Reconectar' : 'Configurar'}</button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-5 max-w-3xl">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/40 border border-border">
                <div>
                  <p className="font-medium text-foreground">Modelo Primário · Ollama (Local)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">llama3.2 · http://localhost:11434 · Zero custo</p>
                </div>
                <span className="px-2 py-1 rounded text-[11px] bg-success/10 text-success border border-success/20 font-semibold">Ativo</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/40 border border-border">
                <div>
                  <p className="font-medium text-foreground">Fallback · Gemini API</p>
                  <p className="text-xs text-muted-foreground mt-0.5">gemini-1.5-flash · Gratuito (60 req/min)</p>
                </div>
                <span className="px-2 py-1 rounded text-[11px] bg-warning/10 text-warning border border-warning/20 font-semibold">Standby</span>
              </div>
              <Field label="Temperatura da IA" hint="0 = conservador, 1 = criativo">
                <input type="range" min="0" max="1" step="0.1" defaultValue="0.7" className="w-full accent-primary" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>Conservador</span><span>Criativo</span></div>
              </Field>
            </div>
          )}

          {activeTab === 'whatsapp' && (
            <div className="space-y-5 max-w-3xl">
              <div className="flex items-center justify-between p-4 rounded-lg bg-success/5 border border-success/20">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-lg bg-success/15 flex items-center justify-center"><MessageSquare size={16} className="text-success" /></span>
                  <div>
                    <p className="font-medium text-foreground">Status da Conexão</p>
                    <p className="text-xs text-success">Conectado · Sessão persistente ativa</p>
                  </div>
                </div>
                <button className="px-3 py-1.5 rounded-md bg-card border border-border text-xs font-medium text-foreground hover:bg-muted">Reconectar</button>
              </div>
              <Field label="Canais configurados" hint="Newsletters/canais para envio">
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
                    <div>
                      <p className="text-sm font-medium text-foreground">Ururau Notícias</p>
                      <p className="text-[11px] text-muted-foreground font-mono">120363000000000000@newsletter</p>
                    </div>
                    <button className="text-destructive hover:bg-destructive/10 px-2 py-1 rounded text-xs font-medium">Remover</button>
                  </div>
                </div>
              </Field>
              <Field label="Grupos configurados" hint="Grupos do WhatsApp para envio">
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
                    <div>
                      <p className="text-sm font-medium text-foreground">Ururau Comunidade</p>
                      <p className="text-[11px] text-muted-foreground font-mono">5511999999999-1234567890@g.us</p>
                    </div>
                    <button className="text-destructive hover:bg-destructive/10 px-2 py-1 rounded text-xs font-medium">Remover</button>
                  </div>
                </div>
              </Field>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .form-input, .form-select {
          width: 100%; background-color: hsl(var(--muted)); border: 1px solid transparent;
          border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.875rem;
          color: hsl(var(--foreground)); transition: all 0.15s;
        }
        .form-input:focus, .form-select:focus {
          background-color: hsl(var(--background)); border-color: hsl(var(--primary));
          outline: none; box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2);
        }
      `}</style>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <div>
        <label className="text-sm font-medium text-foreground block">{label}</label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ title, subtitle, value, onChange }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/40 border border-border">
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <button onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? 'bg-success' : 'bg-muted-foreground/30'}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition shadow-soft ${value ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}
