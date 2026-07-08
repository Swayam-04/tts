import requests
import logging
import hashlib
from config import Config

embeddings_logger = logging.getLogger("vaani_embeddings")

def generate_embedding(text: str) -> list:
    """
    Generates a numerical embedding vector for the given text.
    Queries Ollama's /api/embed or /api/embeddings.
    Falls back to a stable pseudo-random vector if Ollama is unreachable.
    """
    if not text or not text.strip():
        # Return a zero vector of default size (say, 3072 for Llama 3)
        return [0.0] * 3072

    # 1. Try Ollama's modern /api/embed endpoint
    try:
        url = f"{Config.OLLAMA_BASE_URL}/api/embed"
        payload = {
            "model": Config.MODEL_NAME,
            "input": text
        }
        response = requests.post(url, json=payload, timeout=15)
        if response.status_code == 200:
            data = response.json()
            if "embeddings" in data and len(data["embeddings"]) > 0:
                return data["embeddings"][0]
    except Exception as e:
        embeddings_logger.warning(f"Ollama /api/embed failed: {e}. Trying /api/embeddings...")

    # 2. Try older /api/embeddings endpoint
    try:
        url = f"{Config.OLLAMA_BASE_URL}/api/embeddings"
        payload = {
            "model": Config.MODEL_NAME,
            "prompt": text
        }
        response = requests.post(url, json=payload, timeout=15)
        if response.status_code == 200:
            data = response.json()
            if "embedding" in data:
                return data["embedding"]
    except Exception as e:
        embeddings_logger.warning(f"Ollama /api/embeddings failed: {e}. Using offline fallback...")

    # 3. Deterministic fallback vector generation if Ollama is completely offline/broken
    # Generate 3072 values based on sha256 hashes of the text to keep it stable
    embeddings_logger.info("Using fallback pseudo-embeddings generator.")
    vector = []
    text_bytes = text.encode("utf-8")
    for i in range(96): # 96 * 32 bytes = 3072 dimensions
        h = hashlib.sha256(text_bytes + bytes([i])).digest()
        # Extract floats from hash digest
        for b in range(0, 32, 4):
            val = int.from_bytes(h[b:b+4], byteorder='big', signed=True)
            # Normalize to [-1.0, 1.0]
            vector.append(val / 2147483647.0)
    return vector
