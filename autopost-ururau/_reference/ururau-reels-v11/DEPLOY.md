# Deploy para GitHub

## Requisitos

- Git instalado: https://git-scm.com/download/win
- Conta no GitHub: https://github.com
- Repositorio criado no GitHub (ex: `fabriciogoverno/ururau-reels`)

## Configuracao Inicial (uma vez)

```bash
# 1. Configure seu usuario git
git config --global user.name "Seu Nome"
git config --global user.email "seu@email.com"

# 2. No diretorio do projeto, configure o remote
git remote add origin https://github.com/SEU_USUARIO/ururau-reels.git

# 3. Ou use SSH (mais seguro)
git remote add origin git@github.com:SEU_USUARIO/ururau-reels.git
```

## Deploy Automatico (Windows)

Execute no PowerShell:
```powershell
.\deploy-github.bat
```

Ou manualmente:
```bash
git add .
git commit -m "update"
git push origin main
```

## CI/CD GitHub Actions

O arquivo `.github/workflows/ci.yml` roda automaticamente a cada push:
- Instala dependencias
- Inicializa banco
- Roda testes
- Verifica template

## Estrutura no GitHub

```
ururau-reels/
├── .github/
│   └── workflows/
│       └── ci.yml          ← CI/CD automatico
├── public/
│   └── assets/
│       └── template-base.png
├── src/
│   ├── server.js
│   ├── generator.js
│   ├── template.js
│   └── ...
├── templates/
│   ├── ururau-reels.json
│   └── backups/
├── deploy-github.bat       ← Script deploy Windows
└── README.md
```

## Token de Acesso (se necessario)

Se o push pedir senha, use um Personal Access Token:
1. GitHub → Settings → Developer settings → Personal access tokens
2. Gere um token com permissao `repo`
3. Use o token como senha no git push
