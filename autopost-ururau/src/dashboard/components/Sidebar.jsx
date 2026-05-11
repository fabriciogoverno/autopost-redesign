'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, PlusCircle, History, Instagram, Send, Clock, Zap,
  Palette, Plug, CreditCard, Settings, Sparkles, HelpCircle,
} from 'lucide-react';

const sections = [
  {
    label: 'Menu Principal',
    items: [
      { href: '/',           label: 'Dashboard',  icon: LayoutDashboard },
      { href: '/templates',  label: 'Criar Post', icon: PlusCircle },
      { href: '/history',    label: 'Histórico',  icon: History },
    ],
  },
  {
    label: 'Redes Sociais',
    items: [
      { href: '/social',           label: 'Contas',      icon: Instagram },
      { href: '/social/publications', label: 'Publicações', icon: Send },
      { href: '/social/scheduled', label: 'Agendados',  icon: Clock },
      { href: '/social/autoblog',  label: 'Autoblog',    icon: Zap },
    ],
  },
  {
    label: 'Configurações',
    items: [
      { href: '/visual-identity', label: 'Identidade Visual', icon: Palette },
      { href: '/integrations',    label: 'Integrações',       icon: Plug },
      { href: '/subscription',    label: 'Assinatura',        icon: CreditCard },
      { href: '/configuracoes',   label: 'Configurações',     icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-sidebar border-r border-border flex flex-col overflow-y-auto">
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
      </div>

      <div className="px-3 pt-3">
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40">
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">U</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">Ururau</p>
            <p className="text-[10px] text-muted-foreground">20 créditos</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-4">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-soft'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    )}>
                    <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-border space-y-2">
        <Link href="/subscription"
          className="block rounded-xl p-3 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={14} className="text-primary" strokeWidth={2.5} />
            <span className="text-xs font-semibold text-foreground">Créditos</span>
            <span className="ml-auto text-xs font-bold text-primary">20</span>
          </div>
          <div className="h-1 rounded-full bg-primary/10 overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: '20%' }} />
          </div>
        </Link>
        <Link href="#" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent">
          <HelpCircle size={14} />
          Ajuda
        </Link>
      </div>
    </aside>
  );
}
