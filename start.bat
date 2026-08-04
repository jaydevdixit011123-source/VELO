@echo off
title VELO
cd /d "%~dp0"

if not exist "node_modules\.bin\electron.cmd" (
  echo [!] Dependencies missing. Running setup...
  call setup.bat
  if errorlevel 1 exit /b 1
)

echo Starting VELO...
call npm start
if errorlevel 1 (
  echo.
  echo [!] VELO crashed. Check velo.log for details.
  echo.
  pause
)
