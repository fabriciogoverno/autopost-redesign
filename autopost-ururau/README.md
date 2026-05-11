# AutoPost Ururau

Sistema de geração e publicação automática de posts para redes sociais — Portal Ururau.

[![Build](https://github.com/fabriciogoverno/autopost-redesign/actions/workflows/build.yml/badge.svg)](https://github.com/fabriciogoverno/autopost-redesign/actions/workflows/build.yml)

## ⚡ Funcionalidades

- 📰 **Extração automática** de matérias por URL (cheerio + meta tags)
- 🎨 **Editor visual** estilo Canva com canvas Konva.js, multi-páginas, sidebar de ferramentas
- 📑 **Galeria de templates** por categoria com sistema de "Meus Templates"
- 🖼️ **Importação de PDF/PNG do Canva** como template base (via pdf.js no client)
- 🤖 **Logo Ururau nativo** renderizado em Konva (sempre aparece, não depende de PNG)
- 🎯 **Cores por categoria automáticas** (POLÍTICA, ESPORTE, SEGURANÇA, ECONOMIA, etc.)
- 📊 **Dashboard** com estatísticas, gráficos, fila de notícias, logs e auditoria
- 🌐 **Landing page pública** em `/landing`
- 📅 **Calendário** de publicações agendadas
- 🎨 **Tema claro** estilo SaaS profissional com sistema de cores shadcn/ui

## 🚀 Rodar local

```bash
cd autopost-ururau/src/dashboard
npm install
npm run dev
```

Acesse http://localhost:3000

## 🌍 Deploy

### Opção 1 — Vercel (recomendado, 1 clique)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/fabriciogoverno/autopost-redesign)

A configuração `vercel.json` na raiz já está pronta. Em produção:
- Build automático em cada push para `main`
- Preview deploys em pull requests
- APIs `/api/extract`, `/api/stats` funcionam como Edge/Node functions

### Opção 2 — GitHub Pages (estático)

GitHub Pages só serve arquivos estáticos, então **não suporta as APIs** (`/api/extract`, etc.). Para Pages, ative no settings do repo `Pages → Source: GitHub Actions` e use o workflow `build.yml`.

### Opção 3 — Self-hosted Docker

```bash
docker compose up -d
```

## 🗂️ Estrutura

```
autopost-ururau/
├── src/dashboard/              # Next.js 14 (App Router)
│   ├── app/
│   │   ├── page.jsx            # Dashboard principal
│   │   ├── templates/          # Galeria de templates
│   │   ├── editor/             # Editor visual full-screen
│   │   ├── history/            # Histórico de templates
│   │   ├── social/             # Contas + Publicações + Agendados + Autoblog
│   │   ├── landing/            # Landing page pública
│   │   ├── api/
│   │   │   ├── extract/        # Extrator de matéria (cheerio)
│   │   │   └── stats/          # Stats do dashboard
│   │   └── ...
│   ├── components/             # Sidebar, Header, Charts, etc.
│   └── lib/utils.js            # cn(), formatDate(), getStatusColor()
├── .github/workflows/build.yml # CI: build em todo push
├── vercel.json                 # Config deploy Vercel
└── CHANGELOG_v3.6.md           # Notas da versão atual
```

## 🛠️ Stack

- **Next.js 14** App Router
- **React 18**
- **Tailwind CSS** com sistema shadcn/ui (HSL variables)
- **Konva.js 9** (carregado via CDN no editor)
- **pdf.js** (carregado via CDN para importação de PDF do Canva)
- **Lucide React** (ícones)
- **Recharts** (gráficos)
- **Cheerio** (extração de meta tags)

## 📝 Versão atual: v3.6

Ver `CHANGELOG_v3.6.md` para detalhes da última atualização (correção dos 5 bugs reportados + importação de PDF do Canva).

## 📄 Licença

Projeto interno do Portal Ururau (19 anos).
