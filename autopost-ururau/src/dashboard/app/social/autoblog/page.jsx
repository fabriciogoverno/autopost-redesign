'use client';

import { Rss } from 'lucide-react';

export default function AutoblogPage() {
  return (
    <div className="animate-fade-up h-full flex flex-col items-center justify-center py-12">
      <div className="relative w-80 h-80">
        {/* Círculos concêntricos */}
        <div className="absolute inset-0 rounded-full border border-gray-200" />
        <div className="absolute inset-8 rounded-full border border-gray-200" />
        <div className="absolute inset-16 rounded-full border border-gray-200" />
        {/* Centro */}
        <div className="absolute inset-32 rounded-full bg-blue-50 flex items-center justify-center">
          <Rss size={28} className="text-primary" />
        </div>
        {/* Ícones das redes */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center text-white font-bold">📷</div>
        <div className="absolute top-1/4 right-0 w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">f</div>
        <div className="absolute bottom-1/4 right-0 w-12 h-12 rounded-full bg-black flex items-center justify-center text-white font-bold">𝕏</div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-black flex items-center justify-center text-white font-bold">♪</div>
        <div className="absolute bottom-1/4 left-0 w-12 h-12 rounded-full bg-blue-700 flex items-center justify-center text-white font-bold">in</div>
        <div className="absolute top-1/4 left-0 w-12 h-12 rounded-full bg-black flex items-center justify-center text-white font-bold">@</div>
      </div>
      <h2 className="text-xl font-bold text-foreground mt-6">Publique no piloto automático</h2>
      <p className="text-sm text-muted-foreground mt-1 text-center max-w-md">Conecte seu feed RSS e deixe o Autoblog criar e publicar artes automaticamente sempre que uma nova notícia sair.</p>
      <button className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border bg-card hover:bg-muted/30 text-sm font-medium">
        <Rss size={14} /> Conectar Feed RSS
      </button>
    </div>
  );
}
