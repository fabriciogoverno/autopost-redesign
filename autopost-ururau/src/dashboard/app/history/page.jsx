'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, FileText, Search } from 'lucide-react';

const TEMPLATES_KEY = 'ururau-my-templates-v1';

export default function HistoryPage() {
  const [posts, setPosts] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const all = JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]');
      setPosts(all);
    } catch {}
  }, []);

  const filtered = posts.filter((p) => !search || p.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Histórico</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{posts.length} {posts.length === 1 ? 'post' : 'posts'}</p>
        </div>
        <Link href="/templates" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
          <span>+</span> Criar Post
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-4">
            <FileText size={28} className="text-primary" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Nenhum post ainda</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">Crie seu primeiro post para começar a divulgar suas notícias</p>
          <Link href="/templates" className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
            <Plus size={14} /> Criar primeiro post
          </Link>
        </div>
      ) : (
        <>
          <div className="relative max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar posts..." className="w-full bg-white border border-border rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filtered.map((p) => (
              <Link key={p.id} href={`/posts/${p.id}`} className="bg-white border border-border rounded-xl hover:shadow-md transition-all overflow-hidden">
                <div className="aspect-[9/16] bg-gray-50">
                  {p.thumb ? <img src={p.thumb} alt={p.name} className="w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center text-muted-foreground"><FileText size={32} /></div>}
                </div>
                <div className="p-3 border-t border-gray-100">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(p.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
