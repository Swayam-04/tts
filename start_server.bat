@echo off
title VAANI AI - Production Startup Sequence
echo ====================================================================
echo             VAANI AI - SECURE SPEECH INTELLIGENCE PLATFORM
echo                     Master Startup Sequence
echo ====================================================================

echo.
echo [1/3] Checking Ollama Daemon...
powershell -Command "try { $r = Invoke-WebRequest -Uri http://127.0.0.1:11434/ -UseBasicParsing; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
if %errorlevel% equ 0 (
    echo [OK] Ollama is already running in the background.
) else (
    echo Starting Ollama...
    start "VAANI AI - Ollama" cmd /k "ollama serve"
    echo Waiting for Ollama to become available...
    :wait_ollama
    powershell -Command "try { $r = Invoke-WebRequest -Uri http://127.0.0.1:11434/ -UseBasicParsing; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
    if %errorlevel% neq 0 (
        timeout /t 2 >nul
        goto wait_ollama
    )
    echo [OK] Ollama is online.
)

echo.
echo [2/3] Starting Flask Backend (Chatterbox TTS)...
start "VAANI AI - Flask Backend" cmd /k "cd backend && venv\Scripts\python app.py"

echo Waiting for Flask to become available...
:wait_flask
powershell -Command "try { $r = Invoke-WebRequest -Uri http://127.0.0.1:5000/health -UseBasicParsing; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
if %errorlevel% neq 0 (
    timeout /t 2 >nul
    goto wait_flask
)
echo [OK] Flask is online.

echo.
echo [3/3] Starting React Frontend...
start "VAANI AI - React Frontend" cmd /k "npm run dev"

echo.
echo ====================================================================
echo ALL SERVICES STARTED SUCCESSFULLY!
echo Access the application at: http://localhost:5173/
echo ====================================================================
echo.
pause
