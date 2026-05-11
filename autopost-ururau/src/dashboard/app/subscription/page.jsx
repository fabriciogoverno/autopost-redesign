'use client';

import { CreditCard } from 'lucide-react';

export default function SubscriptionPage() {
  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Assinatura</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gerencie seu plano, créditos e pagamentos</p>
      </div>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-4">
          <CreditCard size={28} className="text-primary" />
        </div>
        <h2 className="text-base font-semibold text-foreground">Nenhuma assinatura ativa</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">Escolha um plano para começar a usar os créditos e publicar nas redes sociais.</p>
        <button className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
          Escolher plano
        </button>
      </div>
    </div>
  );
}
