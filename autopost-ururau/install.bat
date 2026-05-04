@echo off
title AutoPost Ururau - Instalador
cls

echo ============================================
echo  AUTOPOST URURAU - Instalador Windows
echo  Projeto: Ururau Noticias
echo  Autor: fabri
echo ============================================
echo.

echo [1/6] Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Node.js nao encontrado!
    echo Baixe em: https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js encontrado
echo.

echo [2/6] Verificando npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] npm nao encontrado!
    pause
    exit /b 1
)
echo [OK] npm encontrado
echo.

echo [3/6] Instalando dependencias do backend...
call npm install
if errorlevel 1 (
    echo [ERRO] Falha na instalacao do backend
    pause
    exit /b 1
)
echo [OK] Backend instalado
echo.

echo [4/6] Instalando dependencias do dashboard...
cd src\dashboard
call npm install
if errorlevel 1 (
    echo [ERRO] Falha na instalacao do dashboard
    pause
    exit /b 1
)
cd ..\..
echo [OK] Dashboard instalado
echo.

echo [5/6] Inicializando banco de dados...
node src\backend\core\database.js --init
if errorlevel 1 (
    echo [ERRO] Falha ao inicializar database
    pause
    exit /b 1
)
echo [OK] Database criado
echo.

echo [6/6] Configurando ambiente...
if not exist .env (
    copy .env.example .env
    echo [INFO] Arquivo .env criado. Edite com suas credenciais.
)
echo [OK] Ambiente configurado
echo.

echo [BONUS] Testando hash...
node src\backend\cli\autopost.js hash-test
echo.

echo ============================================
echo  INSTALACAO CONCLUIDA!
echo ============================================
echo.
echo Proximos passos:
echo 1. Edite .env com suas credenciais
echo 2. node src\backend\cli\autopost.js test-connection
echo 3. npm run server
echo 4. npm run dashboard
echo.
echo Comandos uteis:
echo   npm run test
echo   npm run autoblog:start
echo   npm run dashboard
echo.
pause
imos passos:
echo 1. Edite .env com suas credenciais de APIs
echo 2. Rode: node src/backend/cli/autopost.js test-connection
echo 3. Inicie o servidor: npm run server
echo 4. Acesse o dashboard: npm run dashboard
echo.
echo Comandos uteis:
echo   - npm run test              (rodar testes)
echo   - npm run autoblog:start    (iniciar 24/7)
echo   - npm run dashboard         (abrir painel web)
echo.
pause
