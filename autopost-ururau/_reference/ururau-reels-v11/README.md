# Ururau Reels — Autopost para Instagram

Sistema gratuito de autopost para Instagram Reels do portal Ururau (19 anos).

## Requisitos

- Node.js 20+ (voce ja tem v24.14.1)
- Windows 10/11
- Gemini API Key (gratuita em https://makersuite.google.com/app/apikey)

## Instalacao Rapida

```bash
# 1. Extraia o ZIP
# 2. Abra PowerShell na pasta
# 3. Execute:
.\install.bat

# Ou manualmente:
npm install
node src/db.js --init
npm start
```

Acesse http://localhost:3000

## Template do Canva

O arquivo `public/assets/template-base.png` e o template vazio exportado do seu projeto Canva.
Ele contem: logo ururau, 19 ANOS, icone U, overlay, watermark.
O sistema sobrepoe por cima: badge de categoria (dinamico), titulo e subtitulo.

Fontes usadas (iguais ao Canva):
- Titulo: Aileron bold 60.8px
- Subtitulo: Aileron normal 32.3px

Se a fonte Aileron nao estiver instalada no Windows, o sistema usa Arial como fallback.

## Configuracao

1. Va em "Config" no menu lateral
2. Insira sua Gemini API Key
3. Insira credenciais do Instagram
4. Defina horarios do Autoblog (padrao: 07:00,09:00,12:00,15:00,18:00,21:00)
5. Ative Autoblog 24/7 se desejar
6. Salve e reinicie o servidor

## Funcionalidades

- **Dashboard**: Stats em tempo real, ultimas publicacoes
- **Nova Reels**: URL da noticia, extracao automatica, preview da arte, preview da legenda
- **Calendario**: Visualizacao mensal de publicacoes agendadas
- **Logs**: Historico de execucao com niveis info/error/success
- **Configuracoes**: Gemini API, Instagram, horarios, Autoblog

## Stack (Windows 100%)

| Tecnologia | Funcao |
|-----------|--------|
| Express | API REST |
| Sharp | Geracao de imagens 1080x1920 (binarios Windows prontos) |
| Puppeteer | Publicacao no Instagram via browser |
| Google Gemini | Geracao de legendas com IA |
| node-cron | Agendamento Autoblog 24/7 |
| cheerio | Scraping de noticias |

## Comandos

```bash
npm start          # Inicia servidor + interface
npm run init-db    # Reinicializa banco de dados
npm test           # Executa testes basicos
```

## Arquitetura

```
ururau-reels/
├── public/          # Interface web + assets
│   └── assets/
│       └── template-base.png   ← Template vazio do Canva
├── src/
│   ├── server.js    # Express API
│   ├── db.js        # JSON database
│   ├── generator.js # Sharp: gera Reels PNG usando template Canva
│   ├── caption.js   # Gemini: legenda Reels
│   ├── instagram.js # Puppeteer: publica Instagram
│   ├── scraper.js   # cheerio: extrai noticias
│   ├── scheduler.js # node-cron: Autoblog 24/7
│   ├── hash.js      # SHA-256 duplicidade
│   └── test.js      # Testes
├── templates/       # Config do template
├── output/reels/    # PNGs gerados
└── database/        # JSON database
```

## Instagram

O sistema usa Puppeteer para abrir o Instagram no Chrome, fazer login (com cookies persistentes) e publicar a imagem 9:16 como post de feed. A primeira execucao abre o browser visivel para voce verificar o login.

## Suporte

Gestor: fabri | Portal Ururau | Campos dos Goytacazes/RJ


## GitHub Deploy

### Repositorio
https://github.com/fabriciogoverno/ururau-reels-v8

### Deploy Rapido (Windows)
```powershell
# Na pasta do projeto, execute:
.\deploy-github.bat
# Ou direto no PowerShell:
powershell -ExecutionPolicy Bypass -File deploy.ps1
```

### Manual
```bash
git add .
git commit -m "v9 update"
git push origin main
```

### CI/CD
O arquivo `.github/workflows/ci.yml` roda automaticamente a cada push:
- Instala dependencias
- Inicializa banco
- Roda testes
- Verifica template
