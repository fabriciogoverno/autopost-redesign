# AutoPost Ururau v3.1 — Dashboard redesenhado

## O que mudou

A interface do painel foi completamente refeita seguindo o design **claro** do
[autopost.com.br](https://autopost.com.br) oficial.

## Antes vs. Depois

### Antes (v3.0)
- Tema escuro (`#050510` background, `#111122` panels)
- Cor primária vermelho Ururau (`#E63946`)
- Cards com bordas escuras e contraste alto
- Layout do dashboard em monoblock fechado

### Depois (v3.1)
- **Tema claro** (light) por padrão, com suporte a dark via `class="dark"`
- Sistema de cores **shadcn/ui** com variáveis CSS HSL
- Cor primária **azul** `hsl(220 84% 51%)` — a mesma usada no autopost.com.br oficial
- Tipografia **Inter** com pesos 400/500/600/700/800
- Sidebar branca com cards de status, gradiente sutil no card "Autoblog 24/7"
- Header com busca elegante (focus-state com ring), botão CTA primário
- StatsCards com indicadores de tendência (TrendingUp/Down + %)
- Gráficos com cores claras, grid sutil, tooltip com box-shadow
- Tabelas com header sutil em `muted/50`, divisores discretos
- Filtros como botões pill (estilo autopost.com.br)
- Animações `animate-fade-up`, `animate-float`, `animate-float-delay`

## Nova landing page pública

Criada em `/landing` com a estrutura clássica do autopost.com.br:

1. **Nav** sticky com blur backdrop
2. **Hero** com badge, título com gradient, mock do dashboard estilo macOS window
3. **Social bar** mostrando todas as plataformas suportadas
4. **Features** — grid 3×2 com 6 cards de funcionalidades
5. **How it works** — 4 passos com flechas conectoras
6. **Pricing** — 3 planos (Self-hosted grátis, Cloud Pro destacado, Enterprise)
7. **FAQ** com `<details>` nativo
8. **CTA** final com gradient azul + glow
9. **Footer** completo com 4 colunas

## Arquivos modificados

```
src/dashboard/
├── app/
│   ├── globals.css                ← reescrito (variáveis HSL shadcn/ui)
│   ├── layout.jsx                 ← reescrito (Inter + bg muted)
│   ├── page.jsx                   ← reescrito (saudação + indicadores)
│   ├── fila/page.jsx              ← reescrito (tabela clara)
│   ├── calendario/page.jsx        ← reescrito (calendário azul)
│   ├── templates/page.jsx         ← reescrito (editor split)
│   ├── logs/page.jsx              ← reescrito (badges coloridos)
│   ├── configuracoes/page.jsx     ← reescrito (tabs animadas)
│   └── landing/                   ← NOVO
│       ├── layout.jsx
│       └── page.jsx
├── components/
│   ├── Sidebar.jsx                ← reescrito (sidebar branca)
│   ├── Header.jsx                 ← reescrito (busca + CTA)
│   ├── StatsCards.jsx             ← reescrito (com tendências)
│   ├── ChartPosts.jsx             ← reescrito (cores claras)
│   ├── ChartPlatforms.jsx         ← reescrito (cores claras)
│   ├── RecentActivity.jsx         ← reescrito (lista clean)
│   └── QuickActions.jsx           ← reescrito (lista vertical)
├── lib/utils.js                   ← cores de status reformuladas
├── tailwind.config.js             ← reescrito (cores shadcn/ui)
└── jsconfig.json                  ← NOVO (aliases @/*)
```

## Como rodar

```bash
cd src/dashboard
npm install
npm run dev      # http://localhost:3000

# Páginas:
# http://localhost:3000          → dashboard interno
# http://localhost:3000/landing  → landing page pública
# http://localhost:3000/fila     → fila de notícias
# http://localhost:3000/calendario
# http://localhost:3000/templates
# http://localhost:3000/logs
# http://localhost:3000/configuracoes
```

Backend (Node.js) na porta 3001:
```bash
npm run server  # do diretório raiz
```

## Paleta de cores (light)

| Variável               | Valor HSL          | Uso                         |
|------------------------|--------------------|-----------------------------|
| `--background`         | `0 0% 100%`        | Fundo geral                 |
| `--foreground`         | `222 47% 11%`      | Texto principal             |
| `--card`               | `0 0% 100%`        | Fundo de cards              |
| `--primary`            | `220 84% 51%`      | Azul autopost (botões/CTA)  |
| `--muted`              | `210 40% 96%`      | Backgrounds suaves          |
| `--muted-foreground`   | `215 16% 47%`      | Texto secundário            |
| `--border`             | `214 32% 91%`      | Bordas                      |
| `--success`            | `142 71% 45%`      | Verde sucesso               |
| `--warning`            | `38 92% 50%`       | Amarelo aviso               |
| `--destructive`        | `0 84% 60%`        | Vermelho erro               |
