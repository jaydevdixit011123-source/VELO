@echo off
title VELO v3.1 - Setup
echo.
echo  ================================================
echo    VELO v3.1 - One-Click Setup
echo  ================================================
echo.
cd /d "%~dp0"

echo  [1/3] Checking Node.js...
node -v >nul 2>nul
if errorlevel 1 (
  echo  [!] Node.js NOT found. Installing from nodejs.org...
  start https://nodejs.org
  echo  Please install Node.js LTS, then run this again.
  pause
  exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do echo  [+] Node %%v found.

echo  [2/3] Installing Electron (one-time, ~2 min)...
call npm install
if errorlevel 1 (
  echo  [!] Install failed. Check internet and try again.
  pause
  exit /b 1
)

echo  [3/3] Done!
echo.
echo  ================================================
echo  Double-click start.bat to launch VELO!
echo.
echo  Tip: Get a FREE Groq API key at console.groq.com
echo        Add it in Settings for full AI chat.
echo  ================================================
pause
