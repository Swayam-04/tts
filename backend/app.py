from flask import Flask
from flask_cors import CORS
from routes import api_bp, chat_bp, documents_bp
from config import Config
from memory.memory import db_init

app = Flask(__name__, static_folder="static")
app.config.from_object(Config)

# Enable CORS for the React frontend
CORS(app, resources={r"/*": {"origins": "*"}})

# Register blueprints
app.register_blueprint(api_bp)
app.register_blueprint(chat_bp)
app.register_blueprint(documents_bp)

# Initialize SQLite database tables
db_init()

from startup_manager import wait_for_services

if __name__ == "__main__":
    print("==================================")
    print("VAANI AI Backend Starting...")
    print(f"Using TTS Model: {Config.CHATTERBOX_MODEL}")
    print("==================================")
    
    # Task 1: Startup Manager checks daemons before Flask binds
    wait_for_services()
    
    app.run(host="127.0.0.1", port=5000, debug=False)
