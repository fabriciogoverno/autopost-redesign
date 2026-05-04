# AutoPost Ururau — Guia de Deploy

**Versao:** 1.0.0 | **Autor:** fabri | **Projeto:** Ururau Noticias

---

## Deploy Rapido (Windows)

### Opcao 1: Instalador Automatico (Recomendado)

```batch
:: 1. Extraia o ZIP
:: 2. Execute o instalador
install.bat

:: 3. Siga as instrucoes na tela
:: 4. Pronto!
```

### Opcao 2: Setup Interativo

```bash
node setup.js
```

### Opcao 3: Manual

```bash
# 1. Instalar dependencias
npm install
cd src/dashboard && npm install && cd ..\..

# 2. Inicializar banco
node src/backend/core/database.js --init

# 3. Configurar .env
copy .env.example .env
:: Edite .env com suas credenciais

# 4. Testar
npm run test

# 5. Iniciar
npm run server      # API na porta 3001
npm run dashboard   # Dashboard na porta 3000
```

---

## Deploy com Docker

### Requisitos
- Docker 24.x+
- Docker Compose 2.x+

### Subir tudo

```bash
# 1. Clone/extraia o projeto
cd autopost-ururau

# 2. Subir servicos
docker-compose up -d

# 3. Verificar status
docker-compose ps

# 4. Logs
docker-compose logs -f autopost-api
```

### Servicos

| Servico | Porta | Funcao |
|---------|-------|--------|
| autopost-api | 3001 | API REST + Autoblog |
| autopost-dashboard | 3000 | Interface web Next.js |
| ollama | 11434 | IA local (llama3.2) |

### Baixar modelo Ollama

```bash
docker-compose exec ollama ollama pull llama3.2
```

---

## Deploy GitHub Actions (Cloud 24/7)

### Configurar Secrets

Va em **Settings -> Secrets and variables -> Actions** e adicione:

| Secret | Onde obter |
|--------|-----------|
| `INSTAGRAM_ACCOUNT_ID` | Meta Business Suite -> Configuracoes da conta |
| `INSTAGRAM_ACCESS_TOKEN` | Meta Graph API Explorer -> Gerar token longo |
| `FACEBOOK_PAGE_ID` | Pagina do Facebook -> Configuracoes -> Informacoes |
| `FACEBOOK_ACCESS_TOKEN` | Graph API Explorer -> Page Access Token |
| `TWITTER_API_KEY` | developer.twitter.com -> Keys and Tokens |
| `TWITTER_API_SECRET` | developer.twitter.com -> Keys and Tokens |
| `TWITTER_ACCESS_TOKEN` | developer.twitter.com -> Keys and Tokens |
| `TWITTER_ACCESS_SECRET` | developer.twitter.com -> Keys and Tokens |
| `LINKEDIN_ACCESS_TOKEN` | developer.linkedin.com -> Access Token |
| `GEMINI_API_KEY` | aistudio.google.com/app/apikey |

### Workflows Ativos

| Workflow | Trigger | Funcao |
|----------|---------|--------|
| `autoblog.yml` | A cada hora | Publica posts automaticamente |
| `scraper-sync.yml` | A cada 30min | Sincroniza noticias dos scrapers |
| `rollback-alert.yml` | Manual | Alerta de rollback + GitHub Issue |

---

## Configuracao de APIs

### Instagram (Obrigatorio para Reels)

1. Crie uma conta **Business** ou **Creator** no Instagram
2. Va em [Meta Business Suite](https://business.facebook.com)
3. Conecte sua conta Instagram
4. Acesse [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
5. Gere um **Long-Lived Token** com permissoes:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_read_engagement`

```env
INSTAGRAM_ACCOUNT_ID=17841400000000000
INSTAGRAM_ACCESS_TOKEN=EAAxxx...
```

### Facebook

1. Crie uma pagina no Facebook
2. Acesse [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
3. Selecione sua pagina
4. Gere Page Access Token com:
   - `pages_manage_posts`
   - `pages_read_engagement`

```env
FACEBOOK_PAGE_ID=123456789
FACEBOOK_ACCESS_TOKEN=EAAxxx...
```

### Twitter/X

1. Acesse [developer.twitter.com](https://developer.twitter.com)
2. Crie um projeto e app
3. Gere keys no portal:
   - API Key & Secret
   - Access Token & Secret

```env
TWITTER_API_KEY=xxx
TWITTER_API_SECRET=xxx
TWITTER_ACCESS_TOKEN=xxx
TWITTER_ACCESS_SECRET=xxx
```

### LinkedIn

1. Acesse [developer.linkedin.com](https://developer.linkedin.com)
2. Crie um app
3. Solicite permissoes:
   - `w_member_social` (posts pessoais)
   - `w_organization_social` (posts de pagina)
4. Gere Access Token OAuth 2.0

```env
LINKEDIN_ACCESS_TOKEN=AQVxxx...
```

### WhatsApp (whatsapp-web.js)

1. Execute uma vez para escanear QR:
```bash
node src/backend/cli/autopost.js whatsapp-list-chats
```

2. Escaneie o QR com seu celular
3. A sessao sera salva automaticamente
4. Configure destinos em `config/whatsapp-destinations.json`

### Ollama (IA Local — Gratuito)

```bash
# Windows/Mac/Linux
# Baixe em: https://ollama.com

ollama pull llama3.2
ollama serve
```

Verifique se esta rodando:
```bash
curl http://localhost:11434/api/tags
```

### Gemini (Fallback — Gratuito)

1. Acesse [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Crie uma API Key
3. Adicione ao `.env`:

```env
GEMINI_API_KEY=sua_chave_aqui
```

---

## Comandos Uteis

```bash
# Iniciar tudo
npm run server          # API REST
npm run dashboard       # Dashboard web
npm run autoblog:start  # Autoblog 24/7 local

# Testar
npm run test            # Suite completa
npm run test:unit       # Unitarios
npm run test:e2e        # E2E

# Operacoes
node src/backend/cli/autopost.js publish --post-id 1 --platforms instagram,whatsapp
node src/backend/cli/autopost.js rollback 123 --reason "erro"
node src/backend/cli/autopost.js schedule --post-id 1 --date 2026-05-05T14:00:00

# Manutencao
node src/backend/cli/autopost.js db-backup
node src/backend/cli/autopost.js stats
```

---

## Seguranca

- **Nunca** commite o arquivo `.env`
- Use `URURAU_MASTER_KEY` para criptografia de credenciais
- Faca backup diario do SQLite: `node src/backend/cli/autopost.js db-backup`
- GitHub Actions usa Secrets criptografados
- Tokens de API devem ser rotacionados a cada 90 dias

---

## Suporte

| Recurso | Local |
|---------|-------|
| Documentacao | `README.md` |
| Deploy | `DEPLOY.md` (este arquivo) |
| Especificacao | `spec_autopost_ururau.md` |
| Relatorios | `output/reports/` |
| Logs | `audit_log` no SQLite |

---

**Deploy concluido?** Execute `npm run test` para validar tudo.
