'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AppShell({ children }) {
  const pathname = usePathname();
  // No editor o user quer fullscreen — sem sidebar/header da app
  const isEditor = pathname?.startsWith('/editor');

  if (isEditor) return <>{children}</>;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-muted/30">
          <div className="max-w-[1600px] mx-auto p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
