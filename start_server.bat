@echo off
title VAANI AI Security Platform - Dev Server
echo ====================================================================
echo             VAANI AI - SECURE SPEECH INTELLIGENCE PLATFORM
echo                     Local Development Server Engine
echo ====================================================================
echo.
echo [INFO] Verifying node_modules and starting Vite environment...
echo [INFO] Access interface at: http://localhost:5173/
echo.
call npm run dev
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Vite server crashed or failed to start.
    echo [ERROR] Ensure Node.js is installed and run 'npm install' first.
    echo.
    pause
)
