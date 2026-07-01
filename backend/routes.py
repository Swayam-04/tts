import os
import time
import logging
import traceback
from flask import Blueprint, request, jsonify
from services.ollama_service import query_ollama_model
from services.tts_service import generate_speech_audio
from exceptions import OllamaError, OmniVoiceError

# Configure global logging
log_file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend.log")
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(name)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file_path),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)
api_bp = Blueprint("api", __name__)

@api_bp.route("/", methods=["GET"])
def index():
    """Root endpoint to verify server is reachable from browser"""
    try:
        return "VAANI AI Flask Backend is running. API endpoints are available at /health and /generate."
    except Exception as e:
        logger.critical("Exception in index: %s\n%s", str(e), traceback.format_exc())
        return jsonify({"error": "Internal Server Error"}), 500

@api_bp.route("/health", methods=["GET"])
def health():
    """Returns local Flask backend health status"""
    try:
        return jsonify({"status": "online"})
    except Exception as e:
        logger.critical("Exception in health: %s\n%s", str(e), traceback.format_exc())
        return jsonify({"error": "Internal Server Error"}), 500

@api_bp.route("/generate", methods=["POST"])
def generate_report():
    """
    Receives structured missile telemetry OR raw text, generates Llama-3.2 report,
    queries local Ollama, synthesizes audio via OmniVoice, and returns JSON.
    """
    try:
        start_time = time.time()
        data = request.get_json() or {}
        
        logger.info("Incoming request to /generate")
        logger.info("Incoming request payload: %s", data)
        
        # Telemetry extraction vs raw text
        if "text" in data and data["text"].strip():
            prompt = data["text"].strip()
        else:
            missile = data.get("missile", "Unknown")
            mv = data.get("mv", "Unknown")
            pv = data.get("pv", "Unknown")
            launch_time = data.get("launch_time", "Unknown")
            
            prompt = (
                f"Generate a tactical telemetry report for a missile launch. "
                f"Missile name: {missile}, mission velocity: {mv}, pitch velocity: {pv}, launch time: {launch_time}. "
                f"Summarize the status and parameters clearly in English."
            )

        logger.info("Generated prompt: %s", prompt)

        # 1. Query Llama 3.2 model on local Ollama server
        response_text = query_ollama_model(prompt)
        
        # 2. Synthesize speech WAV file offline inside static folder
        static_audio_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "audio")
        audio_filename = generate_speech_audio(response_text, static_audio_dir)
        logger.info("Saved audio path: %s", audio_filename)
        
        processing_time = time.time() - start_time
        logger.info("Processing time: %.2f seconds", processing_time)

        # 3. Return report text and relative static file URL
        return jsonify({
            "generated_text": response_text,
            "audio_file": f"/static/audio/{audio_filename}",
            "status": "success"
        })

    except OllamaError as e:
        logger.error("Ollama API Error: %s", str(e))
        return jsonify({
            "error": "Ollama Error",
            "details": str(e)
        }), 500
        
    except OmniVoiceError as e:
        logger.error("OmniVoice API Error: %s", str(e))
        return jsonify({
            "error": "OmniVoice Error",
            "details": str(e)
        }), 500
        
    except Exception as e:
        tb = traceback.format_exc()
        logger.critical("Unhandled Exception in generate_report: %s\n%s", str(e), tb)
        print(f"CRITICAL ERROR:\n{tb}") # Print exact exception before returning HTTP 500
        return jsonify({
            "error": "Internal Server Error",
            "details": str(e)
        }), 500
