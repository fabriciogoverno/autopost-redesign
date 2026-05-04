# AutoPost Ururau

Sistema autônomo de geração e publicação automática de posts para redes sociais — **Projeto Ururau**.

> Replica 100% das funcionalidades do [autopost.com.br](https://autopost.com.br), com **zero custo mensal**, integração nativa aos scrapers existentes e publicação em **WhatsApp** inclusa.

---

## v3.1 — Dashboard redesenhado (estilo autopost.com.br)

A interface do painel foi completamente refeita seguindo o design **claro** do autopost.com.br oficial:

- Tema **light** por padrão (com suporte a dark via `class="dark"`)
- Sistema de cores **shadcn/ui** com variáveis HSL (`--primary`, `--background`, `--card`, `--muted`, etc.)
- Cor primária **azul** `hsl(220 84% 51%)` — a mesma usada no autopost.com.br oficial
- Tipografia **Inter** com pesos 400/500/600/700/800
- Componentes refeitos: Sidebar branca com cards de status, Header com busca elegante, StatsCards com indicadores de tendência, gráficos com cores claras, tabelas com header sutil
- Nova **landing page pública** em `/landing` com hero, social bar, features, how-it-works, pricing, FAQ e CTA — também no estilo autopost.com.br

### Estrutura do front
```
src/dashboard/
├── app/
│   ├── globals.css          # Design system (variáveis CSS HSL + animações)
│   ├── layout.jsx           # Layout do dashboard (sidebar + header)
│   ├── page.jsx             # Dashboard principal
│   ├── fila/page.jsx        # Fila de notícias (tabela + filtros)
│   ├── calendario/page.jsx  # Calendário mensal + próximos agendamentos
│   ├── templates/page.jsx   # Editor de templates com preview ao vivo
│   ├── logs/page.jsx        # Logs com filtros e badges coloridos
│   ├── configuracoes/page.jsx # Tabs (Geral, Autoblog, Plataformas, IA, WhatsApp)
│   └── landing/             # Landing page pública estilo autopost.com.br
│       ├── layout.jsx
│       └── page.jsx
├── components/
│   ├── Sidebar.jsx          # Navegação lateral clara
│   ├── Header.jsx           # Topbar com busca + ações
│   ├── StatsCards.jsx       # 6 cards com tendências
│   ├── ChartPosts.jsx       # Gráfico área (publicações/hora)
│   ├── ChartPlatforms.jsx   # Gráfico barras (publicações/plataforma)
│   ├── RecentActivity.jsx   # Lista de atividade recente
│   └── QuickActions.jsx     # Ações rápidas + status do sistema
├── lib/utils.js             # cn(), formatDate(), getStatusColor(), etc.
├── tailwind.config.js       # Tailwind com cores shadcn/ui
└── jsconfig.json            # Aliases @/*
```

### Como rodar o dashboard

```bash
cd src/dashboard
npm install
npm run dev   # http://localhost:3000
# Landing pública: http://localhost:3000/landing
```

---

## ⚡ Funcionalidades

- ✅ **Feed + Reels/Stories** — artes geradas server-side com identidade visual Ururau
- ✅ **6 Redes Sociais** — Instagram, Facebook, Twitter/X, LinkedIn, Threads, TikTok
- ✅ **WhatsApp** — canais e grupos do Ururau
- ✅ **Legendas com IA** — Ollama local (grátis) ou Gemini API
- ✅ **Autoblog 24/7** — publica sozinho nos horários de pico
- ✅ **Bloqueio de Duplicidade** — hash SHA-256, mesma notícia nunca 2x
- ✅ **Rollback Completo** — um comando apaga de todas as plataformas
- ✅ **Dashboard Web** — estatísticas em tempo real
- ✅ **Alertas WhatsApp** — notificações de erro no seu número

---

## 📦 Instalação (Fase 1 — Core)

### Requisitos
- Node.js **v24.14.1** ou superior
- Python 3.12+ (para scrapers existentes)
- SQLite3 (já incluso no Node.js via `sqlite` package)

### Passo a passo

```bash
# 1. Clone ou copie o projeto
cd autopost-ururau

# 2. Instale dependências
npm install

# 3. Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais

# 4. Inicialize o banco de dados
node src/backend/cli/autopost.js db-init

# 5. Teste o hash
node src/backend/cli/autopost.js hash-test

# 6. Consuma notícias de um arquivo JSON
node src/backend/cli/autopost.js consume-file ./noticias.json

# 7. Veja as estatísticas
node src/backend/cli/autopost.js stats
```

---

## 🎨 Template Ururau Reels

O template `ururau-reels` foi criado **exatamente com base na arte do Canva** que você enviou:

- Proporção **9:16** (1080×1920) — Reels/Stories
- **Logo Ururau** no topo + badge "19 ANOS" dourado
- **Badge de categoria** colorida (OPINIÃO, POLÍTICA, ESPORTE...)
- **Título em branco bold** com linha vermelha decorativa
- **Resumo em cinza claro** abaixo do título
- **Watermark** discreto no rodapé
- **Overlay escuro** sobre a imagem de fundo para legibilidade

---

## 🗂️ Estrutura do Projeto

```
autopost-ururau/
├── src/backend/
│   ├── core/
│   │   ├── database.js      # SQLite + schema completo
│   │   ├── hash.js          # SHA-256 duplicidade
│   │   └── config.js        # Configurações do sistema
│   ├── modules/
│   │   ├── collector.js     # Consome notícias dos scrapers
│   │   └── logger.js        # Logging estruturado
│   ├── platforms/           # (Fase 4) Instagram, Facebook, etc.
│   ├── api/                 # (Fase 7) Express REST API
│   └── cli/
│       └── autoblog.js      # CLI principal
├── templates/
│   └── ururau-reels.json    # Template baseado na arte real
├── database/
│   └── autopost.db          # Banco SQLite
├── config/
│   └── autoblog.json        # Configurações editáveis
├── output/
│   ├── artes/               # Artes geradas
│   ├── screenshots/         # Provas de publicação
│   └── rollback_evidence/   # Evidências de rollback
└── tests/                   # Testes unitários e integração
```

---

## 🖥️ CLI — Comandos Disponíveis (Fase 1)

| Comando | Descrição |
|---------|-----------|
| `db-init` | Cria tabelas SQLite |
| `db-backup` | Backup do banco |
| `consume-file <file>` | Consome JSON de notícias |
| `consume-dir <dir>` | Consome diretório de JSONs |
| `stats` | Estatísticas do sistema |
| `queue-list` | Lista fila pending |
| `queue-ignore <id>` | Ignora notícia |
| `audit` | Log de auditoria |
| `hash-test` | Testa geração de hash |

---

## 🔐 Segurança

- Credenciais criptografadas com **AES-256-GCM** (Fase 8)
- Hash SHA-256 impossibilita duplicidade
- Rollback com screenshot de prova
- Backup diário automático do SQLite

---

## 📋 Próximas Fases

| Fase | Entrega | Status |
|------|---------|--------|
| **1. Core** | Database, Hash, Collector, CLI | ✅ **PRONTO** |
| **2. Gerador** | **Templates, Canvas engine** | **✅ PRONTO** |
| **3. Legendas** | **Ollama/Gemini, Prompts** | **✅ PRONTO** |
| **4. Publisher** | **Instagram, Facebook, Twitter, LinkedIn** | **✅ PRONTO** |
| **5. WhatsApp** | **whatsapp-web.js avançado** | **✅ PRONTO** |
| **6. Autoblog** | **Cron, Agendamento, GitHub Actions** | **✅ PRONTO** |
| 7. Dashboard | Next.js, Gráficos, Calendário | ⏳ |
| **8. Rollback** | **Reversão, Auditoria, Evidências** | **✅ PRONTO** |
| **9. Testes** | **Unit, Integration, E2E** | **✅ PRONTO** |
| 10. Deploy | CI/CD, Documentação | ⏳ |

---

**Projeto:** Ururau | **Autor:** fabri | **Versão:** 1.0.0


## 🎨 Fase 2 — Gerador de Artes (NOVO)

### Como gerar uma arte

```bash
# 1. Certifique-se que o DB está inicializado
node src/backend/cli/autopost.js db-init

# 2. Insira uma notícia de teste (ou use consume-file)
# 3. Gere a arte
node src/backend/cli/autopost.js generate --post-id 1 --template ururau-reels

# Ou use o teste standalone
npm run test:generate
```

### Template Ururau Reels v2.0

Cores extraídas **pixel-a-pixel** da sua arte editável do Canva:
- Overlay gradiente: transparente no topo → escuro 88% na base
- Badge OPINIÃO: `#E63946` (vermelho vibrante)
- Linha decorativa: `#C11F25` (vermelho escuro)
- Título: branco `#FFFFFF`, Montserrat Bold 58px
- Resumo: cinza claro `#E0E0E0`, Inter Regular 28px
- Watermark: `URURAU.COM.BR` com 50% opacidade



## 🧠 Fase 3 — Gerador de Legendas (IA) (NOVO)

### Como gerar legendas

```bash
# Testar com notícia de exemplo
node src/backend/cli/autopost.js caption-test

# Forçar regeneração (ignora cache)
node src/backend/cli/autopost.js caption-test --force

# Teste standalone
npm run test:caption
```

### Estratégia de IA (3 camadas)

1. **Ollama local** (`llama3.2`) — primário, **zero custo**
2. **Gemini API** (`gemini-1.5-flash`) — fallback, **gratuito**
3. **Template estático** — último recurso, **sempre funciona**

### Cache SQLite

Legendas são cacheadas por hash do conteúdo. Segunda chamada para a mesma notícia retorna em < 1ms.



## 🚀 Fase 4 — Publisher Multi-Plataforma (NOVO)

### Como publicar

```bash
# 1. Configure credenciais no .env (veja .env.example)

# 2. Teste conexões (só verifica, não publica)
node src/backend/cli/autopost.js test-connection

# 3. Publique uma notícia
node src/backend/cli/autopost.js publish --post-id 1 --platforms instagram,facebook,whatsapp

# 4. Ou teste o pipeline completo sem publicar real
npm run test:publisher
```

### Plataformas Suportadas

| Plataforma | API | Requer |
|-----------|-----|--------|
| Instagram | Graph API v18.0 | Business/Creator account |
| Facebook | Graph API v18.0 | Page + Page Access Token |
| Twitter/X | API v2 | Developer account |
| LinkedIn | REST API | Access Token |
| WhatsApp | whatsapp-web.js | QR code scan (uma vez) |

### Pipeline de Publicação

```
Notícia na fila → Gera arte → Gera legendas → Publica em N plataformas
                                    ↓
                            Registra no DB + Audit Log
```

**Atomicidade:** Cada plataforma publica independentemente. Se uma falha, as outras continuam.



## 🤖 Fase 5 — Autoblog 24/7 + Scheduler + WhatsApp Avançado (NOVO)

### Autoblog (Publicação Automática)

```bash
# Executa um ciclo manualmente (publica se estiver em time slot)
node src/backend/cli/autopost.js autoblog-run

# Inicia daemon 24/7 no seu PC
node src/backend/cli/autopost.js autoblog-start

# Ou deixe o GitHub Actions rodar na nuvem
# Já configurado em .github/workflows/autoblog.yml
```

**Time slots padrão:** 07:00 | 09:00 | 12:00 | 15:00 | 18:00 | 21:00  
**Limite:** 25 posts/dia | Respeita filtros de categoria e keywords

### Scheduler (Agendamento Manual)

```bash
# Agendar para amanhã às 14h
node src/backend/cli/autopost.js schedule \
  --post-id 1 \
  --date 2026-05-05T14:00:00 \
  --platforms instagram,whatsapp

# Listar
node src/backend/cli/autopost.js schedule-list

# Cancelar
node src/backend/cli/autopost.js schedule-cancel 5
```

### WhatsApp Avançado

```bash
# Descobrir IDs de canais/grupos
node src/backend/cli/autopost.js whatsapp-list-chats

# Adicione os IDs em config/whatsapp-destinations.json
# Depois publique normalmente
```

**Recursos:** QR automático | Sessão persistente | Reconexão (5x) | Formatação (*negrito*) | Delay anti-flood

### GitHub Actions (Cloud 24/7)

3 workflows prontos:
- `autoblog.yml` — publica toda hora
- `scraper-sync.yml` — sincroniza scrapers a cada 30min
- `rollback-alert