'use client';

import { useState, useEffect } from 'react';
import { formatDate, getStatusColor, truncate } from '@/lib/utils';
import { Filter, Search, Eye, Trash2, Calendar, Image as ImageIcon, Plus, Download } from 'lucide-react';

const mockQueue = [
  { id: 1, title: 'Operação policial prende 10 suspeitos em Campos dos Goytacazes', source: 'g1_rj', category: 'seguranca', status: 'pending', created_at: '2026-05-04T06:00:00Z', priority: 2 },
  { id: 2, title: 'Campos FC anuncia novo técnico para Série D do Brasileirão', source: 'itatiaia', category: 'esporte', status: 'pending', created_at: '2026-05-04T05:30:00Z', priority: 1 },
  { id: 3, title: 'Comércio de Campos projeta crescimento de 8% no segundo semestre', source: 'campos24h', category: 'economia', status: 'pending', created_at: '2026-05-04T05:00:00Z', priority: 0 },
  { id: 4, title: 'Prefeitura anuncia investimento de R$ 50 milhões em mobilidade urbana', source: 'g1_rj', category: 'politica', status: 'generating', created_at: '2026-05-04T04:00:00Z', priority: 2 },
  { id: 5, title: 'Novo hospital regional é inaugurado com 200 leitos', source: 'campos24h', category: 'geral', status: 'scheduled', created_at: '2026-05-04T03:00:00Z', priority: 1 },
  { id: 6, title: 'Trânsito tem mudanças a partir de segunda-feira em 8 cruzamentos', source: 'itatiaia', category: 'geral', status: 'published', created_at: '2026-05-03T22:00:00Z', priority: 0 },
  { id: 7, title: 'Show em Copacabana movimenta economia do Rio', source: 'g1_rj', category: 'opiniao', status: 'failed', created_at: '2026-05-03T20:00:00Z', priority: 0 },
];

const categoryStyles = {
  opiniao:   'bg-rose-50 text-rose-700 border border-rose-200',
  politica:  'bg-indigo-50 text-indigo-700 border border-indigo-200',
  esporte:   'bg-teal-50 text-teal-700 border border-teal-200',
  seguranca: 'bg-amber-50 text-amber-700 border border-amber-200',
  economia:  'bg-orange-50 text-orange-700 border border-orange-200',
  geral:     'bg-slate-100 text-slate-700 border border-slate-200',
};
const categoryNames = { opiniao: 'OPINIÃO', politica: 'POLÍTICA', esporte: 'ESPORTE', seguranca: 'SEGURANÇA', economia: 'ECONOMIA', geral: 'GERAL' };

export default function FilaPage() {
  const [queue, setQueue] = useState(mockQueue);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  useEffect(() => { fetch('/api/queue').then(r => r.json()).then(d => { if (d?.length) setQueue(d); }).catch(() => {}); }, []);
  const filtered = queue.filter(item => {
    const mf = filter === 'all' || item.status === filter;
    const ms = !search || item.title.toLowerCase().includes(search.toLowerCase());
    return mf && ms;
  });
  const filters = [{ key: 'all', label: 'Todas' }, { key: 'pending', label: 'Pendentes' }, { key: 'scheduled', label: 'Agendadas' }, { key: 'published', label: 'Publicadas' }, { key: 'failed', label: 'Falhas' }];

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Fila de Notícias</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} {filtered.length === 1 ? 'item' : 'itens'} · Gerencie notícias pendentes e publicadas</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground hover:bg-muted transition-colors">
            <Download size={15} /> Exportar
          </button>
          <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shadow-soft">
            <Plus size={15} strokeWidth={2.5} /> Nova notícia
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-card border border-border rounded-xl p-3 shadow-soft">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Buscar por título..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-muted border border-transparent focus:bg-background focus:border-primary rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
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
                <th className="text-left px-4 py-3 font-semibold">Título</th>
                <th className="text-left px-4 py-3 font-semibold">Fonte</th>
                <th className="text-left px-4 py-3 font-semibold">Categoria</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Prioridade</th>
                <th className="text-left px-4 py-3 font-semibold">Coletada</th>
                <th className="text-right px-4 py-3 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(item => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">#{item.id}</td>
                  <td className="px-4 py-3"><p className="font-medium text-foreground max-w-md truncate">{truncate(item.title, 60)}</p></td>
                  <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{item.source}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${categoryStyles[item.category] || categoryStyles.geral}`}>
                      {categoryNames[item.category] || item.category.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {item.priority > 0 ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-xs font-bold">P{item.priority}</span> : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(item.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"><Eye size={14} /></button>
                      <button className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary"><ImageIcon size={14} /></button>
                      <button className="p-1.5 rounded-md hover:bg-warning/10 text-muted-foreground hover:text-warning"><Calendar size={14} /></button>
                      <button className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">Nenhuma notícia encontrada com este filtro.</div>}
      </div>
    </div>
  );
}
