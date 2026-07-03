import os
import psutil
from flask import Blueprint, request, jsonify
from pipeline import PipelineOrchestrator
from services.ollama_service import check_ollama_status
from services.chatterbox_service import check_chatterbox_status, list_models
from config import Config
from logger import flask_logger

api_bp = Blueprint("api", __name__)

@api_bp.route("/", methods=["GET"])
def index():
    return "VAANI AI Flask Backend is running. API endpoints are available at /health, /diagnostics, and /generate."

@api_bp.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "online"})

@api_bp.route("/diagnostics", methods=["GET"])
def diagnostics():
    """Returns the comprehensive diagnostic status of all backend components"""
    process = psutil.Process(os.getpid())
    memory_info = process.memory_info()
    
    ollama_ok = check_ollama_status()
    chatterbox_ok = check_chatterbox_status()
    
    flask_logger.info("Diagnostics requested. Ollama: %s, Chatterbox: %s", ollama_ok, chatterbox_ok)
    
    available_voices = []
    try:
        if chatterbox_ok:
            available_voices = list_models()
    except Exception as e:
        flask_logger.error(f"Diagnostics: Failed to fetch chatterbox models: {e}")
        
    return jsonify({
        "flask": True,
        "ollama": ollama_ok,
        "chatterbox": chatterbox_ok,
        "current_model": Config.MODEL_NAME,
        "current_voice": getattr(Config, 'CHATTERBOX_MODEL', 'ResembleAI/chatterbox'),
        "engine": "chatterbox",
        "available_voices": available_voices,
        "memory_mb": round(memory_info.rss / (1024 * 1024), 2)
    })

@api_bp.route("/generate", methods=["POST"])
def generate_report():
    """
    Receives structured missile telemetry OR raw text, forwards to central pipeline.
    """
    data = request.get_json() or {}
    
    if "text" not in data or not str(data["text"]).strip():
        flask_logger.error("Missing 'text' field in payload")
        return jsonify({
            "success": False,
            "stage": "Flask",
            "reason": "Missing 'text' field in payload"
        }), 400
        
    prompt = str(data["text"]).strip()

    flask_logger.info("Delegating to PipelineOrchestrator")
    response_data = PipelineOrchestrator.generate_response(prompt)
    
    return jsonify(response_data), 200
