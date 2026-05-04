# URURAU REELS - GitHub Deploy Script
# Execute no PowerShell na pasta do projeto

$repoUrl = "https://github.com/fabriciogoverno/ururau-reels-v8.git"
$branch = "main"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  URURAU REELS - GitHub Deploy" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar git
try {
    $gitVersion = git --version 2>$null
    Write-Host "Git encontrado: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "ERRO: Git nao encontrado. Instale em https://git-scm.com/download/win" -ForegroundColor Red
    pause
    exit 1
}

# Verificar se eh repositorio git
if (-not (Test-Path ".git")) {
    Write-Host "Inicializando repositorio git..." -ForegroundColor Yellow
    git init
    git branch -M $branch
}

# Verificar remote
$remote = git remote -v 2>$null
if (-not $remote) {
    Write-Host "Configurando remote..." -ForegroundColor Yellow
    git remote add origin $repoUrl
}

# Verificar se existem mudancas
$status = git status --porcelain
if (-not $status) {
    Write-Host "Nenhuma alteracao para commitar." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Deseja forcar push mesmo assim? (S/N)" -ForegroundColor Cyan
    $force = Read-Host
    if ($force -ne "S" -and $force -ne "s") {
        exit 0
    }
} else {
    Write-Host "Arquivos modificados:" -ForegroundColor Yellow
    git status --short
    Write-Host ""

    # Adicionar tudo
    Write-Host "Adicionando arquivos..." -ForegroundColor Green
    git add .

    # Commit
    $msg = Read-Host "Digite a mensagem do commit (ENTER para 'v9 update')"
    if (-not $msg) { $msg = "v9 update" }

    Write-Host "Fazendo commit..." -ForegroundColor Green
    git commit -m "$msg"
}

# Push
Write-Host ""
Write-Host "Enviando para GitHub..." -ForegroundColor Green
Write-Host "URL: $repoUrl" -ForegroundColor Gray
Write-Host "Branch: $branch" -ForegroundColor Gray
Write-Host ""

try {
    git push origin $branch
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "  DEPLOY COMPLETO!" -ForegroundColor Green
    Write-Host "  https://github.com/fabriciogoverno/ururau-reels-v8" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "ERRO no push. Tentando com --force..." -ForegroundColor Red
    git push origin $branch --force
}

Write-Host ""
Write-Host "Pressione qualquer tecla para sair..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
