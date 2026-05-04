'use client';

import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

const mockData = [
  { hora: '00h', posts: 0 }, { hora: '03h', posts: 0 }, { hora: '06h', posts: 1 },
  { hora: '07h', posts: 2 }, { hora: '09h', posts: 3 }, { hora: '12h', posts: 4 },
  { hora: '15h', posts: 3 }, { hora: '18h', posts: 2 }, { hora: '21h', posts: 1 }, { hora: '23h', posts: 0 },
];

export function ChartPosts() {
  const [data, setData] = useState(mockData);
  useEffect(() => {
    fetch('/api/stats/hourly').then(r => r.json()).then(d => { if (d?.length) setData(d); }).catch(() => {});
  }, []);
  const total = data.reduce((s, d) => s + d.posts, 0);

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-soft">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-foreground">Publicações por Hora</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Últimas 24 horas</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-md">
          <TrendingUp size={12} strokeWidth={2.5} />
          {total} posts
        </div>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(220 84% 51%)" stopOpacity={0.25} />
              <stop offset="95%" stopColor="hsl(220 84% 51%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" vertical={false} />
          <XAxis dataKey="hora" stroke="hsl(215 16% 47%)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="hsl(215 16% 47%)" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid hsl(214 32% 91%)', borderRadius: '8px', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
          <Area type="monotone" dataKey="posts" stroke="hsl(220 84% 51%)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPosts)"
            dot={{ fill: 'hsl(220 84% 51%)', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
