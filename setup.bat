@echo off
title VELO - Setup
echo.
echo  ================================================
echo    VELO v3.0  -  Easy One-Click Setup
echo  ================================================
echo.
cd /d "%~dp0"

echo  [1/3] Checking Node.js...
node -v >nul 2>nul
if errorlevel 1 (
  echo  [!] Node.js is NOT installed.
  echo  Please install it from https://nodejs.org (LTS version), then run this again.
  echo  Opening download page...
  start https://nodejs.org
  pause
  exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do echo  [+] Node.js %%v found.

echo  [2/3] Installing dependencies (this may take a minute)...
call npm install
if errorlevel 1 (
  echo  [!] npm install failed. Check your internet connection.
  pause
  exit /b 1
)

echo  [3/3] Setup complete!
echo.
echo  To run VELO: open start.bat  (double-click)
echo.
echo  Tip: Add a FREE Groq key (console.groq.com) in Settings for full AI chat.
echo        Without it, VELO still runs in free Local Mode.
echo.
pause
