import os
import logging
from config import Config

def setup_logger(name, log_file, level=logging.INFO):
    """Function to setup as many loggers as you want"""
    
    if not os.path.exists(Config.LOG_DIR):
        os.makedirs(Config.LOG_DIR)
        
    log_path = os.path.join(Config.LOG_DIR, log_file)
    
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(name)s - %(message)s')
    
    handler = logging.FileHandler(log_path)        
    handler.setFormatter(formatter)

    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # Avoid duplicate handlers if setup multiple times
    if not logger.handlers:
        logger.addHandler(handler)
        # Also print to stdout
        stream_handler = logging.StreamHandler()
        stream_handler.setFormatter(formatter)
        logger.addHandler(stream_handler)

    return logger

# Pre-configured loggers
flask_logger = setup_logger('flask', 'flask.log')
ollama_logger = setup_logger('ollama', 'ollama.log')
chatterbox_logger = setup_logger('chatterbox', 'chatterbox.log')
pipeline_logger = setup_logger('pipeline', 'pipeline.log')
