import os
import psutil
import time
from flask import Blueprint, request, jsonify
from pipeline import PipelineOrchestrator
from services.ollama_service import check_ollama_status, query_ollama_chat, query_ollama_model
from services.chatterbox_service import check_chatterbox_status, list_models, generate_speech_audio
from services.preprocessing_service import build_prompt
from exceptions import OllamaError, ChatterboxError
from config import Config
from logger import flask_logger

# Import memory helpers
from memory.memory import load_preferences, save_message, get_recent_context, start_new_conversation, get_db, save_audio_log, get_audio_logs, clear_audio_logs

api_bp = Blueprint("api", __name__)

@api_bp.route("/", methods=["GET"])
def index():
    return "VAANI AI Flask Backend is running. API endpoints are available at /health, /diagnostics, and /generate."

@api_bp.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "online"
    })

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
    Receives text, forwards to conversational memory pipeline OR standard pipeline.
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
    final_prompt = build_prompt(prompt)
    conversation_id = data.get("conversation_id")
    user_id = data.get("user_id", "default")
    
    # Ensure conversation_id is valid, or create one automatically
    exists = False
    if conversation_id:
        try:
            with get_db() as conn:
                row = conn.execute("SELECT id FROM conversations WHERE id = ?", (conversation_id,)).fetchone()
                if row:
                    exists = True
        except Exception:
            pass
            
    if not exists:
        from datetime import datetime
        title = f"Chat {datetime.now().strftime('%Y-%m-%d')}"
        try:
            conversation_id = start_new_conversation(user_id=user_id, title=title)
        except Exception as e:
            flask_logger.error(f"Failed to create automatic conversation: {e}")
            
    # Load preferences to verify if memory is enabled
    try:
        prefs = load_preferences(user_id)
    except Exception:
        prefs = {}
    memory_enabled = prefs.get("memory_enabled", 1) == 1
    language = data.get("language") or prefs.get("language", "en")
    if language not in ['en', 'hi']:
        language = 'en'

    if data.get("conversation_id") and memory_enabled:
        flask_logger.info("Using persistent conversational pipeline for conversation ID: %s", conversation_id)
        try:
            start_time = time.time()
            
            # 1. Save user message to database
            save_message(conversation_id, "user", prompt)
            
            # 2. Load context window from history (system prompt + history + current)
            context_window = prefs.get("context_window", 10)
            history = get_recent_context(conversation_id, limit=context_window)
            
            # Construct messages for Ollama Chat
            system_prompt = "You are VAANI AI, a secure speech intelligence assistant. Process and decode the telemetry or answer the user prompt concisely."
            messages = [{"role": "system", "content": system_prompt}]
            for msg in history:
                messages.append({"role": msg["role"], "content": msg["content"]})
            
            # 3. Query Ollama Chat endpoint
            try:
                ollama_start = time.time()
                response_text = query_ollama_chat(messages)
                ollama_latency = time.time() - ollama_start
                flask_logger.info("Ollama chat completed in %.2fs", ollama_latency)
            except OllamaError as e:
                return jsonify({
                    "success": False,
                    "stage": "Ollama",
                    "reason": str(e)
                }), 200
                
            # 4. Save Assistant Response
            save_message(conversation_id, "assistant", response_text)
            
            # 5. Generate Chatterbox speech output
            try:
                tts_start = time.time()
                static_audio_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "audio")
                audio_result = generate_speech_audio(response_text, static_audio_dir, language=language)
                audio_filename = audio_result["filename"]
                tts_latency = time.time() - tts_start
                flask_logger.info("Chatterbox stage completed in %.2fs", tts_latency)
            except ChatterboxError as e:
                return jsonify({
                    "success": False,
                    "stage": "Chatterbox",
                    "reason": str(e)
                }), 200
                
            total_latency = time.time() - start_time
            flask_logger.info("Conversation pipeline completed in %.2fs", total_latency)
            
            # Save to database audio_logs
            try:
                voice = prefs.get("preferred_voice", "Default")
                speed = prefs.get("speech_speed", 1.0)
                save_audio_log(
                    id=f"clip_{int(time.time() * 1000)}",
                    voice=voice,
                    speed=speed,
                    text=response_text,
                    audio_path=f"/static/audio/{audio_filename}",
                    duration_seconds=audio_result.get("duration", 0.0),
                    response_time=round(total_latency, 2),
                    language=language
                )
            except Exception as db_err:
                flask_logger.error("Failed to save audio log to SQLite: %s", db_err)
            
            return jsonify({
                "success": True,
                "generated_text": response_text,
                "audio_file": f"/static/audio/{audio_filename}",
                "audio_duration": audio_result.get("duration", 0.0),
                "conversation_id": conversation_id,
                "response_time": round(total_latency, 2),
                "language": language,
                "latencies": {
                    "ollama": round(ollama_latency, 2),
                    "chatterbox": round(tts_latency, 2),
                    "encoding": audio_result.get("encoding_time", 0.0),
                    "total": round(total_latency, 2)
                }
            }), 200
            
        except Exception as e:
            flask_logger.exception("Error in conversational pipeline:")
            return jsonify({
                "success": False,
                "stage": "Flask",
                "reason": str(e)
            }), 500
    else:
        
       
        
        flask_logger.info("Delegating to standard PipelineOrchestrator (No memory context)")
        response_data = PipelineOrchestrator.generate_response(final_prompt, language=language)
        
        # Save both prompt and assistant response automatically if successful
        if response_data.get("success"):
            # Save audio log to database
            try:
                prefs = load_preferences(user_id)
                voice = prefs.get("preferred_voice", "Default")
                speed = prefs.get("speech_speed", 1.0)
                save_audio_log(
                    id=f"clip_{int(time.time() * 1000)}",
                    voice=voice,
                    speed=speed,
                    text=response_data.get("generated_text"),
                    audio_path=response_data.get("audio_file"),
                    duration_seconds=response_data.get("audio_duration", 0.0),
                    response_time=response_data.get("response_time", 0.0),
                    language=language
                )
            except Exception as db_err:
                flask_logger.error("Failed to save standard audio log to SQLite: %s", db_err)
                
            if conversation_id:
                try:
                    save_message(conversation_id, "user", prompt)
                    save_message(conversation_id, "assistant", response_data.get("generated_text"))
                    response_data["conversation_id"] = conversation_id
                    flask_logger.info("Automatically saved prompt and response to conversation ID: %s", conversation_id)
                except Exception as e:
                    flask_logger.error(f"Failed to auto-save messages to SQLite: {e}")
                
        return jsonify(response_data), 200

@api_bp.route("/audio-logs", methods=["GET"])
def list_audio_logs():
    """Lists all generation audio logs, automatically resolving missing durations."""
    try:
        logs = get_audio_logs()
        return jsonify({"success": True, "logs": logs}), 200
    except Exception as e:
        flask_logger.error("Failed to list audio logs: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500

@api_bp.route("/audio-logs", methods=["DELETE"])
def clear_logs():
    """Clears all audio logs from the database."""
    try:
        clear_audio_logs()
        return jsonify({"success": True}), 200
    except Exception as e:
        flask_logger.error("Failed to clear audio logs: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500

@api_bp.route("/synthesize-speech", methods=["POST"])
def synthesize_speech_endpoint():
    """
    On-demand speech synthesis endpoint.
    Takes generated text, optionally translates it using Gemma 4, and synthesizes it.
    """
    data = request.get_json() or {}
    text = data.get("text", "").strip()
    language = data.get("language", "en")
    translate = data.get("translate", False)
    user_id = data.get("user_id", "default")
    
    if not text:
        return jsonify({"success": False, "error": "No text provided"}), 400
        
    try:
        start_time = time.time()
        
        # 1. Translate if requested
        translated_text = text
        ollama_time = 0.0
        if translate and language == 'hi':
            ollama_start = time.time()
            try:
                from services.ollama_service import translate_to_hindi
                translated_text = translate_to_hindi(text)
                ollama_time = time.time() - ollama_start
                flask_logger.info("Translation to Hindi completed in %.2fs", ollama_time)
            except Exception as e:
                flask_logger.error("Hindi translation failed: %s", e)
                return jsonify({"success": False, "error": f"Translation failed: {str(e)}"}), 500
                
        # 2. Synthesize using Chatterbox
        try:
            tts_start = time.time()
            static_audio_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "audio")
            audio_result = generate_speech_audio(translated_text, static_audio_dir, language=language)
            audio_filename = audio_result["filename"]
            tts_time = time.time() - tts_start
            flask_logger.info("Chatterbox stage completed in %.2fs", tts_time)
        except Exception as e:
            flask_logger.error("Chatterbox TTS failed: %s", e)
            return jsonify({"success": False, "error": f"Speech synthesis failed: {str(e)}"}), 500
            
        total_time = time.time() - start_time
        
        # Save to database audio_logs
        try:
            prefs = load_preferences(user_id)
            voice = prefs.get("preferred_voice", "Default")
            speed = prefs.get("speech_speed", 1.0)
            save_audio_log(
                id=f"clip_{int(time.time() * 1000)}",
                voice=voice,
                speed=speed,
                text=translated_text,
                audio_path=f"/static/audio/{audio_filename}",
                duration_seconds=audio_result.get("duration", 0.0),
                response_time=round(total_time, 2),
                language=language
            )
        except Exception as db_err:
            flask_logger.error("Failed to save on-demand audio log to SQLite: %s", db_err)
            
        return jsonify({
            "success": True,
            "audio_file": f"/static/audio/{audio_filename}",
            "audio_duration": audio_result.get("duration", 0.0),
            "response_time": round(total_time, 2),
            "translated_text": translated_text if translate else None,
            "latencies": {
                "translation": round(ollama_time, 2),
                "chatterbox": round(tts_time, 2),
                "encoding": audio_result.get("encoding_time", 0.0),
                "total": round(total_time, 2)
            }
        }), 200
        
    except Exception as e:
        flask_logger.exception("Synthesize speech error:")
        return jsonify({"success": False, "error": str(e)}), 500
