'use client';

import { Menu, Images } from 'lucide-react';

export function Header() {
  return (
    <header className="h-14 bg-background border-b border-border flex items-center justify-between px-5 sticky top-0 z-30">
      <button className="p-1.5 hover:bg-muted rounded-md transition-colors">
        <Menu size={20} className="text-foreground" />
      </button>
      <button className="p-1.5 hover:bg-muted rounded-md transition-colors" title="Galeria">
        <Images size={18} className="text-muted-foreground" />
      </button>
    </header>
  );
}
