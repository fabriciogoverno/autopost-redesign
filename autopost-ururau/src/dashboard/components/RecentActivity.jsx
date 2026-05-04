'use client';

import { useState, useEffect } from 'react';
import { formatDate, getStatusColor, getPlatformIcon, truncate } from '@/lib/utils';
import { ExternalLink, MoreHorizontal } from 'lucide-react';

const mockActivity = [
  { id: 1, title: 'Operação policial prende 10 suspeitos em Campos dos Goytacazes', platform: 'instagram', status: 'published', time: '2026-05-04T08:30:00Z', url: '#' },
  { id: 2, title: 'Campos FC anuncia novo técnico para a temporada', platform: 'whatsapp', status: 'published', time: '2026-05-04T09:15:00Z', url: '#' },
  { id: 3, title: 'Comércio projeta crescimento de 8% no segundo semestre', platform: 'facebook', status: 'failed', time: '2026-05-04T09:20:00Z', url: null },
  { id: 4, title: 'Novo hospital regional inaugurado com 200 leitos', platform: 'twitter', status: 'published', time: '2026-05-04T07:00:00Z', url: '#' },
  { id: 5, title: 'Trânsito tem mudanças a partir de segunda em 8 cruzamentos', platform: 'linkedin', status: 'published', time: '2026-05-04T12:00:00Z', url: '#' },
];

export function RecentActivity() {
  const [activity, setActivity] = useState(mockActivity);
  useEffect(() => {
    fetch('/api/publications/recent').then(r => r.json()).then(d => { if (d?.length) setActivity(d); }).catch(() => {});
  }, []);
  return (
    <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
      <div className="flex items-center justify-between p-6 pb-4 border-b border-border">
        <div>
          <h3 className="text-base font-semibold text-foreground">Atividade Recente</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Últimas publicações do sistema</p>
        </div>
        <button className="text-xs font-medium text-primary hover:underline">Ver todas</button>
      </div>
      <div className="divide-y divide-border">
        {activity.map((item) => (
          <div key={item.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-muted/40 transition-colors group">
            <span className="text-xl">{getPlatformIcon(item.platform)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{truncate(item.title, 60)}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">
                {item.platform} · {formatDate(item.time)}
              </p>
            </div>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide ${getStatusColor(item.status)}`}>
              {item.status === 'published' ? 'Publicado' : item.status === 'failed' ? 'Falhou' : item.status}
            </span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {item.url && (
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent">
                  <ExternalLink size={14} />
                </a>
              )}
              <button className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent">
                <MoreHorizontal size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
