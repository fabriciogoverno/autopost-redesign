'use client';

import { useState, useEffect } from 'react';
import { StatsCards } from '@/components/StatsCards';
import { ChartPosts } from '@/components/ChartPosts';
import { ChartPlatforms } from '@/components/ChartPlatforms';
import { RecentActivity } from '@/components/RecentActivity';
import { QuickActions } from '@/components/QuickActions';
import { Activity, Sparkles } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState('');

  useEffect(() => {
    setNow(new Date().toLocaleTimeString('pt-BR'));
    fetch('/api/stats').then(r => r.json()).then(d => { setStats(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-primary/10 text-primary border border-primary/20">
              <Sparkles size={10} strokeWidth={2.5} />
              Dashboard
            </span>
          </div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Olá, fabri 👋</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Aqui está o resumo do AutoPost Ururau hoje.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-2 rounded-lg border border-border">
          <Activity size={14} className="text-success" strokeWidth={2.5} />
          <span>Atualizado agora · {now}</span>
        </div>
      </div>

      <StatsCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartPosts />
        <ChartPlatforms />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2"><RecentActivity /></div>
        <QuickActions />
      </div>
    </div>
  );
}
