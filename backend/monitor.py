import os
import time
import threading
import subprocess
from services.ollama_service import check_ollama_status
from logger import flask_logger

class DaemonMonitor:
    def __init__(self):
        self.running = False
        self.thread = None

    def start(self):
        if not self.running:
            self.running = True
            self.thread = threading.Thread(target=self._monitor_loop, daemon=True)
            self.thread.start()
            flask_logger.info("Daemon health monitor started.")

    def stop(self):
        self.running = False

    def _monitor_loop(self):
        while self.running:
            try:
                if not check_ollama_status():
                    flask_logger.warning("Ollama daemon is down! Attempting auto-recovery...")
                    self._restart_ollama()
                
                # OmniVoice auto-recovery check disabled by user
            except Exception as e:
                flask_logger.error("Error in daemon monitor loop: %s", str(e))
                
            time.sleep(10)

    def _restart_ollama(self):
        try:
            subprocess.Popen('start "VAANI AI - Ollama Recovery" cmd /c "ollama serve"', shell=True)
            flask_logger.info("Executed Ollama auto-recovery command.")
        except Exception as e:
            flask_logger.error("Failed to execute Ollama auto-recovery: %s", str(e))

# Global instance to be started by app.py
monitor = DaemonMonitor()
