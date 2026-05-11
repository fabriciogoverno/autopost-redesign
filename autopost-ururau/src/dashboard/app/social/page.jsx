'use client';

import { ExternalLink } from 'lucide-react';

const NETWORKS = [
  { id: 'instagram', name: 'Instagram', desc: 'Publique fotos e stories diretamente', bg: 'bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600', icon: '📷' },
  { id: 'facebook',  name: 'Facebook',  desc: 'Compartilhe em suas páginas', bg: 'bg-blue-600', icon: 'f' },
  { id: 'twitter',   name: 'X / Twitter', desc: 'Publique tweets com suas artes', bg: 'bg-black', icon: '𝕏' },
  { id: 'threads',   name: 'Threads',  desc: 'Compartilhe no Threads da Meta', bg: 'bg-black', icon: '@' },
  { id: 'linkedin',  name: 'LinkedIn', desc: 'Publique em perfis e páginas', bg: 'bg-blue-700', icon: 'in' },
  { id: 'tiktok',    name: 'TikTok',   desc: 'Publique vídeos e fotos no TikTok', bg: 'bg-black', icon: '♪' },
];

export default function SocialPage() {
  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Contas Conectadas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Conecte suas contas para publicar diretamente nas redes sociais</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {NETWORKS.map(n => (
          <div key={n.id} className="bg-card border border-border rounded-xl p-5 shadow-soft">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-full ${n.bg} flex items-center justify-center text-white font-bold text-lg shrink-0`}>{n.icon}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">{n.name}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-muted-foreground">Desconectado</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{n.desc}</p>
              </div>
            </div>
            <button className="mt-4 w-full py-2.5 rounded-lg border border-border hover:bg-muted/50 transition-colors text-sm font-medium flex items-center justify-center gap-2">
              <ExternalLink size={13} /> Conectar {n.name}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
