from flask import Flask
from flask_cors import CORS
from routes import api_bp
from config import Config

app = Flask(__name__, static_folder="static")
app.config.from_object(Config)

# Enable CORS for the React frontend
CORS(app, resources={r"/*": {"origins": "*"}})

app.register_blueprint(api_bp)

from startup_manager import wait_for_services

if __name__ == "__main__":
    print("==================================")
    print("VAANI AI Backend Starting...")
    print(f"Using TTS Model: {Config.CHATTERBOX_MODEL}")
    print("==================================")
    
    # Task 1: Startup Manager checks daemons before Flask binds
    wait_for_services()
    
    app.run(host="127.0.0.1", port=5000, debug=False)
