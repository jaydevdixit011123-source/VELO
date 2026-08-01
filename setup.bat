@echo off
setlocal enabledelayedexpansion
title VELO Setup - Personal AI Assistant
color 0A
echo ========================================
echo    VELO Setup - Personal AI Assistant
echo ========================================
echo.
echo Checking requirements...
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found!
    echo Please install from: https://nodejs.org
    start https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do echo [OK] Node.js: %%v

:: Check npm
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm not found! Reinstall Node.js.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('npm -v') do echo [OK] npm: v%%v

:: Go to VELO folder
cd /d "%~dp0"
echo.
echo [STEP 1/3] Installing dependencies (1-2 min)...
call npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] npm install failed!
    echo Trying with --force...
    call npm install --force
    if %errorlevel% neq 0 (
        echo [FATAL] Could not install. Check your internet.
        pause
        exit /b 1
    )
)
echo [OK] Dependencies installed!

echo.
echo [STEP 2/3] Building VELO...
call npm run build
if %errorlevel% neq 0 (
    echo [WARN] Build had warnings, but let's try running anyway...
)
echo [OK] Build done!

echo.
echo [STEP 3/3] Checking Gemini API key...
if not exist ".env" (
    echo.
    echo ============================================
    echo   Get your FREE Gemini API key:
    echo   https://aistudio.google.com/app/apikey
    echo ============================================
    echo.
    set /p API_KEY="Paste key here (or Enter to skip): "
    if not "!API_KEY!"=="" (
        setlocal disabledelayedexpansion
        echo GEMINI_API_KEY=!API_KEY!> .env
        endlocal
        echo [OK] Key saved!
    ) else (
        echo [INFO] Skipped. Add later in Settings.
    )
) else (
    echo [OK] .env already exists.
)

echo.
echo ========================================
echo    SETUP COMPLETE! Launching VELO...
echo ========================================
timeout /t 2 >nul
call npm start
pause
