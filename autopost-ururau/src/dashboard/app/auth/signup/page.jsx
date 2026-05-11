'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bot, Eye, EyeOff } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('ururau-user', JSON.stringify({ email, name }));
      }
      router.push('/');
    }, 600);
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="flex flex-col justify-between p-8 lg:p-12">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center"><Bot size={20} className="text-white" /></div>
          <span className="font-bold text-lg text-primary">AutoPost<sup className="text-[10px]">®</sup></span>
        </div>

        <div className="max-w-sm mx-auto w-full">
          <h1 className="text-2xl font-bold text-center mb-2">Criar sua conta</h1>
          <p className="text-sm text-muted-foreground text-center mb-8">Comece grátis em 30 segundos</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">Nome</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Senha</label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} required value={pwd} onChange={(e) => setPwd(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full bg-white border border-border rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-muted rounded">
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg bg-primary text-white font-medium hover:opacity-90 disabled:opacity-50">
              {loading ? 'Criando...' : 'Criar conta'}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Já tem uma conta? <Link href="/auth/login" className="text-primary hover:underline">Entrar</Link>
          </p>
        </div>

        <div className="text-center text-xs text-muted-foreground">© 2026 AutoPost. Todos os direitos reservados.</div>
      </div>

      <div className="hidden lg:flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-white p-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center"><Bot size={28} className="text-white" /></div>
          <h2 className="text-4xl font-bold text-primary">AutoPost<sup className="text-base">®</sup></h2>
        </div>
        <h3 className="text-2xl font-bold mb-3 text-center">Comece grátis hoje</h3>
        <p className="text-sm text-muted-foreground max-w-md text-center">20 créditos grátis para testar. Sem cartão de crédito.</p>
      </div>
    </div>
  );
}
