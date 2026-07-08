import os
import json

class ConfigManager:
    """VAANI AI Config Manager"""
    _config_path = os.path.join(os.path.dirname(__file__), "config.json")
    _config_data = {}

    @classmethod
    def load(cls):
        if not os.path.exists(cls._config_path):
            cls._create_default()
        with open(cls._config_path, "r") as f:
            cls._config_data = json.load(f)

    @classmethod
    def _create_default(cls):
        default_config = {
            "flask": {"host": "127.0.0.1", "port": 5000, "debug": True},
            "ollama": {"url": "http://127.0.0.1:11434", "model": "gemma4", "timeout_seconds": 120},
            "chatterbox": {"model": "ResembleAI/chatterbox", "device": "cuda", "sample_rate": 24000},
            "paths": {"log_dir": "logs", "audio_dir": "static/audio"}
        }
        with open(cls._config_path, "w") as f:
            json.dump(default_config, f, indent=2)
        cls._config_data = default_config

    @classmethod
    def get(cls, section, key, default=None):
        if not cls._config_data:
            cls.load()
        return cls._config_data.get(section, {}).get(key, default)

    @classmethod
    def set(cls, section, key, value):
        if not cls._config_data:
            cls.load()
        if section not in cls._config_data:
            cls._config_data[section] = {}
        cls._config_data[section][key] = value
        with open(cls._config_path, "w") as f:
            json.dump(cls._config_data, f, indent=2)

class Config:
    @property
    def DEBUG(self): return ConfigManager.get("flask", "debug", True)
    
    @property
    def OLLAMA_BASE_URL(self): return ConfigManager.get("ollama", "url", "http://127.0.0.1:11434")
    
    @property
    def MODEL_NAME(self): return ConfigManager.get("ollama", "model", "gemma4")
    
    @property
    def OLLAMA_TIMEOUT(self): return ConfigManager.get("ollama", "timeout_seconds", 120)
    
    @property
    def CHATTERBOX_MODEL(self): return ConfigManager.get("chatterbox", "model", "ResembleAI/chatterbox")
    
    @property
    def CHATTERBOX_DEVICE(self): return ConfigManager.get("chatterbox", "device", "cuda")

    @property
    def CHATTERBOX_SAMPLE_RATE(self): return ConfigManager.get("chatterbox", "sample_rate", 24000)

    @property
    def CHATTERBOX_OUTPUT_DIR(self): return os.path.join(os.path.dirname(__file__), ConfigManager.get("paths", "audio_dir", "static/audio"))

    @property
    def LOG_DIR(self): return os.path.join(os.path.dirname(__file__), ConfigManager.get("paths", "log_dir", "logs"))

Config = Config()
ConfigManager.load()
