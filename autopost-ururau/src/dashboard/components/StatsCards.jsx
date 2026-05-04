'use client';

import { Newspaper, CheckCircle, XCircle, RotateCcw, Clock, Zap, TrendingUp, TrendingDown } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

export function StatsCards({ stats }) {
  const defaultStats = { pending: 12, published: 156, failed: 3, rolled_back: 1, today: 2, week: 18, success_rate: 97.5 };
  const s = stats || defaultStats;

  const cards = [
    { label: 'Pendentes',        value: s.pending,         sub: 'na fila',           icon: Clock,       color: 'text-warning',     bg: 'bg-warning/10',     trend: null },
    { label: 'Publicadas Hoje',  value: s.today,           sub: 'Meta: 25',          icon: CheckCircle, color: 'text-success',     bg: 'bg-success/10',     trend: { dir: 'up', value: '+12%' } },
    { label: 'Esta Semana',      value: s.week,            sub: 'últimos 7 dias',    icon: Newspaper,   color: 'text-primary',     bg: 'bg-primary/10',     trend: { dir: 'up', value: '+8%' } },
    { label: 'Taxa de Sucesso',  value: `${s.success_rate}%`, sub: 'média 30 dias',  icon: Zap,         color: 'text-emerald-600', bg: 'bg-emerald-50',     trend: { dir: 'up', value: '+2.3%' } },
    { label: 'Falhas',           value: s.failed,          sub: 'requer atenção',    icon: XCircle,     color: 'text-destructive', bg: 'bg-destructive/10', trend: { dir: 'down', value: '-1' } },
    { label: 'Rollbacks',        value: s.rolled_back,     sub: 'no mês',            icon: RotateCcw,   color: 'text-purple-600',  bg: 'bg-purple-50',      trend: null },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const TrendIcon = card.trend?.dir === 'up' ? TrendingUp : TrendingDown;
        return (
          <div key={card.label} className="bg-card border border-border rounded-xl p-4 shadow-soft hover:shadow-card transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <Icon size={16} className={card.color} strokeWidth={2.5} />
              </div>
              {card.trend && (
                <span className={`flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                  card.trend.dir === 'up' ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10'
                }`}>
                  <TrendIcon size={10} strokeWidth={2.5} />
                  {card.trend.value}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-foreground tracking-tight">
              {typeof card.value === 'number' ? formatNumber(card.value) : card.value}
            </p>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">{card.label}</p>
            <p className="text-[10px] text-muted-foreground/70 mt-1">{card.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
