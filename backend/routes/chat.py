from flask import Blueprint, request, jsonify
from memory.memory import (
    start_new_conversation,
    rename_conversation,
    delete_conversation,
    get_conversations,
    load_conversation,
    search_history,
    load_preferences,
    save_preferences
)
from config import ConfigManager
from logger import flask_logger

chat_bp = Blueprint("chat", __name__)

@chat_bp.route("/conversations", methods=["POST"])
def create_chat():
    """Starts a new conversation thread."""
    data = request.get_json() or {}
    title = data.get("title", "New Conversation")
    user_id = data.get("user_id", "default")
    
    try:
        conv_id = start_new_conversation(user_id, title)
        flask_logger.info("Created new conversation ID: %s", conv_id)
        return jsonify({"success": True, "id": conv_id, "title": title}), 201
    except Exception as e:
        flask_logger.error("Failed to create conversation: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500

@chat_bp.route("/conversations", methods=["GET"])
def list_chats():
    """Lists or searches conversation threads for a user."""
    user_id = request.args.get("user_id", "default")
    search_query = request.args.get("search", "").strip()
    
    try:
        if search_query:
            chats = search_history(search_query, user_id)
        else:
            chats = get_conversations(user_id)
        return jsonify({"success": True, "conversations": chats}), 200
    except Exception as e:
        flask_logger.error("Failed to list conversations: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500

@chat_bp.route("/conversations/<int:conversation_id>", methods=["PUT"])
def rename_chat(conversation_id):
    """Renames an existing conversation thread."""
    data = request.get_json() or {}
    title = data.get("title", "").strip()
    
    if not title:
        return jsonify({"success": False, "error": "Title cannot be empty"}), 400
        
    try:
        rename_conversation(conversation_id, title)
        flask_logger.info("Renamed conversation ID %s to '%s'", conversation_id, title)
        return jsonify({"success": True}), 200
    except Exception as e:
        flask_logger.error("Failed to rename conversation: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500

@chat_bp.route("/conversations/<int:conversation_id>", methods=["DELETE"])
def delete_chat(conversation_id):
    """Deletes an existing conversation thread and all its messages."""
    try:
        delete_conversation(conversation_id)
        flask_logger.info("Deleted conversation ID %s", conversation_id)
        return jsonify({"success": True}), 200
    except Exception as e:
        flask_logger.error("Failed to delete conversation: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500

@chat_bp.route("/conversations/<int:conversation_id>/messages", methods=["GET"])
def get_chat_messages(conversation_id):
    """Loads all messages in a conversation thread."""
    try:
        messages = load_conversation(conversation_id)
        return jsonify({"success": True, "messages": messages}), 200
    except Exception as e:
        flask_logger.error("Failed to load messages: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500

@chat_bp.route("/preferences", methods=["GET"])
def get_user_prefs():
    """Loads user preferences."""
    user_id = request.args.get("user_id", "default")
    try:
        prefs = load_preferences(user_id)
        return jsonify({"success": True, "preferences": prefs}), 200
    except Exception as e:
        flask_logger.error("Failed to load preferences: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500

@chat_bp.route("/preferences", methods=["POST"])
def save_user_prefs():
    """Saves/updates user preferences."""
    data = request.get_json() or {}
    user_id = data.get("user_id", "default")
    
    # Extract preference parameters
    prefs_to_save = {}
    allowed_keys = [
        "preferred_model",
        "preferred_voice",
        "speech_speed",
        "language",
        "theme",
        "context_window",
        "chunk_size",
        "chunk_overlap",
        "memory_enabled"
    ]
    for key in allowed_keys:
        if key in data:
            prefs_to_save[key] = data[key]
            
    try:
        save_preferences(user_id, **prefs_to_save)
        flask_logger.info("Saved preferences for user %s: %s", user_id, prefs_to_save)
        
        # If the model was changed, update the runtime config so all future
        # Ollama requests use the new model without restarting Flask.
        if "preferred_model" in prefs_to_save and prefs_to_save["preferred_model"]:
            new_model = prefs_to_save["preferred_model"]
            ConfigManager.set("ollama", "model", new_model)
            flask_logger.info("Runtime model switched to: %s", new_model)
        
        return jsonify({"success": True}), 200
    except Exception as e:
        flask_logger.error("Failed to save preferences: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500

