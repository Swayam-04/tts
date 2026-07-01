import os

class Config:
    """VAANI AI Backend Configuration Settings"""
    DEBUG = True
    OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    OMNIVOICE_BASE_URL = os.environ.get("OMNIVOICE_BASE_URL", "http://127.0.0.1:3900")
    MODEL_NAME = os.environ.get("MODEL_NAME", "llama3.2:3b")
