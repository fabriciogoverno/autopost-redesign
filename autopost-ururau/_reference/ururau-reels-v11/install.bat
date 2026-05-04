@echo off
cd /d "%~dp0"
echo ==========================================
echo  URURAU REELS - Windows Installer
echo ==========================================
echo.

echo Checking Node.js...
node -v >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found. Install Node.js 20+ first.
    pause
    exit /b 1
)

echo Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed.
    pause
    exit /b 1
)

echo Initializing database...
node src/db.js --init
if errorlevel 1 (
    echo ERROR: Failed to create database.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo  INSTALL COMPLETE
echo ==========================================
echo.
echo To start: npm start
echo Open: http://localhost:3000
echo.
pause
