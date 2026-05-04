'use client';

import { useState } from 'react';
import { formatDate } from '@/lib/utils';
import { Filter, Download, Search, AlertTriangle, CheckCircle, Info, Sparkles, Calendar, RotateCcw } from 'lucide-react';

const mockLogs = [
  { id: 1, action: 'publish', queue_id: 45, platform: 'instagram', details: 'Post ID: 179xxx | URL: https://instagram.com/p/...', performed_by: 'system', timestamp: '2026-05-04T09:00:05Z' },
  { id: 2, action: 'publish', queue_id: 45, platform: 'whatsapp', details: 'Enviado para Ururau Notícias', performed_by: 'system', timestamp: '2026-05-04T09:00:08Z' },
  { id: 3, action: 'generate', queue_id: 46, platform: null, details: 'Arte gerada em 2840ms · Template: ururau-reels', performed_by: 'system', timestamp: '2026-05-04T08:59:50Z' },
  { id: 4, action: 'error', queue_id: 47, platform: 'facebook', details: 'Falha: Token inválido', performed_by: 'system', timestamp: '2026-05-04T08:55:00Z' },
  { id: 5, action: 'rollback', queue_id: 44, platform: 'instagram', details: 'Motivo: erro_de_legenda · Post removido', performed_by: 'fabri', timestamp: '2026-05-04T08:30:00Z' },
  { id: 6, action: 'schedule', queue_id: 48, platform: null, details: 'Agendado para 2026-05-05T14:00:00 em [whatsapp]', performed_by: 'fabri', timestamp: '2026-05-04T08:00:00Z' },
  { id: 7, action: 'collect', queue_id: 49, platform: null, details: 'Fonte: g1_rj · Categoria: seguranca', performed_by: 'system', timestamp: '2026-05-04T07:45:00Z' },
  { id: 8, action: 'autoblog_slot', queue_id: null, platform: null, details: 'Slot executado: 09:00:00', performed_by: 'system', timestamp: '2026-05-04T09:00:00Z' },
];

const actionMeta = {
  publish:       { icon: CheckCircle,    color: 'text-success',     bg: 'bg-success/10',     label: 'Publicação' },
  error:         { icon: AlertTriangle,  color: 'text-destructive', bg: 'bg-destructive/10', label: 'Erro' },
  rollback:      { icon: RotateCcw,      color: 'text-purple-700',  bg: 'bg-purple-50',      label: 'Rollback' },
  schedule:      { icon: Calendar,       color: 'text-primary',     bg: 'bg-primary/10',     label: 'Agendamento' },
  generate:      { icon: Sparkles,       color: 'text-orange-700',  bg: 'bg-orange-50',      label: 'Geração' },
  collect:       { icon: Info,           color: 'text-slate-700',   bg: 'bg-slate-100',      label: 'Coleta' },
  autoblog_slot: { icon: Info,           color: 'text-amber-700',   bg: 'bg-amber-50',       label: 'Autoblog' },
};

export default function LogsPage() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const filtered = mockLogs.filter(item => {
    const mf = filter === 'all' || item.action === filter;
    const ms = !search || item.details.toLowerCase().includes(search.toLowerCase());
    return mf && ms;
  });
  const filters = [{ key: 'all', label: 'Todos' }, { key: 'publish', label: 'Publicações' }, { key: 'error', label: 'Erros' }, { key: 'rollback', label: 'Rollbacks' }, { key: 'schedule', label: 'Agendamentos' }, { key: 'generate', label: 'Geração' }];

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Logs & Auditoria</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Registro completo de todas as ações do sistema</p>
        </div>
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground hover:bg-muted transition-colors">
          <Download size={15} /> Exportar CSV
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-card border border-border rounded-xl p-3 shadow-soft">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Buscar nos logs..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-muted border border-transparent focus:bg-background focus:border-primary rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter size={14} className="text-muted-foreground mr-1" />
          {filters.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                filter === f.key ? 'bg-primary text-primary-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-muted-foreground text-[11px] uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-semibold">ID</th>
                <th className="text-left px-4 py-3 font-semibold">Ação</th>
                <th className="text-left px-4 py-3 font-semibold">Post</th>
                <th className="text-left px-4 py-3 font-semibold">Plataforma</th>
                <th className="text-left px-4 py-3 font-semibold">Detalhes</th>
                <th className="text-left px-4 py-3 font-semibold">Por</th>
                <th className="text-left px-4 py-3 font-semibold">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(item => {
                const meta = actionMeta[item.action] || actionMeta.collect;
                const Icon = meta.icon;
                return (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">#{item.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-7 h-7 rounded-md flex items-center justify-center ${meta.bg}`}>
                          <Icon size={13} className={meta.color} strokeWidth={2.5} />
                        </span>
                        <span className="font-medium text-foreground capitalize text-xs">{meta.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{item.queue_id ? `#${item.queue_id}` : '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs capitalize">{item.platform || '—'}</td>
                    <td className="px-4 py-3 text-foreground/80 text-xs max-w-md truncate">{item.details}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        item.performed_by === 'system' ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
                      }`}>{item.performed_by}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(item.timestamp)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">Nenhum log encontrado.</div>}
      </div>
    </div>
  );
}
