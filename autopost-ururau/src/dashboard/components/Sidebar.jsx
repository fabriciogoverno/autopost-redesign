'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, PlusCircle, History, Instagram, Send, Clock, Zap,
  Palette, Plug, CreditCard, MoreVertical, Bot,
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
      { href: '/social',              label: 'Contas',      icon: Instagram },
      { href: '/social/publications', label: 'Publicações', icon: Send },
      { href: '/social/scheduled',    label: 'Agendados',   icon: Clock },
      { href: '/social/autoblog',     label: 'Autoblog',    icon: Zap },
    ],
  },
  {
    label: 'Configurações',
    items: [
      { href: '/visual-identity', label: 'Identidade Visual', icon: Palette },
      { href: '/integrations',    label: 'Integrações',       icon: Plug },
      { href: '/subscription',    label: 'Assinatura',        icon: CreditCard },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
      {/* Logo AutoPost */}
      <div className="px-5 py-4 flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
          <Bot size={20} className="text-white" />
        </div>
        <h1 className="font-bold text-base text-primary">
          AutoPost<sup className="text-[9px] font-medium">®</sup>
        </h1>
      </div>

      {/* Avatar do usuário */}
      <div className="px-3">
        <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
          <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold">T</div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-medium text-foreground truncate">teste</p>
            <p className="text-[11px] text-muted-foreground font-mono">20 créditos</p>
          </div>
          <svg width="10" height="10" viewBox="0 0 10 10" className="text-muted-foreground"><path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
        </button>
      </div>

      {/* Menu navigation */}
      <nav className="flex-1 px-3 py-3 space-y-4 mt-1">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors',
                      isActive
                        ? 'bg-gray-100 text-foreground font-semibold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-gray-50'
                    )}>
                    <Icon size={15} strokeWidth={1.8} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Card Créditos */}
      <div className="px-3 pb-2">
        <Link href="/subscription"
          className="block rounded-lg p-3 bg-blue-50 border border-blue-100 hover:bg-blue-100/50 transition-colors">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-primary fill-primary" />
            <span className="text-sm font-medium text-foreground flex-1">Créditos</span>
            <span className="text-sm font-mono text-foreground">20</span>
          </div>
        </Link>
      </div>

      {/* Account no rodapé */}
      <div className="px-3 pb-3 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2 p-2">
          <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#E65100"><circle cx="12" cy="12" r="10" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-foreground truncate">URURAU</p>
            <p className="text-[10px] text-muted-foreground truncate">contato@ururau.com.br</p>
          </div>
          <button className="p-1 hover:bg-gray-100 rounded">
            <MoreVertical size={14} className="text-muted-foreground" />
          </button>
        </div>
      </div>
    </aside>
  );
}
