@echo off
title VAANI AI Security Platform - Backend Engine
echo ====================================================================
echo             VAANI AI - SECURE SPEECH INTELLIGENCE PLATFORM
echo                      Flask Backend Service Engine
echo ====================================================================
echo.
echo [INFO] Directing loopback server startup...
echo.
cd backend
python app.py
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Flask server failed to start.
    echo [ERROR] Ensure Python is installed and run 'pip install -r requirements.txt' first.
    echo.
    pause
)
