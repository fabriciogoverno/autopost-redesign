'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, List, Calendar, Palette, ClipboardList, Settings,
  Zap, Sparkles, HelpCircle,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/fila', label: 'Fila de Notícias', icon: List },
  { href: '/calendario', label: 'Calendário', icon: Calendar },
  { href: '/templates', label: 'Templates', icon: Palette },
  { href: '/logs', label: 'Logs & Auditoria', icon: ClipboardList },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-64 bg-sidebar border-r border-border flex flex-col">
      <div className="px-5 py-5 border-b border-border">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-soft group-hover:shadow-glow transition-shadow">
            <Sparkles size={18} className="text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-foreground">AutoPost</h1>
            <p className="text-[11px] text-muted-foreground -mt-0.5">Ururau · 19 anos</p>
          </div>
        </Link>
        <div className="mt-4 flex items-center gap-2 px-2 py-1.5 rounded-md bg-success/10 border border-success/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
          </span>
          <span className="text-[11px] font-medium text-success">Sistema Online</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Menu Principal</p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive ? 'bg-primary text-primary-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}>
              <Icon size={17} strokeWidth={isActive ? 2.5 : 2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border space-y-2">
        <div className="rounded-xl p-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
              <Zap size={14} className="text-primary" strokeWidth={2.5} />
            </div>
            <span className="text-xs font-semibold text-foreground">Autoblog 24/7</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug mb-2">
            Próximo post programado às <span className="font-semibold text-foreground">09:00</span>
          </p>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Hoje</span>
            <span className="font-semibold text-primary">2 / 25</span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-primary/10 overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: '8%' }} />
          </div>
        </div>
        <Link href="#" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <HelpCircle size={14} />
          Ajuda & Documentação
        </Link>
      </div>
    </aside>
  );
}
