@echo off
echo ==================================
echo    VELO v2.2 - Personal AI Assistant
echo    Pure JS - No native modules!
echo ==================================
echo.
echo Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js not found! Please install from https://nodejs.org
    pause
    exit /b 1
)
echo Node.js found.
echo.
echo Installing dependencies (takes ~2 min)...
echo This only needs electron + groq-sdk (pure JS, NO native compilation!)
echo.
call npm install
if %errorlevel% neq 0 (
    echo.
    echo INSTALL FAILED. Try running as Administrator or check internet.
    pause
    exit /b 1
)
echo.
echo Setup complete! Starting VELO...
echo.
echo [TIP] Get your FREE Groq API key: https://console.groq.com/keys
echo [TIP] In Settings, paste your key (starts with gsk_...)
echo [TIP] Say "Hey Velo" or press Ctrl+M for voice
echo.
npx electron .
pause
