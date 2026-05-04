'use client';

import { Play, Pause, RotateCcw, Plus, FileText, ArrowRight } from 'lucide-react';

export function QuickActions() {
  const actions = [
    { icon: Play, label: 'Executar Autoblog Agora', primary: true },
    { icon: Plus, label: 'Nova Publicação Manual' },
    { icon: Pause, label: 'Pausar Autoblog' },
    { icon: RotateCcw, label: 'Rollback Último Post' },
    { icon: FileText, label: 'Gerar Relatório PDF' },
  ];
  const status = [
    { name: 'Autoblog', value: 'Ativo', color: 'text-success', dot: 'bg-success' },
    { name: 'WhatsApp', value: 'Conectado', color: 'text-success', dot: 'bg-success' },
    { name: 'Instagram', value: 'Não config.', color: 'text-warning', dot: 'bg-warning' },
    { name: 'Facebook', value: 'Não config.', color: 'text-warning', dot: 'bg-warning' },
  ];

  return (
    <div className="bg-card border border-border rounded-xl shadow-soft p-6">
      <h3 className="text-base font-semibold text-foreground mb-1">Ações Rápidas</h3>
      <p className="text-xs text-muted-foreground mb-5">Atalhos para tarefas comuns</p>
      <div className="space-y-2">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button key={a.label}
              className={a.primary
                ? 'w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shadow-soft'
                : 'w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-muted/50 hover:bg-muted text-foreground text-sm font-medium border border-transparent hover:border-border transition-all'
              }>
              <span className="flex items-center gap-2.5">
                <Icon size={15} strokeWidth={2.5} />
                {a.label}
              </span>
              <ArrowRight size={14} className="opacity-60" />
            </button>
          );
        })}
      </div>
      <div className="mt-6 pt-5 border-t border-border">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Status do Sistema</p>
        <div className="space-y-2.5">
          {status.map((s) => (
            <div key={s.name} className="flex items-center justify-between text-xs">
              <span className="text-foreground font-medium flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                {s.name}
              </span>
              <span className={`${s.color} font-semibold`}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
