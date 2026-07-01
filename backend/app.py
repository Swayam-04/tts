from flask import Flask
from flask_cors import CORS
from routes import api_bp
from config import Config

app = Flask(__name__, static_folder="static")
app.config.from_object(Config)

# Enable CORS for the React frontend
CORS(app, resources={r"/*": {"origins": "*"}})

app.register_blueprint(api_bp)

if __name__ == "__main__":
    print("==================================")
    print("VAANI AI Backend Started")
    print("Backend : http://127.0.0.1:5000")
    print("Health  : http://127.0.0.1:5000/health")
    print("Ollama  : http://127.0.0.1:11434")
    print("Model   : llama3.2:3b")
    print("==================================")
    app.run(host="127.0.0.1", port=5000, debug=True)
