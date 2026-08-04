@echo off
title VELO
cd /d "%~dp0"
echo Starting VELO...
if not exist node_modules\electron (
  echo Dependencies missing. Running setup first...
  call setup.bat
)
call npx electron .
