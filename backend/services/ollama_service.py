import requests
import logging
import traceback
from typing import Optional
from config import Config
from exceptions import OllamaError

def check_ollama_status() -> bool:
    """Checks if the local Ollama daemon is active and running"""
    try:
        response = requests.get(f"{Config.OLLAMA_BASE_URL}/", timeout=5)
        response.raise_for_status()
        return True
    except Exception:
        return False

def check_ollama_model() -> bool:
    """Checks if the required model is available in Ollama"""
    try:
        response = requests.get(f"{Config.OLLAMA_BASE_URL}/api/tags", timeout=5)
        response.raise_for_status()
        
        models = response.json().get("models", [])
        for m in models:
            if m.get("name") == Config.MODEL_NAME or m.get("name").startswith(Config.MODEL_NAME):
                return True
        return False
    except Exception:
        return False

def query_ollama_model(prompt: str) -> str:
    """Sends a generate request to the local Ollama instance"""
    try:
        payload = {
            "model": Config.MODEL_NAME,
            "prompt": prompt,
            "stream": False
        }
        
        prompt_preview = prompt[:100].replace('\n', ' ')
        logging.info("Ollama Request - Model: %s, Prompt Length: %d, Preview: '%s'", Config.MODEL_NAME, len(prompt), prompt_preview)
        
        response = requests.post(
            f"{Config.OLLAMA_BASE_URL}/api/generate",
            json=payload,
            timeout=(10, 300)
        )
        
        logging.info("Ollama Response Status: %s", response.status_code)
        response.raise_for_status()
        
        try:
            json_resp = response.json()
        except ValueError as e:
            raise OllamaError(f"Invalid JSON received from Ollama: {str(e)}\nTraceback: {traceback.format_exc()}")
            
        logging.info("Raw Ollama JSON response: %s", json_resp)
        
        response_text = json_resp.get("response")
        
        if response_text is None or not str(response_text).strip():
            logging.error("Ollama returned empty text. Full JSON: %s", json_resp)
            raise OllamaError("No text generated")
            
        logging.info("Generated text length: %d characters", len(response_text))
        return str(response_text)
            
    except requests.exceptions.RequestException as e:
        err_msg = f"Ollama request failed: {str(e)}\nTraceback: {traceback.format_exc()}"
        logging.error(err_msg)
        raise OllamaError(err_msg)
    except Exception as e:
        if isinstance(e, OllamaError):
            raise
        err_msg = f"Unexpected error in query_ollama_model: {str(e)}\nTraceback: {traceback.format_exc()}"
        logging.error(err_msg)
        raise OllamaError(err_msg)

def query_ollama_chat(messages: list) -> str:
    """
    Sends a chat request (with message history) to the local Ollama instance's /api/chat.
    messages format: [{'role': 'system'/'user'/'assistant', 'content': 'text'}, ...]
    """
    try:
        payload = {
            "model": Config.MODEL_NAME,
            "messages": messages,
            "stream": False
        }
        
        logging.info("Ollama Chat Request - Model: %s, Message Count: %d", Config.MODEL_NAME, len(messages))
        
        response = requests.post(
            f"{Config.OLLAMA_BASE_URL}/api/chat",
            json=payload,
            timeout=(10, 300)
        )
        
        logging.info("Ollama Chat Response Status: %s", response.status_code)
        response.raise_for_status()
        
        try:
            json_resp = response.json()
        except ValueError as e:
            raise OllamaError(f"Invalid JSON received from Ollama Chat: {str(e)}\nTraceback: {traceback.format_exc()}")
            
        logging.info("Raw Ollama Chat response: %s", json_resp)
        
        message_resp = json_resp.get("message", {})
        response_text = message_resp.get("content")
        
        if response_text is None or not str(response_text).strip():
            logging.error("Ollama Chat returned empty text. Full JSON: %s", json_resp)
            raise OllamaError("No text generated")
            
        logging.info("Generated chat text length: %d characters", len(response_text))
        return str(response_text)
            
    except requests.exceptions.RequestException as e:
        err_msg = f"Ollama Chat request failed: {str(e)}\nTraceback: {traceback.format_exc()}"
        logging.error(err_msg)
        raise OllamaError(err_msg)
    except Exception as e:
        if isinstance(e, OllamaError):
            raise
        err_msg = f"Unexpected error in query_ollama_chat: {str(e)}\nTraceback: {traceback.format_exc()}"
        logging.error(err_msg)
        raise OllamaError(err_msg)

