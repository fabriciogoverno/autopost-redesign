'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { SeedTemplateLoader } from './SeedTemplateLoader';

export function AppShell({ children }) {
  const pathname = usePathname();
  const isEditor = pathname?.startsWith('/editor');
  const isAuth = pathname?.startsWith('/auth');

  if (isEditor || isAuth) {
    return <>
      <SeedTemplateLoader />
      {children}
    </>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <SeedTemplateLoader />
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
