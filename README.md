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

## Step 2: Install System-Level Dependencies (FFmpeg)

Chatterbox TTS and audio processing libraries (like `librosa`, `torchaudio`, and `pydub`) require **FFmpeg** to decode reference WAV files and encode outputs.

### 🪟 Windows Setup
1. Download FFmpeg from [Gyan.dev](https://www.gyan.dev/ffmpeg/builds/).
2. Extract the folder and copy the path to the `bin` directory (e.g. `C:\ffmpeg\bin`).
3. Add this path to your system's environment variable `PATH`.
4. Verification: Open a new command prompt and run `ffmpeg -version`.

### 🍎 macOS Setup
Install via Homebrew:
```bash
brew install ffmpeg
```

### 🐧 Linux Setup
Install via Advanced Package Tool:
```bash
sudo apt update
sudo apt install -y ffmpeg
```

---

## Step 3: Set Up Backend & Chatterbox TTS

Chatterbox is a local, high-fidelity neural Text-to-Speech library deployed completely in-process within the Flask backend. To configure the virtual environment and install dependencies:

1. Navigate to the `backend` folder and create a virtual environment:
   ```bash
   cd backend
   python -m venv venv
   ```
2. Activate the virtual environment:
   - **Windows (CMD)**: `venv\Scripts\activate`
   - **Windows (PowerShell)**: `.\venv\Scripts\Activate.ps1`
   - **macOS/Linux**: `source venv/bin/activate`

3. **Install PyTorch & Torchaudio**:
   Chatterbox runs neural network inference. It is highly recommended to run with CUDA GPU acceleration if a compatible NVIDIA GPU is available:
   - **GPU (CUDA 12.1 - Recommended)**:
     ```bash
     pip install torch==2.6.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cu121
     ```
   - **CPU Fallback (Standard)**:
     ```bash
     pip install torch==2.6.0 torchaudio==2.6.0
     ```

4. **Install Chatterbox Engine & Backend Packages**:
   Install the remaining Python modules declared in `requirements.txt`:
   ```bash
   pip install -r requirements.txt
   ```

   **What gets installed:**
   - `chatterbox-tts==0.1.7`: The core neural TTS synthesizer.
   - `resemble-perth==1.0.1` & `s3tokenizer==0.3.0`: Neural speaker conditioning tokenizer and encoder model.
   - `librosa==0.11.0` & `soundfile==0.14.0`: Advanced audio reading, resampling, and waveform rendering.
   - `lameenc==1.8.4`: High-performance MP3 encoding engine to output web-ready audio streams.
   - `mutagen==1.48.1`: Audio duration reader for SQL log records.
   - `pymupdf==1.28.0` & `pdfplumber==0.11.10`: Document Vault PDF extractors.
   - `Flask==3.0.3` & `Flask-Cors==4.0.1`: Local API server routing.

*(Note: During backend startup, Chatterbox will automatically pull model checkpoints from Hugging Face: `ResembleAI/chatterbox` for English and `ResembleAI/Chatterbox-Multilingual-hi` for Hindi. The weight checkpoints are cached locally in your Hugging Face cache folder `~/.cache/huggingface` for completely offline execution.)*

---

## Step 4: Set Up React Frontend

Navigate back to the project root directory (where `package.json` is located) and install the Node.js modules:

```bash
npm install
```

**What gets installed:**
- `react@19.2.7` & `react-dom@19.2.7`: Core application framework.
- `antd@6.5.0`: Ant Design enterprise component system.
- `framer-motion@12.42.2`: High-fidelity page transitions and micro-animations.
- `lucide-react@1.23.0` & `react-icons@5.6.0`: Platform soundwave, player, and navigation icons.
- `react-router-dom@7.18.0`: UI routing and layout path resolver.
- `vite@8.1.0` (dev): Lightweight, rapid development build utility.
- `@vitejs/plugin-react@6.0.2` (dev): Hot Module Replacement compiler configurations for React.
- `oxlint@1.69.0` (dev): Ultra-fast compiler linters.

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
  "available_voices": [
    {"id": "en", "name": "English Pack", "device": "cuda"},
    {"id": "hi", "name": "Hindi Pack", "device": "cuda"}
  ],
  "memory_mb": 420.5
}
```
*(Confirm that `"chatterbox": true` and `"ollama": true` are returned in the JSON payload).*

---

# 🎙️ Voice Profiles & True Voice Switching

VAANI supports true voice switching across four distinct voice profiles. Each profile is defined by a unique reference audio file (WAV) stored in `backend/voices/` from which neural speaker embeddings are extracted:

| Profile Value | UI Display Label | Reference File | Narration Style |
| :--- | :--- | :--- | :--- |
| `default` | **Default System** | `default.wav` | Default balanced system voice |
| `male` | **Male** | `male.wav` | Professional male voice |
| `female` | **Female** | `female.wav` | Professional female voice |
| `neural` | **Neural Voice (DRDO Spec)** | `drdo.wav` | Formal defense-style narration |

When a voice profile is selected:
1. The frontend invalidates cached audios and passes the voice ID (`default`, `male`, `female`, or `neural`) in the request payload.
2. The Flask server matches the ID in its internal `VOICE_MAP` configuration to load the corresponding reference file path on disk.
3. The Chatterbox TTS engine extracts speaker embeddings and tokenizes conditional cues dynamically for each segment, guaranteeing a structurally and audibly unique voice.

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

### 4. No Voices Available (Language Packs Not Loaded)
- **Issue**: The diagnostics endpoint returns an empty array for `"available_voices"`.
- **Fix**: Verify that the English and Hindi Chatterbox model directories exist and are initialized correctly in the backend. Ensure you have activated your virtual environment before starting the server.

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
