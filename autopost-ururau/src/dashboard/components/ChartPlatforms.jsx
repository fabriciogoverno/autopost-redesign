'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const mockData = [
  { platform: 'Instagram', posts: 45, color: '#E1306C' },
  { platform: 'Facebook',  posts: 38, color: '#1877F2' },
  { platform: 'WhatsApp',  posts: 52, color: '#25D366' },
  { platform: 'Twitter',   posts: 12, color: '#1DA1F2' },
  { platform: 'LinkedIn',  posts: 9,  color: '#0A66C2' },
];

export function ChartPlatforms() {
  const [data, setData] = useState(mockData);
  useEffect(() => {
    fetch('/api/stats/platforms').then(r => r.json()).then(d => { if (d?.length) setData(d); }).catch(() => {});
  }, []);
  const total = data.reduce((s, d) => s + d.posts, 0);

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-soft">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-foreground">Publicações por Plataforma</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Últimos 7 dias</p>
        </div>
        <div className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">
          Total: <span className="text-foreground font-semibold">{total}</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" vertical={false} />
          <XAxis dataKey="platform" stroke="hsl(215 16% 47%)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="hsl(215 16% 47%)" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: 'hsl(214 32% 91% / 0.4)' }}
            contentStyle={{ backgroundColor: '#fff', border: '1px solid hsl(214 32% 91%)', borderRadius: '8px', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
          <Bar dataKey="posts" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
