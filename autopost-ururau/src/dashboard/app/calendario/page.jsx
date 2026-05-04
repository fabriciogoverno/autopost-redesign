'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Plus } from 'lucide-react';
import { formatDate, getPlatformIcon } from '@/lib/utils';

const mockScheduled = [
  { id: 1, title: 'Operação policial prende suspeitos', date: '2026-05-05', time: '09:00', platforms: ['instagram', 'whatsapp'], color: '#2563EB' },
  { id: 2, title: 'Campos FC anuncia novo técnico', date: '2026-05-05', time: '15:00', platforms: ['facebook'], color: '#1877F2' },
  { id: 3, title: 'Comércio projeta crescimento', date: '2026-05-06', time: '12:00', platforms: ['whatsapp', 'twitter'], color: '#25D366' },
  { id: 4, title: 'Prefeitura anuncia investimento', date: '2026-05-07', time: '18:00', platforms: ['instagram', 'facebook', 'linkedin'], color: '#E1306C' },
];

export default function CalendarioPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 1));
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  const getDayPosts = (day) => {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return mockScheduled.filter(s => s.date === ds);
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Calendário</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Veja e organize agendamentos e publicações programadas</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 shadow-soft">
            <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><ChevronLeft size={16} /></button>
            <span className="px-3 py-1 text-sm font-semibold text-foreground capitalize min-w-[140px] text-center">{monthName}</span>
            <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><ChevronRight size={16} /></button>
          </div>
          <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shadow-soft">
            <Plus size={15} strokeWidth={2.5} /> Agendar
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border bg-muted/40">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-3">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const posts = day ? getDayPosts(day) : [];
            const today = new Date();
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            return (
              <div key={i} className={`min-h-[110px] border-r border-b border-border p-2 ${isToday ? 'bg-primary/5' : 'hover:bg-muted/30'} transition-colors`}>
                {day && (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`inline-flex items-center justify-center text-xs font-semibold ${isToday ? 'w-6 h-6 rounded-full bg-primary text-primary-foreground' : 'text-foreground'}`}>{day}</span>
                      {posts.length > 0 && <span className="text-[10px] text-muted-foreground font-medium">{posts.length}</span>}
                    </div>
                    <div className="space-y-1">
                      {posts.map(post => (
                        <div key={post.id} className="px-2 py-1 rounded text-[10px] cursor-pointer hover:opacity-80 transition-opacity"
                          style={{ backgroundColor: post.color + '15', color: post.color, borderLeft: `2px solid ${post.color}` }}>
                          <div className="flex items-center gap-1 font-semibold"><Clock size={9} />{post.time}</div>
                          <div className="truncate font-medium text-foreground/80">{post.title}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
        <div className="p-6 pb-4 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">Próximos Agendamentos</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{mockScheduled.length} posts programados</p>
        </div>
        <div className="divide-y divide-border">
          {mockScheduled.map(item => (
            <div key={item.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-muted/40 transition-colors">
              <div className="w-12 h-12 rounded-lg flex flex-col items-center justify-center font-bold" style={{ backgroundColor: item.color + '15', color: item.color }}>
                <span className="text-lg leading-none">{new Date(item.date).getDate()}</span>
                <span className="text-[9px] uppercase mt-0.5">{new Date(item.date).toLocaleString('pt-BR', { month: 'short' })}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(item.date + 'T' + item.time)} · <span className="text-foreground">{item.platforms.map(p => getPlatformIcon(p)).join(' ')}</span>
                </p>
              </div>
              <button className="px-3 py-1.5 rounded-md bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/15 transition-colors">Editar</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
