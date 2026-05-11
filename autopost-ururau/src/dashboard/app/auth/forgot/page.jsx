'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bot, ArrowLeft } from 'lucide-react';

export default function ForgotPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  function onSubmit(e) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <Link href="/auth/login" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={14} /> Voltar pro login
        </Link>
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center"><Bot size={20} className="text-white" /></div>
          <span className="font-bold text-lg text-primary">AutoPost<sup className="text-[10px]">®</sup></span>
        </div>
        <h1 className="text-2xl font-bold mb-2">Esqueci minha senha</h1>
        <p className="text-sm text-muted-foreground mb-6">Digite seu email e enviaremos um link para redefinir sua senha.</p>

        {sent ? (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 text-sm">
            ✓ Email enviado! Verifique sua caixa de entrada.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            <button type="submit" className="w-full py-2.5 rounded-lg bg-primary text-white font-medium hover:opacity-90">
              Enviar link de recuperação
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
