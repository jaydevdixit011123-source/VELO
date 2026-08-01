@echo off
setlocal enabledelayedexpansion
title VELO Setup - Personal AI Assistant
color 0A
echo ========================================
echo    VELO Setup - Personal AI Assistant
echo    Powered by Groq - 100%% FREE
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
echo [STEP 1/3] Installing dependencies...
echo VELO uses built-in Node.js - no native modules needed!
call npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    call npm install --force
    if %errorlevel% neq 0 (
        echo [FATAL] Could not install. Check internet.
        pause
        exit /b 1
    )
)
echo [OK] Dependencies installed!

echo.
echo [STEP 2/3] Building TypeScript...
call npx tsc
if %errorlevel% neq 0 (
    echo [WARN] TypeScript build had issues. Trying to run anyway...
) else (
    echo [OK] Build complete!
)

echo.
echo [STEP 3/3] Setting up...

:: Check for Groq API key
if not exist ".env" (
    echo.
    echo =============================================
    echo   Get your FREE Groq API key:
    echo   https://console.groq.com/keys
    echo   Sign up with Google - NO credit card!
    echo =============================================
    echo.
    set /p API_KEY="Paste your Groq API key (or press Enter to skip): "
    if not "!API_KEY!"=="" (
        echo GROQ_API_KEY=!API_KEY!> .env
        echo [OK] Key saved!
    ) else (
        echo [INFO] Skipped. You can add key later in VELO Settings.
    )
) else (
    echo [OK] API key already configured.
)

:: Create Desktop Shortcut
echo.
echo Creating Desktop shortcut...
set "VELO_DIR=%~dp0"
set "SHORTCUT_PATH=%USERPROFILE%\Desktop\VELO.lnk"
set "BAT_PATH=!VELO_DIR!start.bat"

powershell -NoProfile -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut('!SHORTCUT_PATH!');$s.TargetPath='!BAT_PATH!';$s.WorkingDirectory='!VELO_DIR!';$s.Description='VELO - Personal AI Assistant';$s.Save()"

if exist "!SHORTCUT_PATH!" (
    echo [OK] Shortcut created on Desktop: VELO.lnk
) else (
    echo [INFO] Could not create shortcut. Run start.bat directly.
)

echo.
echo ========================================
echo   SETUP COMPLETE! Launching VELO...
echo ========================================
echo.
call npm start
pause
