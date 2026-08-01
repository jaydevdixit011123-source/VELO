@echo off
setlocal enabledelayedexpansion
title VELO Setup - Personal AI Assistant
echo ========================================
echo    VELO Setup - Personal AI Assistant
echo ========================================
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
    echo [OK] Node.js found: !NODE_VER!
    echo       Already installed. Skipping Node.js install.
) else (
    echo [INFO] Node.js not found. Opening download page...
    echo       Please install Node.js LTS first from:
    echo       https://nodejs.org
    start https://nodejs.org
    echo.
    echo After installing Node.js, run this setup again.
    pause
    exit /b 1
)
echo.

:: Check npm
where npm >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%v in ('npm -v') do set NPM_VER=%%v
    echo [OK] npm found: v!NPM_VER!
) else (
    echo [ERROR] npm not found. Please reinstall Node.js.
    pause
    exit /b 1
)
echo.

:: Get current directory
set "VELO_DIR=%~dp0"
cd /d "!VELO_DIR!"

echo [STEP 1/3] Installing dependencies...
echo This may take a few minutes...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed. Check your internet connection.
    pause
    exit /b 1
)
echo [OK] Dependencies installed!
echo.

echo [STEP 2/3] Building TypeScript...
call npm run build
if %errorlevel% neq 0 (
    echo [WARN] TypeScript build had issues. Trying to run anyway...
)
echo [OK] Build complete!
echo.

echo [STEP 3/3] Checking Gemini API key...
if not exist ".env" (
    echo.
    echo You need a FREE Gemini API key for AI chat.
    echo Get one here: https://aistudio.google.com/app/apikey
    echo.
    set /p API_KEY="Paste your Gemini API key (or press Enter to skip): "
    if not "!API_KEY!"=="" (
        echo GEMINI_API_KEY=!API_KEY!> .env
        echo [OK] API key saved!
    ) else (
        echo [INFO] Skipped. You can add the key later in Settings ^> API Key.
    )
) else (
    echo [OK] .env file already exists.
)
echo.

echo ========================================
echo    SETUP COMPLETE!
echo    Launching VELO...
echo ========================================
echo.
timeout /t 2 >nul
start "" start.bat
exit /b 0
