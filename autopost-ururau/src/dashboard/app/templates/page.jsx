'use client';

import { useState } from 'react';
import { Save, Eye, Download, Check } from 'lucide-react';

const defaultTemplate = {
  id: 'ururau-reels',
  name: 'Ururau Reels',
  dimensions: { width: 1080, height: 1920 },
  colors: {
    background: '#0a0a1a', overlayFrom: 'rgba(10,10,30,0.15)', overlayTo: 'rgba(5,3,25,0.88)',
    badge: '#E63946', line: '#C11F25', title: '#FFFFFF', summary: '#E0E0E0', gold: '#FFD700',
  },
  fonts: {
    title: { family: 'Montserrat', size: 58, weight: 'bold' },
    summary: { family: 'Inter', size: 28, weight: 'regular' },
  },
};

export default function TemplatesPage() {
  const [template, setTemplate] = useState(defaultTemplate);
  const [previewTitle, setPreviewTitle] = useState('A maldição da legislação eleitoral no Brasil');
  const [previewSummary, setPreviewSummary] = useState('Show em Copacabana mostra como a lei eleitoral convive com distorções...');
  const [saved, setSaved] = useState(false);

  const updateColor = (key, value) => { setTemplate(p => ({ ...p, colors: { ...p.colors, [key]: value } })); setSaved(false); };
  const updateFont = (section, key, value) => { setTemplate(p => ({ ...p, fonts: { ...p.fonts, [section]: { ...p.fonts[section], [key]: value } } })); setSaved(false); };
  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const templates = [
    { id: 'ururau-reels', label: 'Ururau Reels', size: '1080×1920', ratio: '9:16', active: true },
    { id: 'ururau-classic', label: 'Ururau Classic', size: '1080×1080', ratio: '1:1' },
    { id: 'ururau-light', label: 'Ururau Light', size: '1200×630', ratio: '16:9' },
    { id: 'ururau-breaking', label: 'Ururau Breaking', size: '1080×1920', ratio: '9:16' },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Templates</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Edite a identidade visual e o estilo das artes geradas</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground hover:bg-muted transition-colors">
            <Download size={15} /> Exportar JSON
          </button>
          <button onClick={handleSave}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all shadow-soft ${
              saved ? 'bg-success text-success-foreground' : 'bg-primary text-primary-foreground hover:opacity-90'
            }`}>
            {saved ? <Check size={15} strokeWidth={2.5} /> : <Save size={15} strokeWidth={2.5} />}
            {saved ? 'Salvo!' : 'Salvar Template'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-card border border-border rounded-xl shadow-soft p-6">
            <h3 className="text-base font-semibold text-foreground mb-1">Cores do Template</h3>
            <p className="text-xs text-muted-foreground mb-4">Defina a paleta usada nas artes</p>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(template.colors).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs text-muted-foreground capitalize font-medium">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={value.startsWith('#') ? value : '#E63946'} onChange={e => updateColor(key, e.target.value)}
                      className="w-9 h-9 rounded-md border border-border bg-transparent cursor-pointer" />
                    <input type="text" value={value} onChange={e => updateColor(key, e.target.value)}
                      className="flex-1 bg-muted border border-transparent focus:bg-background focus:border-primary rounded-md px-2.5 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-soft p-6">
            <h3 className="text-base font-semibold text-foreground mb-1">Tipografia</h3>
            <p className="text-xs text-muted-foreground mb-4">Famílias, tamanhos e pesos das fontes</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 block">Família do título</label>
                <input type="text" value={template.fonts.title.family} onChange={e => updateFont('title', 'family', e.target.value)}
                  className="w-full bg-muted border border-transparent focus:bg-background focus:border-primary rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1 block">Tamanho</label>
                  <input type="number" value={template.fonts.title.size} onChange={e => updateFont('title', 'size', parseInt(e.target.value))}
                    className="w-full bg-muted border border-transparent focus:bg-background focus:border-primary rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1 block">Peso</label>
                  <select value={template.fonts.title.weight} onChange={e => updateFont('title', 'weight', e.target.value)}
                    className="w-full bg-muted border border-transparent focus:bg-background focus:border-primary rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option>normal</option><option>bold</option><option>600</option><option>800</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-soft p-6">
            <h3 className="text-base font-semibold text-foreground mb-1">Texto de Preview</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 block">Título de teste</label>
                <input type="text" value={previewTitle} onChange={e => setPreviewTitle(e.target.value)}
                  className="w-full bg-muted border border-transparent focus:bg-background focus:border-primary rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 block">Resumo de teste</label>
                <textarea value={previewSummary} onChange={e => setPreviewSummary(e.target.value)} rows={3}
                  className="w-full bg-muted border border-transparent focus:bg-background focus:border-primary rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-card border border-border rounded-xl shadow-soft p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground">Preview</h3>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted px-2 py-1 rounded">
                <Eye size={11} /> {template.dimensions.width} × {template.dimensions.height}
              </div>
            </div>
            <div className="relative mx-auto rounded-lg overflow-hidden shadow-lg" style={{ width: 240, height: 426, backgroundColor: template.colors.background }}>
              <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, ${template.colors.overlayFrom}, ${template.colors.overlayTo})` }} />
              <div className="absolute top-3 left-3">
                <p className="font-bold text-white text-sm tracking-wider">ururau</p>
                <p className="text-[9px]" style={{ color: template.colors.gold, letterSpacing: '0.15em' }}>19 ANOS</p>
              </div>
              <div className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-xs"
                style={{ backgroundColor: template.colors.badge, border: '2px solid white' }}>U</div>
              <div className="absolute bottom-44 left-3 px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ backgroundColor: template.colors.badge }}>OPINIÃO</div>
              <div className="absolute bottom-28 left-3 right-3">
                <p className="font-bold text-white leading-tight" style={{ fontSize: 14, fontFamily: template.fonts.title.family }}>{previewTitle}</p>
                <div className="mt-1.5 w-10 h-0.5 rounded" style={{ backgroundColor: template.colors.line }} />
              </div>
              <div className="absolute bottom-10 left-3 right-3">
                <p className="text-[10px] leading-relaxed" style={{ color: template.colors.summary, fontFamily: template.fonts.summary.family }}>{previewSummary}</p>
              </div>
              <div className="absolute bottom-2 left-3"><p className="text-[7px] text-white/40 tracking-widest">URURAU.COM.BR</p></div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-soft p-6">
            <h3 className="text-base font-semibold text-foreground mb-1">Templates Disponíveis</h3>
            <p className="text-xs text-muted-foreground mb-4">{templates.length} modelos cadastrados</p>
            <div className="space-y-2">
              {templates.map(t => (
                <div key={t.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                  t.active ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20' : 'bg-muted/30 border-border hover:bg-muted/60'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-md bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-sm font-bold">{t.label.charAt(0)}</div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{t.label}</p>
                      <p className="text-[11px] text-muted-foreground">{t.size} · {t.ratio}</p>
                    </div>
                  </div>
                  {t.active ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-success/10 text-success border border-success/20">ATIVO</span>
                  ) : (
                    <button className="text-[11px] text-primary font-semibold hover:underline">Usar</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
