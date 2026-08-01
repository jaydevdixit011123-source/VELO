@echo off
setlocal enabledelayedexpansion
title VELO Setup - Personal AI Assistant
color 0A
echo ============================================
echo    VELO v2.0 - Personal AI Assistant
echo    100%% FREE  -  Powered by Groq
echo ============================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js nahi mila. Install karo: https://nodejs.org
    start https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do echo [OK] Node.js: %%v

cd /d "%~dp0"
echo.
echo [1/3] Installing dependencies (1-2 min)...
call npm install --no-audit --no-fund
if %errorlevel% neq 0 (
    call npm install --force --no-audit --no-fund
    if %errorlevel% neq 0 (
        echo [FATAL] Install fail. Internet check karo.
        pause
        exit /b 1
    )
)
echo [OK] Dependencies installed!

echo.
echo [2/3] Building...
call npx tsc
if %errorlevel% neq 0 (
    echo [WARN] Build me issue aaya, run karne ki koshish kar raha hoon...
) else (
    echo [OK] Build complete!
)

echo.
echo [3/3] Starting VELO...
echo.
echo NOTE: Pehli baar me Settings - Groq API key daalo (FREE):
echo       https://console.groq.com/keys
echo.
call npm start
pause
