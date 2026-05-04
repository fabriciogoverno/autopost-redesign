'use client';

import Link from 'next/link';
import {
  Sparkles, Zap, Shield, Clock, Image as ImgIcon, MessageSquare, Bot,
  CheckCircle2, ArrowRight, Newspaper, BarChart3,
  Instagram, Facebook, Twitter, Linkedin, ChevronDown, Star,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav /><Hero /><SocialBar /><Features /><HowItWorks /><Pricing /><FAQ /><CTA /><Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/landing" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-soft">
            <Sparkles size={16} className="text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-base text-foreground">AutoPost <span className="text-primary">Ururau</span></span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm">
          <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Funcionalidades</a>
          <a href="#how" className="text-muted-foreground hover:text-foreground transition-colors">Como funciona</a>
          <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Preços</a>
          <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/" className="hidden sm:inline-flex items-center px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Entrar</Link>
          <Link href="/" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity shadow-soft">
            Começar agora <ArrowRight size={14} strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-radial-gradient">
      <div className="absolute top-20 left-1/4 w-72 h-72 rounded-full bg-primary/10 blur-3xl animate-float" />
      <div className="absolute top-40 right-1/4 w-96 h-96 rounded-full bg-blue-200/40 blur-3xl animate-float-delay" />
      <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary mb-6">
          <Sparkles size={12} strokeWidth={2.5} /> Novo · Geração com IA + WhatsApp incluso
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight max-w-4xl mx-auto">
          Transforme notícias em <span className="text-gradient-primary">posts para redes sociais</span> automaticamente
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          O AutoPost Ururau gera artes, escreve legendas com IA e publica no Instagram, Facebook, WhatsApp, Twitter, LinkedIn e TikTok — 24 horas por dia.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity shadow-glow">
            Acessar dashboard <ArrowRight size={16} strokeWidth={2.5} />
          </Link>
          <a href="#how" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-card border border-border text-foreground font-semibold hover:bg-muted transition-colors">Como funciona</a>
        </div>
        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-success" /> Sem cartão de crédito</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-success" /> Self-hosted grátis</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-success" /> Open source</span>
        </div>
        <div className="mt-16 mx-auto max-w-5xl"><DashboardMock /></div>
      </div>
    </section>
  );
}

function DashboardMock() {
  return (
    <div className="rounded-2xl bg-card border border-border shadow-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/40">
        <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
        <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
        <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        <div className="ml-3 flex-1 max-w-sm bg-background border border-border rounded-md px-3 py-1 text-xs text-muted-foreground">autopost.ururau.com.br/dashboard</div>
      </div>
      <div className="p-6 grid grid-cols-3 gap-4 bg-gradient-to-br from-background to-muted/30">
        {[
          { label: 'Publicadas hoje', value: '24', tone: 'text-success', bg: 'bg-success/10' },
          { label: 'Pendentes', value: '12', tone: 'text-warning', bg: 'bg-warning/10' },
          { label: 'Taxa de sucesso', value: '97.5%', tone: 'text-primary', bg: 'bg-primary/10' },
        ].map(c => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-4 shadow-soft">
            <div className={`w-8 h-8 rounded-lg ${c.bg} mb-3`}></div>
            <p className={`text-2xl font-bold ${c.tone}`}>{c.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
          </div>
        ))}
        <div className="col-span-3 bg-card border border-border rounded-xl p-5 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Publicações por hora</p>
            <span className="text-[10px] text-success bg-success/10 px-2 py-0.5 rounded">+12%</span>
          </div>
          <div className="flex items-end gap-1 h-20">
            {[12, 28, 18, 45, 62, 38, 72, 55, 80, 42, 28, 12].map((h, i) => (
              <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-primary/40 to-primary" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SocialBar() {
  const platforms = [
    { name: 'Instagram', icon: Instagram, color: 'text-[#E1306C]' },
    { name: 'Facebook', icon: Facebook, color: 'text-[#1877F2]' },
    { name: 'WhatsApp', icon: MessageSquare, color: 'text-[#25D366]' },
    { name: 'Twitter/X', icon: Twitter, color: 'text-foreground' },
    { name: 'LinkedIn', icon: Linkedin, color: 'text-[#0A66C2]' },
    { name: 'Threads', icon: MessageSquare, color: 'text-foreground' },
  ];
  return (
    <section className="py-12 border-y border-border bg-muted/30">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-center text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-6">Publica em todas as redes que importam</p>
        <div className="flex items-center justify-center flex-wrap gap-x-12 gap-y-4">
          {platforms.map(p => {
            const Icon = p.icon;
            return (
              <div key={p.name} className="flex items-center gap-2 text-foreground/70 font-semibold">
                <Icon size={20} className={p.color} />
                <span className="text-sm">{p.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    { icon: Newspaper, title: 'Coleta automática', desc: 'Conecta nos seus scrapers e identifica notícias novas a cada minuto via hash SHA-256.' },
    { icon: ImgIcon, title: 'Artes server-side', desc: 'Templates 9:16, 1:1 e 16:9 com sua identidade visual aplicada em segundos.' },
    { icon: Bot, title: 'Legendas com IA', desc: 'Ollama local (zero custo) com fallback para Gemini API. Cache SQLite incluso.' },
    { icon: Clock, title: 'Agendamento 24/7', desc: 'Time slots configuráveis, limites por hora. Roda no seu PC ou GitHub Actions.' },
    { icon: Shield, title: 'Bloqueio de duplicidade', desc: 'Mesma notícia nunca publica duas vezes. Hash SHA-256 com auditoria completa.' },
    { icon: BarChart3, title: 'Dashboard em tempo real', desc: 'Estatísticas, calendário, fila e logs. Interface clara igual ao autopost.com.br.' },
  ];
  return (
    <section id="features" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">FUNCIONALIDADES</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">Tudo que você precisa para automatizar suas redes</h2>
          <p className="mt-4 text-muted-foreground">Funcionalidades profissionais sem mensalidade. Open source e self-hosted.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map(item => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-card transition-all">
                <div className="w-11 h-11 rounded-xl bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground text-primary flex items-center justify-center mb-4 transition-colors">
                  <Icon size={20} strokeWidth={2.5} />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1.5">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: '01', icon: Newspaper, title: 'Coleta', desc: 'Notícia chega via scraper ou JSON. Sistema valida e adiciona à fila com hash único.' },
    { n: '02', icon: ImgIcon, title: 'Geração', desc: 'Arte é renderizada server-side usando o template ativo, com sua marca aplicada.' },
    { n: '03', icon: Bot, title: 'Legenda IA', desc: 'Ollama escreve legenda otimizada para cada plataforma. Gemini entra como fallback.' },
    { n: '04', icon: Zap, title: 'Publicação', desc: 'Posta simultaneamente em Instagram, Facebook, WhatsApp, Twitter e LinkedIn.' },
  ];
  return (
    <section id="how" className="py-24 bg-muted/40 border-y border-border">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">COMO FUNCIONA</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">4 passos do site à rede social</h2>
          <p className="mt-4 text-muted-foreground">Pipeline 100% automatizado, do crawler à publicação multi-plataforma.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.n} className="relative p-6 rounded-2xl bg-card border border-border shadow-soft">
                <span className="absolute -top-3 left-6 px-2 py-0.5 rounded-md bg-primary text-primary-foreground text-[11px] font-bold tracking-wider">PASSO {s.n}</span>
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mt-2 mb-4"><Icon size={20} strokeWidth={2.5} /></div>
                <h3 className="text-lg font-semibold text-foreground mb-1.5">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                {i < steps.length - 1 && <ArrowRight size={20} className="hidden lg:block absolute top-1/2 -right-3 text-border" />}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const plans = [
    { name: 'Self-hosted', tag: 'Grátis para sempre', price: 'R$ 0', sub: '/ mês', cta: 'Baixar projeto', popular: false,
      features: ['Roda no seu PC ou servidor', 'Posts ilimitados', '6 redes sociais + WhatsApp', 'Ollama local (sem custo IA)', 'Open source MIT', 'Suporte da comunidade'] },
    { name: 'Cloud Pro', tag: 'Recomendado', price: 'R$ 49', sub: '/ mês', cta: 'Começar agora', popular: true,
      features: ['Tudo do Self-hosted', 'Hospedagem gerenciada 24/7', 'Backup diário automático', 'Gemini API incluído', 'Suporte prioritário', 'SLA 99.9%'] },
    { name: 'Enterprise', tag: 'Para times', price: 'Custom', sub: '', cta: 'Falar com vendas', popular: false,
      features: ['Tudo do Cloud Pro', 'Multi-marca / multi-tenant', 'Onboarding dedicado', 'Integrações sob medida', 'Treinamento da equipe', 'Suporte 1-on-1'] },
  ];
  return (
    <section id="pricing" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">PREÇOS</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">Comece grátis. Pague só se quiser cloud.</h2>
          <p className="mt-4 text-muted-foreground">Sem letra miúda, sem trial enganoso. Cancele a qualquer momento.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {plans.map(plan => (
            <div key={plan.name} className={`relative p-6 rounded-2xl border-2 transition-all ${
              plan.popular ? 'bg-card border-primary shadow-glow ring-1 ring-primary/30' : 'bg-card border-border shadow-soft'
            }`}>
              {plan.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold tracking-wider shadow-soft">MAIS POPULAR</span>}
              <div className="mb-5">
                <p className={`text-xs font-semibold mb-1 ${plan.popular ? 'text-primary' : 'text-muted-foreground'}`}>{plan.tag.toUpperCase()}</p>
                <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.sub}</span>
                </div>
              </div>
              <ul className="space-y-2.5 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                    <CheckCircle2 size={16} className="text-success shrink-0 mt-0.5" strokeWidth={2.5} />{f}
                  </li>
                ))}
              </ul>
              <button className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all ${
                plan.popular ? 'bg-primary text-primary-foreground hover:opacity-90 shadow-soft' : 'bg-muted text-foreground hover:bg-muted/80 border border-border'
              }`}>{plan.cta}</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const items = [
    { q: 'Preciso pagar alguma API para usar?', a: 'Não. O modo padrão usa Ollama local (modelo llama3.2) sem custo nenhum. Gemini API é opcional como fallback e tem 60 requisições gratuitas por minuto.' },
    { q: 'Funciona com meu site de notícias atual?', a: 'Sim. Basta apontar para um arquivo JSON, diretório ou conectar ao seu scraper Python. O sistema deduplica via SHA-256 automaticamente.' },
    { q: 'O que acontece se uma publicação falhar?', a: 'Cada plataforma é independente. Se Instagram falhar, Facebook segue. Falhas viram log e podem ser reexecutadas com 1 clique. Há rollback completo com evidência.' },
    { q: 'Posso editar o template visual?', a: 'Sim. Cores, fontes, tamanhos e layout são editáveis no painel /templates ou via JSON. Templates 9:16, 1:1 e 16:9 inclusos.' },
    { q: 'WhatsApp realmente publica nos canais?', a: 'Sim, via whatsapp-web.js com sessão persistente. Suporta canais (newsletters), grupos e contatos. Basta escanear QR uma vez.' },
  ];
  return (
    <section id="faq" className="py-24 bg-muted/40 border-y border-border">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">FAQ</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">Perguntas frequentes</h2>
        </div>
        <div className="space-y-3">
          {items.map((item, i) => (
            <details key={i} className="group bg-card border border-border rounded-xl p-5 shadow-soft hover:border-primary/30 transition-colors">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <span className="font-semibold text-foreground">{item.q}</span>
                <ChevronDown size={18} className="text-muted-foreground group-open:rotate-180 transition-transform" />
              </summary>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-20 bg-background">
      <div className="max-w-5xl mx-auto px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-10 sm:p-16 text-center shadow-glow">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground tracking-tight">Pronto para automatizar suas redes?</h2>
            <p className="mt-4 text-primary-foreground/80 max-w-xl mx-auto">Comece grátis em menos de 5 minutos. Sem cartão de crédito, sem complicação.</p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-primary font-semibold hover:opacity-90 transition-opacity shadow-soft">
                Acessar dashboard <ArrowRight size={16} strokeWidth={2.5} />
              </Link>
              <a href="#pricing" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 backdrop-blur border border-white/30 text-primary-foreground font-semibold hover:bg-white/20 transition-colors">Ver preços</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <Sparkles size={16} className="text-primary-foreground" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-base text-foreground">AutoPost <span className="text-primary">Ururau</span></span>
            </div>
            <p className="text-sm text-muted-foreground max-w-sm">Sistema autônomo de publicação para redes sociais. Open source, gratuito e brasileiro.</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground mb-3">Produto</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground">Funcionalidades</a></li>
              <li><a href="#pricing" className="hover:text-foreground">Preços</a></li>
              <li><a href="#how" className="hover:text-foreground">Como funciona</a></li>
              <li><Link href="/" className="hover:text-foreground">Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground mb-3">Recursos</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">Documentação</a></li>
              <li><a href="#" className="hover:text-foreground">GitHub</a></li>
              <li><a href="#faq" className="hover:text-foreground">FAQ</a></li>
              <li><a href="#" className="hover:text-foreground">Contato</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© 2026 Ururau · 19 anos · Todos os direitos reservados</p>
          <p className="flex items-center gap-1">Feito com <Star size={12} className="text-warning fill-warning" /> para portais de notícias</p>
        </div>
      </div>
    </footer>
  );
}
