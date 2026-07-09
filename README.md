# 🎙️ VAANI – Offline Secure Speech Intelligence Platform

VAANI is an air-gapped, offline speech intelligence platform that converts coded missile information into natural English using a local LLM (Ollama) and generates high-fidelity speech using Chatterbox TTS.

### 🌟 Key Features
- **⚡ Real-Time Processing Telemetry**: Displays exact processing times for every stage with emoji badges (Response Time, Gemma 4, Chatterbox, MP3 Encoding, Audio Length).
- **📝 Spoken Text Transcription Overlay**: Dynamic transcription blocks inside the custom audio player synchronized with the current playback time.
- **📂 Persistent SQLite Audio Logs**: Database persistence logs storing configurations (speed, voice, duration, response time) with automated self-healing duration computation on startup.
- **🎨 Brand Alignment**: Soundwave vector assets replacement and unified interface style.
- **🌐 Offline Dual Speech Output**: Real-time generation of English speech and on-demand translation to natural Hindi speech with single-language Chatterbox models.

---

# Architecture

```
                User
                  │
                  ▼
        React + Vite Frontend
                  │
                  ▼
           HTTP (Port 5000)
                  │
                  ▼
    Flask Backend API (with built-in Chatterbox TTS)
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
    Ollama LLM       Chatterbox TTS
  (Port 11434)      (Local PyTorch)
   Gemma 4 model    (EN & HI Single Packs)
        │                   │
        └─────────┬─────────┘
                  ▼
              MP3 Audio
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
│   ├── app.py         # Main Flask Server
│   ├── config.py      # App configurations
│   ├── exceptions.py  # Error classes
│   ├── logger.py      # Setup logging
│   ├── pipeline.py    # Pipeline Orchestration
│   ├── requirements.txt # Python dependencies
│   ├── memory/
│   │   └── memory.py  # SQLite DB & history helpers
│   ├── routes/
│   │   ├── api.py     # Main endpoints (speech, history, logs)
│   │   └── documents.py # Document analysis & RAG endpoints
│   ├── services/
│   │   ├── chatterbox_service.py # TTS Engine
│   │   └── ollama_service.py     # LLM Engine & translation
│   └── instance/
│       └── vaani.db   # Local SQLite Database
│
└── README.md          # Setup & Installation documentation
```

---

# 🔎 Verify Prerequisites

Before installing the platform, verify that the required prerequisite software is installed on your system using the following verification commands:

| Software | Check Command | Expected Output |
| :--- | :--- | :--- |
| **Python** | `python --version` | Python 3.10.x or 3.11.x |
| **Pip** | `pip --version` | pip 23.x or later |
| **Node.js** | `node --version` | v20.x or later |
| **npm** | `npm --version` | 10.x or later |
| **Git** | `git --version` | git version 2.x |
| **Ollama** | `ollama --version` | ollama version 0.x.x |
| **uv** | `uv --version` | uv 0.x.x (Python package manager, optional) |
| **FFmpeg** | `ffmpeg -version` | FFmpeg version 4.x or later |
| **SQLite** | `sqlite3 --version` | SQLite version 3.x.x |

---

# 🧠 Verify Installed AI Models

To confirm that the offline Gemma LLM is downloaded and available to Ollama, run:

```bash
ollama list
```

Make sure the required model name **`gemma4`** appears in the output list:

```
NAME            ID              SIZE      MODIFIED
gemma4:latest   xxxxxxxxx       9.6 GB    xxx ago
```

---

# 🚀 Offline Installation Guide

Follow these steps to configure the backend virtual environment, Chatterbox TTS engine, and Vite React client on your local machine.

## Step 1: Clone the Repository
Open your Terminal or Command Prompt, navigate to your target folder, and clone the repository:

```bash
git clone https://github.com/Swayam-04/tts.git
cd tts
```

## Step 2: Set Up Backend & Chatterbox TTS
Chatterbox is a local, high-fidelity neural Text-to-Speech library deployed completely in-process within the Flask backend. To configure the virtual environment and install the Chatterbox dependency:

### 🪟 Windows Setup
```cmd
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 🍎 macOS / 🐧 Linux Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

*(Note: During backend startup, Chatterbox will automatically pull model checkpoints from Hugging Face: `ResembleAI/chatterbox` for English and `ResembleAI/Chatterbox-Multilingual-hi` for Hindi. The weight checkpoints are cached locally in your Hugging Face cache folder `~/.cache/huggingface` for completely offline execution.)*

## Step 3: Set Up React Frontend
Open a new Terminal, navigate to the root directory (where `package.json` is located), and install the Node packages:

```bash
npm install
```

---

# 🎮 Running VAANI

To run the application locally, open **three separate terminals** and execute the commands below.

### Terminal 1: Start Ollama (AI Engine)
```bash
ollama serve
```
*(If it indicates the port is already in use, the Ollama service is already active in the background. You can close this terminal).*

### Terminal 2: Start Flask Backend (TTS & API)
```bash
cd backend
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

python app.py
```
*(This starts the backend on `http://127.0.0.1:5000` and initializes both English and Hindi Chatterbox models in memory).*

### Terminal 3: Start React Frontend (Vite)
Navigate to the root directory (where `package.json` is located):
```bash
npm run dev
```
*(This launches the React interface on `http://localhost:5173`).*

🎉 **Open your web browser and navigate to `http://localhost:5173` to start using the application!**

---

# 🩺 Verify Services & API Health

You can verify that both the Flask backend and the Chatterbox TTS engine are running correctly by checking their endpoints:

### 1. Verify Flask Backend Status
```bash
curl http://127.0.0.1:5000/health
```
**Expected Response:**
```json
{
  "status": "online"
}
```

### 2. Verify Component Diagnostics
```bash
curl http://127.0.0.1:5000/diagnostics
```
**Expected Response:**
```json
{
  "flask": true,
  "ollama": true,
  "chatterbox": true,
  "current_model": "gemma4",
  "current_voice": "ResembleAI/chatterbox",
  "engine": "chatterbox",
  "available_voices": ["Default"],
  "memory_mb": 420.5
}
```
*(Confirm that `"chatterbox": true` and `"ollama": true` are returned in the JSON payload).*

---

# 🛠️ Troubleshooting Guide

### 1. Ollama Not Running / Connection Refused
- **Issue**: Backend console outputs errors connecting to `http://127.0.0.1:11434`.
- **Fix**: Verify that Terminal 1 running `ollama serve` is active, or launch the desktop Ollama client. Run `curl http://127.0.0.1:11434` in a terminal to confirm it is alive.

### 2. Chatterbox Model Initialization Fails (`NoneType` or PyTorch Error)
- **Issue**: Chatterbox fails to load during backend startup or returns `expected Tensor as element 0 in argument 0`.
- **Fix**: This usually indicates a broken local snapshot download from Hugging Face or missing conditionals structure. Ensure you have a working internet connection during the first boot so python can download model files, or manually check that `ve.safetensors`, `t3_hi.safetensors`, and `s3gen.pt` are cached in `~/.cache/huggingface/hub`.

### 3. Backend 500 Error / Module Not Found
- **Issue**: Starting the backend fails with `ModuleNotFoundError` or returns HTTP 500 when request is made.
- **Fix**: Verify that you activated the virtual environment (`venv`) before executing `python app.py`. If packages are missing, run `pip install -r requirements.txt` again inside the virtual environment.

### 4. No Voices Available
- **Issue**: The diagnostics endpoint returns an empty array for `"available_voices"`.
- **Fix**: The default single-pack is loaded as `"Default"`. Ensure `chatterbox-tts` package is correctly installed in your python environment.

### 5. Model 'gemma4' Not Found
- **Issue**: Server start logs display that the Ollama model `gemma4` is missing.
- **Fix**: Run `ollama pull gemma4` in your console to download the Gemma 4 model locally.

### 6. Port Already in Use (Port 5000 or 5173)
- **Issue**: Starting Flask or Vite outputs an EADDRINUSE error.
- **Fix**:
  - **Windows**: Run `netstat -ano | findstr :5000` (or `:5173`), then kill the process via task manager or command line: `taskkill /PID <PID> /F`.
  - **macOS/Linux**: Run `lsof -i :5000` (or `:5173`), then kill it using `kill -9 <PID>`.

### 7. Frontend Cannot Connect to Backend
- **Issue**: The frontend loads, but shows a red "Offline" connection pill and requests fail.
- **Fix**: Verify Flask is active and serving on `http://127.0.0.1:5000`. Check that CORS configuration is enabled in `app.py` via `CORS(app)`.

### 8. Missing Python Packages
- **Issue**: Starting python server outputs `ModuleNotFoundError: No module named 'lameenc'` (or `mutagen`, `pymupdf`, etc.).
- **Fix**: Make sure you have python virtual environment activated and run `pip install -r requirements.txt`.

### 9. Missing Node Packages
- **Issue**: Running `npm run dev` returns package missing errors.
- **Fix**: Run `npm install` in the root folder to download and install all frontend dependencies declared in `package.json`.

---

# Developed By

- Swayam Barik
- Suditi Jena
- Supriya Priyadarsani Pradhan
- Sriya Priyadarshani
- Kashvi Nayak
- Kuldeep Kiran
- Palin Panigrahi
- Barsha Ranee

Powered by:
- React
- Flask
- Ollama (https://github.com/ollama/ollama.git)
- Chatterbox TTS (https://github.com/resemble-ai/chatterbox.git)
- Gemma 4
