@echo off
title VELO - Personal AI Assistant
color 0A
echo ========================================
echo    VELO - Personal AI Assistant
echo ========================================
echo.
cd /d "%~dp0"

:: Check if built
if not exist "dist\main\index.js" (
    echo [INFO] First run detected. Building...
    call npm run build
    if %errorlevel% neq 0 (
        echo [ERROR] Build failed. Try running setup.bat first.
        pause
        exit /b 1
    )
    echo [OK] Build complete!
    echo.
)

echo Starting VELO...
call npm start
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] VELO failed to start.
    echo Try: npm install ^&^& npm run build
    pause
)
