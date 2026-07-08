from flask import Flask, jsonify
from flask_cors import CORS
from routes import api_bp, chat_bp, documents_bp
from config import Config
from memory.memory import db_init

app = Flask(__name__, static_folder="static")
app.config.from_object(Config)
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB upload limit

# Enable CORS for the React frontend
CORS(app, resources={r"/*": {"origins": "*"}})

# Register blueprints (NO url_prefix so routes are at root)
app.register_blueprint(api_bp)
app.register_blueprint(chat_bp)
app.register_blueprint(documents_bp)

# Initialize SQLite database tables
db_init()

# --- JSON error handlers so Flask never returns HTML to the React frontend ---
@app.errorhandler(401)
def unauthorized(e):
    return jsonify({"success": False, "error": "Unauthorized", "status": 401}), 401

@app.errorhandler(404)
def not_found(e):
    return jsonify({"success": False, "error": "Endpoint not found", "status": 404}), 404

@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"success": False, "error": "Method not allowed", "status": 405}), 405

@app.errorhandler(413)
def request_entity_too_large(e):
    return jsonify({"success": False, "error": "File too large. Maximum upload size is 10MB.", "status": 413}), 413

@app.errorhandler(500)
def internal_server_error(e):
    return jsonify({"success": False, "error": "Internal server error", "status": 500}), 500

from startup_manager import wait_for_services

if __name__ == "__main__":
    print("==================================")
    print("VAANI AI Backend Starting...")
    print(f"Using TTS Model: {Config.CHATTERBOX_MODEL}")
    print("==================================")

    # Print all registered routes for debugging
    print("\nRegistered Routes:")
    for rule in app.url_map.iter_rules():
        methods = ','.join(sorted(rule.methods - {'OPTIONS', 'HEAD'}))
        print(f"  {methods:6s} {rule.rule}")
    print("")
    
    # Task 1: Startup Manager checks daemons before Flask binds
    wait_for_services()
    
    app.run(host="127.0.0.1", port=5000, debug=False)
