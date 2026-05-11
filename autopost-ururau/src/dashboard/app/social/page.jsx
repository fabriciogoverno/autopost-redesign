'use client';
import { Instagram, Facebook, Twitter, Linkedin, MessageSquare } from 'lucide-react';
const PLATFORMS = [
  { name: 'Instagram', icon: Instagram, color: '#E1306C', status: 'Não conectado' },
  { name: 'Facebook',  icon: Facebook,  color: '#1877F2', status: 'Não conectado' },
  { name: 'WhatsApp',  icon: MessageSquare, color: '#25D366', status: 'Conectado', user: 'Ururau Notícias' },
  { name: 'Twitter/X', icon: Twitter,   color: '#000000', status: 'Não conectado' },
  { name: 'LinkedIn',  icon: Linkedin,  color: '#0A66C2', status: 'Não conectado' },
];
export default function SocialAccountsPage() {
  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Contas Conectadas</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Gerencie as redes sociais para publicação automática</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PLATFORMS.map((p) => {
          const Icon = p.icon;
          const ok = p.status === 'Conectado';
          return (
            <div key={p.name} className="bg-card border border-border rounded-xl p-4 shadow-soft">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: p.color + '20' }}>
                  <Icon size={20} style={{ color: p.color }} />
                </div>
                <div>
                  <p className="font-semibold text-sm">{p.name}</p>
                  <p className={`text-[11px] ${ok ? 'text-success' : 'text-muted-foreground'}`}>{p.status}</p>
                </div>
              </div>
              {ok && p.user && <p className="text-xs text-muted-foreground mb-3">@{p.user}</p>}
              <button className={`w-full py-1.5 rounded-md text-xs font-semibold ${ok ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground hover:opacity-90'}`}>
                {ok ? 'Reconectar' : 'Conectar'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
