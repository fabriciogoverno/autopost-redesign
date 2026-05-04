'use client';

import { Bell, Search, ChevronDown, Plus } from 'lucide-react';

export function Header() {
  return (
    <header className="h-16 bg-background border-b border-border flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar notícias, posts, templates..."
            className="w-full bg-muted border border-transparent focus:border-primary focus:bg-background rounded-lg pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shadow-soft">
          <Plus size={16} strokeWidth={2.5} />
          Nova publicação
        </button>
        <button className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-background"></span>
        </button>
        <div className="flex items-center gap-2.5 pl-3 ml-1 border-l border-border cursor-pointer hover:bg-accent rounded-lg pr-2 py-1 transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-xs font-semibold">
            FA
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-foreground leading-tight">fabri</p>
            <p className="text-[11px] text-muted-foreground leading-tight">Gestor Ururau</p>
          </div>
          <ChevronDown size={14} className="text-muted-foreground hidden md:block" />
        </div>
      </div>
    </header>
  );
}
