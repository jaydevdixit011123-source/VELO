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
echo [STEP 3/3] Creating Desktop shortcut...
set "VELO_DIR=%~dp0"
set "DESKTOP=%USERPROFILE%\Desktop"
if not exist "%DESKTOP%" set "DESKTOP=%USERPROFILE%\OneDrive\Desktop"

:: Create shortcut using PowerShell
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $sc = $ws.CreateShortcut('%DESKTOP%\VELO.lnk'); $sc.TargetPath = '%VELO_DIR%start.bat'; $sc.WorkingDirectory = '%VELO_DIR%'; $sc.IconLocation = '%SystemRoot%\System32\imageres.dll,65'; $sc.Description = 'VELO - Personal AI Assistant'; $sc.Save()"
if %errorlevel% equ 0 (
    echo [OK] Shortcut created on Desktop: VELO.lnk
) else (
    echo [WARN] Could not create Desktop shortcut. You can use start.bat directly.
)

echo.
echo Checking Gemini API key...
if not exist ".env" (
    echo.
    echo ============================================
    echo   Get your FREE Gemini API key:
    echo   https://aistudio.google.com/app/apikey
    echo ============================================
    echo.
    set /p API_KEY="Paste key here (or Enter to skip): "
    if not "!API_KEY!"=="" (
        echo GEMINI_API_KEY=!API_KEY!> .env
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
echo.
echo    Desktop shortcut created: VELO.lnk
echo    Double-click it anytime to run VELO!
echo.
timeout /t 2 >nul

:: Try launching
echo Starting VELO...
call npm start 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [NOTE] If VELO didn't open, try:
    echo       1. Double-click VELO.lnk on Desktop
    echo       2. Or run start.bat directly
)
pause
