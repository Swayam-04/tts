import requests
import logging
from config import Config
from exceptions import OllamaError

def check_ollama_status():
    """Checks if the local Ollama daemon is active and running"""
    try:
        response = requests.get(f"{Config.OLLAMA_BASE_URL}/", timeout=2)
        return response.status_code == 200
    except Exception:
        return False

def query_ollama_model(prompt):
    """Sends a generate request to the local Ollama llama3.2:3b instance"""
    try:
        payload = {
            "model": Config.MODEL_NAME,
            "prompt": prompt,
            "stream": False
        }
        
        logging.info("Ollama request payload: %s", payload)
        
        response = requests.post(
            f"{Config.OLLAMA_BASE_URL}/api/generate",
            json=payload,
            timeout=120
        )
        
        if response.status_code == 200:
            json_resp = response.json()
            logging.info("Ollama response: %s", json_resp)
            return json_resp.get("response", "")
        else:
            err_msg = f"Ollama server returned error code {response.status_code}: {response.text}"
            logging.error(err_msg)
            raise OllamaError(err_msg)
            
    except requests.exceptions.ConnectionError as e:
        err_msg = f"Ollama server not running or connection refused: {str(e)}"
        logging.error(err_msg)
        raise OllamaError(err_msg)
    except requests.exceptions.RequestException as e:
        err_msg = f"Ollama request failed: {str(e)}"
        logging.error(err_msg)
        raise OllamaError(err_msg)
