'use client';

import { CalendarClock, RefreshCw } from 'lucide-react';

export default function ScheduledPage() {
  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agendados</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Posts agendados para publicação automática</p>
        </div>
        <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted/30 text-sm font-medium">
          <RefreshCw size={13} /> Atualizar
        </button>
      </div>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-4">
          <CalendarClock size={28} className="text-primary" />
        </div>
        <h2 className="text-base font-semibold text-foreground">Nenhum post agendado</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">Quando você agendar uma publicação, ela aparecerá aqui.</p>
      </div>
    </div>
  );
}
