@echo off
title VELO - Personal AI Assistant
echo Starting VELO...
cd /d "%~dp0"
call npm start
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] VELO failed to start.
    echo Try running setup.bat first.
    pause
)
