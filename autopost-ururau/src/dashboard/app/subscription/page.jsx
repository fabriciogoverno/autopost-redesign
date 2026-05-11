'use client';

import { useState, useEffect } from 'react';
import { Check, Zap, Star, Crown } from 'lucide-react';

const PLANS = [
  {
    id: 'free', name: 'Gratuito', price: 'R$ 0', credits: 20, icon: Zap,
    features: ['20 posts/mês', '1 conta por rede', 'Templates básicos', 'Suporte por email'],
    current: true,
  },
  {
    id: 'pro', name: 'Pro', price: 'R$ 49', credits: 200, icon: Star, highlight: true,
    features: ['200 posts/mês', 'Até 5 contas por rede', 'Todos os templates', 'Autoblog 24/7', 'Suporte prioritário'],
  },
  {
    id: 'enterprise', name: 'Empresarial', price: 'R$ 199', credits: 1000, icon: Crown,
    features: ['1000 posts/mês', 'Contas ilimitadas', 'Templates customizados', 'Autoblog + IA', 'Suporte dedicado', 'API access'],
  },
];

export default function SubscriptionPage() {
  const [credits, setCredits] = useState(20);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('ururau-credits-v1') || '{}');
      if (stored.credits != null) setCredits(stored.credits);
    } catch {}
  }, []);

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Assinatura</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Escolha o plano ideal para o seu workspace</p>
      </div>

      {/* Status atual */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-primary tracking-wider">Plano atual</p>
            <p className="text-xl font-bold mt-0.5">Gratuito</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Créditos disponíveis</p>
            <p className="text-2xl font-bold text-primary">{credits} <span className="text-sm font-normal text-muted-foreground">/ 20</span></p>
          </div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-primary/10 overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(credits / 20) * 100}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          return (
            <div key={plan.id}
              className={`bg-card border-2 rounded-xl shadow-soft p-5 transition-all relative ${
                plan.highlight ? 'border-primary shadow-lg' : 'border-border'
              }`}>
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase">Mais popular</span>
              )}
              <Icon size={28} className={plan.highlight ? 'text-primary' : 'text-muted-foreground'} />
              <h3 className="font-bold text-lg mt-3">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold">{plan.price}</span>
                <span className="text-xs text-muted-foreground">/mês</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{plan.credits} créditos / mês</p>
              <ul className="space-y-2 mt-4">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs">
                    <Check size={12} className="text-success shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button disabled={plan.current}
                className={`w-full mt-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  plan.current ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : plan.highlight ? 'bg-primary text-primary-foreground hover:opacity-90'
                    : 'bg-card border border-border hover:bg-muted'
                }`}>
                {plan.current ? 'Plano atual' : 'Assinar'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
