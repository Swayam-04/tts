import time
import sys
from services.ollama_service import check_ollama_status, check_ollama_model
from services.chatterbox_service import initialize, health
import subprocess
from monitor import monitor
from logger import flask_logger
from config import Config

def wait_for_services():
    """Startup Manager: Waits for all critical daemons to be online before allowing Flask to bind"""
    flask_logger.info("Initializing VAANI AI Startup Manager...")
    
    max_retries = 30 # 30 attempts * 5 seconds = 150 seconds timeout
    
    # 1. Wait for Ollama
    flask_logger.info("Checking Ollama Daemon...")
    for i in range(max_retries):
        if check_ollama_status():
            flask_logger.info("Ollama is ONLINE.")
            break
        flask_logger.warning("Ollama not responding. Waiting...")
        time.sleep(5)
    else:
        flask_logger.error("Startup Failed: Ollama daemon is completely unresponsive.")
        sys.exit(1)

    # 2. Check Model
    flask_logger.info("Checking Ollama Model...")
    for i in range(max_retries):
        if check_ollama_model():
            flask_logger.info("Ollama Model LOADED.")
            break
        flask_logger.warning(f"Ollama model not loaded. Attempting to load {Config.MODEL_NAME}...")
        try:
            subprocess.run(["ollama", "run", Config.MODEL_NAME], timeout=30)
        except Exception as e:
            flask_logger.error(f"Failed to load model: {e}")
        time.sleep(5)
    else:
        flask_logger.error(f"Startup Failed: Model '{Config.MODEL_NAME}' is unavailable.")
        sys.exit(1)

    # 3. Initialize Chatterbox TTS
    flask_logger.info("Initializing Chatterbox TTS...")
    try:
        initialize()
        if health():
            flask_logger.info("Chatterbox TTS initialized successfully.")
        else:
            flask_logger.error("Startup Failed: Chatterbox initialization failed.")
            sys.exit(1)
    except Exception as e:
        flask_logger.error("Startup Failed: Chatterbox exception: %s", e)
        sys.exit(1)
    
    # 5. Start the background health monitor
    monitor.start()
    flask_logger.info("All services verified. Starting Flask server...")
