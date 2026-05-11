'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  PlusCircle, Zap, FileText, Send, BarChart3, Calendar, PieChart as PieIcon, Activity,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';

const TYPE_COLORS = ['#2563EB', '#E1306C', '#1877F2', '#25D366', '#0A66C2', '#000000'];

function generateLast30Days(items) {
  const days = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const count = items.filter((it) => (it.createdAt || '').slice(0, 10) === key).length;
    days.push({ date: `${dd}/${mm}`, posts: count });
  }
  return days;
}

function generateLast12Months(items) {
  const months = [];
  const today = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    const count = items.filter((it) => (it.createdAt || '').slice(0, 7) === key).length;
    months.push({ month: label.replace('.', ''), posts: count });
  }
  return months;
}

export default function DashboardPage() {
  const [myTemplates, setMyTemplates] = useState([]);
  const [publications, setPublications] = useState([]);
  const [credits, setCredits] = useState(20);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      setMyTemplates(JSON.parse(localStorage.getItem('ururau-my-templates-v1') || '[]'));
      setPublications(JSON.parse(localStorage.getItem('ururau-publications-v1') || '[]'));
      const c = JSON.parse(localStorage.getItem('ururau-credits-v1') || '{}');
      if (c.credits != null) setCredits(c.credits);
    } catch {}
  }, []);

  const totalPosts = myTemplates.length;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const publishedThisMonth = publications.filter((p) => (p.publishedAt || '').slice(0, 7) === currentMonth).length;
  const creditsUsed = 20 - credits;

  const cards = [
    { label: 'Créditos disponíveis', value: credits, sub: 'Créditos restantes', icon: Zap, bg: 'bg-primary/10', color: 'text-primary' },
    { label: 'Total de posts', value: totalPosts, sub: 'Posts criados', icon: FileText, bg: 'bg-pink-500/10', color: 'text-pink-500' },
    { label: 'Publicados este mês', value: publishedThisMonth, sub: 'Posts publicados', icon: Send, bg: 'bg-success/10', color: 'text-success' },
    { label: 'Créditos usados', value: creditsUsed, sub: 'Este mês', icon: Activity, bg: 'bg-amber-500/10', color: 'text-amber-500' },
  ];

  const daily = generateLast30Days(myTemplates);
  const monthly = generateLast12Months(myTemplates);

  // Distribuição por categoria
  const categoryStats = {};
  myTemplates.forEach((t) => {
    const cat = (t.category || 'GERAL').toUpperCase();
    categoryStats[cat] = (categoryStats[cat] || 0) + 1;
  });
  const pieData = Object.entries(categoryStats).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Visão geral do seu workspace</p>
        </div>
        <Link href="/templates"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 shadow-soft">
          <PlusCircle size={15} /> Criar Post
        </Link>
      </div>

      {/* 4 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-card border border-border rounded-xl shadow-soft p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
                <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center`}>
                  <Icon size={16} className={c.color} strokeWidth={2.5} />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground">{c.value}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{c.sub}</p>
            </div>
          );
        })}
      </div>

      {/* 2 Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl shadow-soft p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold">Posts gerados</h3>
              <p className="text-[11px] text-muted-foreground">Últimos 30 dias</p>
            </div>
            <BarChart3 size={16} className="text-muted-foreground" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={daily} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradPosts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(220 84% 51%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(220 84% 51%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" vertical={false} />
              <XAxis dataKey="date" stroke="hsl(215 16% 47%)" fontSize={10} tickLine={false} axisLine={false}
                interval="preserveStartEnd" tickFormatter={(v, i) => (i % 5 === 0 ? v : '')} />
              <YAxis stroke="hsl(215 16% 47%)" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid hsl(214 32% 91%)', borderRadius: '8px', fontSize: '11px' }} />
              <Area type="monotone" dataKey="posts" stroke="hsl(220 84% 51%)" strokeWidth={2} fill="url(#gradPosts)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-soft p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold">Posts por mês</h3>
              <p className="text-[11px] text-muted-foreground">Últimos 12 meses</p>
            </div>
            <Calendar size={16} className="text-muted-foreground" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthly} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" vertical={false} />
              <XAxis dataKey="month" stroke="hsl(215 16% 47%)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(215 16% 47%)" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid hsl(214 32% 91%)', borderRadius: '8px', fontSize: '11px' }} />
              <Bar dataKey="posts" fill="hsl(220 84% 51%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2 Painéis embaixo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl shadow-soft p-5">
          <div className="flex items-center gap-2 mb-3">
            <PieIcon size={16} className="text-muted-foreground" />
            <h3 className="text-sm font-bold">Por tipo de conteúdo</h3>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">Distribuição dos posts</p>
          {pieData.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">Nenhum dado disponível</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75}>
                  {pieData.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid hsl(214 32% 91%)', borderRadius: '8px', fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl shadow-soft p-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} className="text-muted-foreground" />
            <h3 className="text-sm font-bold">Créditos utilizados</h3>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">Consumo diário de créditos</p>
          {creditsUsed === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-24 h-24 rounded-full bg-success/10 flex items-center justify-center mb-3">
                <Zap size={36} className="text-success" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-semibold">Você ainda tem todos os créditos</p>
              <p className="text-xs text-muted-foreground mt-1">{credits} créditos disponíveis</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Usados</span>
                <span className="font-bold">{creditsUsed} / 20</span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(creditsUsed / 20) * 100}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
