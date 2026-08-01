@echo off
title VELO - Setup
echo ============================================
echo   VELO - Personal AI Assistant Setup
echo ============================================
echo.
echo This will install everything you need for VELO.
echo.
echo Step 1: Check if Node.js is installed...
node --version >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERROR] Node.js not found. Please install it first.
  echo Download from: https://nodejs.org (LTS version)
  pause
  exit /b 1
)
echo [OK] Node.js found.
echo.
echo Step 2: Check if Git is installed...
git --version >nul 2>&1
if %errorlevel% neq 0 (
  echo [WARN] Git not found. Installing via npm is fine, but GitHub features need Git.
  echo Install from: https://git-scm.com
)
echo.
echo Step 3: Installing dependencies (this takes a minute)...
call npm install
if %errorlevel% neq 0 (
  echo [ERROR] npm install failed.
  pause
  exit /b 1
)
echo [OK] Dependencies installed.
echo.
echo Step 4: Building the app...
call npx tsc
echo [OK] Build complete.
echo.
echo ============================================
echo VELO is ready! Starting now...
echo.
echo Tip: To get a free Gemini API key, visit:
echo      https://aistudio.google.com/app/apikey
echo      (Then open VELO Settings and paste it)
echo ============================================
echo.
call npm start
pause
