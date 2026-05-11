'use client';

import Link from 'next/link';
import { Zap, FileText, Share2, BarChart3, Calendar, PieChart, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Visão geral do seu workspace</p>
        </div>
        <Link href="/templates" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-soft hover:opacity-90">
          <span className="text-base">+</span> Criar Post
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Créditos disponíveis" value="20" sub="Créditos restantes" icon={Zap} accent="text-primary" />
        <MetricCard title="Total de posts" value="0" sub="Posts criados" icon={FileText} accent="text-muted-foreground" />
        <MetricCard title="Publicados este mês" value="0" sub="Posts publicados" icon={Share2} accent="text-muted-foreground" />
        <MetricCard title="Créditos usados" value="0" sub="Este mês" icon={Zap} accent="text-muted-foreground" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Posts gerados" subtitle="Últimos 30 dias" icon={TrendingUp}>
          <EmptyLineChart />
        </ChartCard>
        <ChartCard title="Posts por mês" subtitle="Últimos 12 meses" icon={Calendar}>
          <EmptyBarChart />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Por tipo de conteúdo" subtitle="Distribuição dos posts" icon={PieChart}>
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Nenhum dado ainda</div>
        </ChartCard>
        <ChartCard title="Créditos utilizados" subtitle="Consumo diário de créditos" icon={BarChart3}>
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Nenhum dado ainda</div>
        </ChartCard>
      </div>
    </div>
  );
}

function MetricCard({ title, value, sub, icon: Icon, accent }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground mt-2">{value}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>
        </div>
        <Icon size={16} className={accent} />
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, icon: Icon, children }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        <Icon size={14} className="text-muted-foreground" />
      </div>
      {children}
    </div>
  );
}

function EmptyLineChart() {
  return (
    <svg viewBox="0 0 500 200" className="w-full h-48">
      {[1,2,3,4].map(i => <line key={i} x1="40" y1={40*i} x2="500" y2={40*i} stroke="#e5e7eb" strokeDasharray="2,4" />)}
      {['12/04','17/04','22/04','27/04','02/05','07/05'].map((d, i) => (
        <text key={d} x={50 + i*85} y="195" fontSize="10" fill="#9ca3af">{d}</text>
      ))}
      {[4,3,2,1,0].map((v, i) => <text key={v} x="20" y={45 + i*40} fontSize="10" fill="#9ca3af">{v}</text>)}
    </svg>
  );
}

function EmptyBarChart() {
  return (
    <svg viewBox="0 0 500 200" className="w-full h-48">
      {[1,2,3,4].map(i => <line key={i} x1="40" y1={40*i} x2="500" y2={40*i} stroke="#e5e7eb" strokeDasharray="2,4" />)}
      {['Jun/25','Ago/25','Out/25','Dez/25','Fev/26','Abr/26'].map((d, i) => (
        <text key={d} x={45 + i*85} y="195" fontSize="10" fill="#9ca3af">{d}</text>
      ))}
      {[4,3,2,1,0].map((v, i) => <text key={v} x="20" y={45 + i*40} fontSize="10" fill="#9ca3af">{v}</text>)}
    </svg>
  );
}
