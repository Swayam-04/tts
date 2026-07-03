# 🎙️ VAANI AI – Offline Secure Speech Intelligence Platform

VAANI AI is an offline speech intelligence platform that converts coded missile information into natural English using a local LLM (Ollama) and generates speech using Chatterbox TTS.

---

# Architecture

```
                User
                  │
                  ▼
        React + Vite Frontend
                  │
          HTTP (Port 5000)
                  │
          Flask Backend API (with built-in Chatterbox TTS)
                  │
      ┌───────────┴────────────┐
      ▼                        │
 Ollama LLM                    │
 (Port 11434)                  │
      │                        │
      └──────────► WAV Audio ◄─┘
```

---

# Project Structure

```
VAANI-AI/
│
├── src/               # React Frontend code
├── package.json       # React dependencies
├── vite.config.js     # Frontend builder
│
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   ├── services/
│   │   ├── chatterbox_service.py # TTS Engine
│   │   └── ollama_service.py     # LLM Engine
│   └── ...
│
├── start_server.bat   # Automated Master Startup Script
└── README.md
```

---

# Requirements

## Operating System

- Windows 11
- Windows 10

---

## Software

Install:

- Python 3.11.x
- Node.js 22+
- Git
- Ollama
- Visual Studio C++ Redistributable

*(Note: FFmpeg is no longer required as audio is generated as native WAV format)*

---

# Installation

## 1. Install Backend Dependencies

Inside the `backend` folder:

```cmd
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

If `requirements.txt` is unavailable:

```cmd
pip install flask flask-cors requests python-dotenv torch torchaudio chatterbox-tts
```

---

## 2. Install Frontend Dependencies

At the root directory (where `package.json` is located):

```cmd
npm install
```

---

## 3. Install Ollama & Llama Model

Download Ollama from [ollama.com](https://ollama.com/download)

Verify installation:

```cmd
ollama --version
```

Pull the local AI model:

```cmd
ollama pull llama3.2:3b
```

Verify it downloaded successfully:

```cmd
ollama list
```

---

# Running VAANI AI

## Automated Startup (Recommended)

Simply run the master startup script from the root directory:

```cmd
start_server.bat
```

This will automatically launch Ollama, the Flask/Chatterbox Backend, and the React Frontend in independent windows.

## Manual Startup Order

If you prefer to start services manually, strictly follow this order:

### Terminal 1: LLM Engine
```cmd
ollama serve
```

### Terminal 2: Flask Backend (TTS & API)
```cmd
cd backend
venv\Scripts\python app.py
```
*(Runs at http://127.0.0.1:5000)*

### Terminal 3: React Frontend
```cmd
npm run dev
```
*(Runs at http://localhost:5173)*

---

# Verify Services

## Ollama
```cmd
curl http://localhost:11434/api/tags
```

## Flask / Chatterbox
```cmd
curl http://127.0.0.1:5000/health
```
Should return:
```json
{
  "status": "ok",
  "tts": "chatterbox"
}
```

---

# API Flow

```text
Frontend
   ↓
Flask
   ↓
Ollama (Generates natural English text)
   ↓
Chatterbox TTS (Converts chunks of text to tensors)
   ↓
WAV Audio (Concatenated PyTorch audio sequence)
   ↓
Frontend Player
```

---

# Common Errors

## 500 Internal Server Error
Check if both the Flask backend and Ollama daemon are actively running.

## Backend Offline
Restart the Flask server using:
```cmd
cd backend
venv\Scripts\python app.py
```

## Ollama Connection Refused
Check your available models:
```cmd
ollama list
```
If `llama3.2:3b` is missing, run:
```cmd
ollama pull llama3.2:3b
```

## Port Already In Use
Find the blocking process:
```cmd
netstat -ano | findstr :5000
```
Kill it:
```cmd
taskkill /PID <PID> /F
```

---

# Developed By

**VAANI AI – Offline Secure Speech Intelligence Platform**

Powered by:
- React
- Flask
- Ollama
- Chatterbox TTS
- Llama 3.2 3B
