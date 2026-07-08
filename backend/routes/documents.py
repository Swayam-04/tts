import os
import time
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from memory.memory import get_db, load_preferences
from documents.document_processor import extract_and_chunk
from embeddings.embedding_service import generate_embedding
from vectorstore.vector_store import add_chunks, similarity_search
from services.ollama_service import query_ollama_model
from services.chatterbox_service import generate_speech_audio
from logger import flask_logger

documents_bp = Blueprint("documents", __name__)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
ALLOWED_EXTENSIONS = {"pdf", "docx", "txt"}
MAX_FILE_SIZE = 10 * 1024 * 1024 # Default 10MB limit

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

@documents_bp.route("/upload", methods=["POST"])
def upload_document():
    """Uploads, extracts, chunks, embeds, and indexes a local document."""
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    
    if "file" not in request.files:
        return jsonify({"success": False, "error": "No file uploaded"}), 400
        
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"success": False, "error": "Empty filename"}), 400
        
    if not allowed_file(file.filename):
        return jsonify({"success": False, "error": "Unsupported file format. Use PDF, DOCX, or TXT."}), 400

    filename = secure_filename(file.filename)
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    
    # Avoid duplicates: Check if document already exists in DB
    with get_db() as conn:
        existing = conn.execute("SELECT id FROM documents WHERE filename = ?", (filename,)).fetchone()
        if existing:
            return jsonify({"success": False, "error": "Document with this name already exists."}), 409

    try:
        # Save file to uploads directory
        file.save(filepath)
        
        # Load user configurations (chunk size and overlap)
        prefs = load_preferences("default")
        chunk_size = prefs.get("chunk_size", 500)
        chunk_overlap = prefs.get("chunk_overlap", 100)
        
        file_type = filename.rsplit(".", 1)[1].lower()
        
        # Extract text and partition into chunks
        chunks = extract_and_chunk(filepath, file_type, chunk_size, chunk_overlap)
        if not chunks:
            os.remove(filepath)
            return jsonify({"success": False, "error": "No text could be extracted from this document."}), 422
            
        # Generate embeddings for each chunk
        chunks_to_index = []
        for chunk in chunks:
            content = chunk["content"]
            emb = generate_embedding(content)
            chunks_to_index.append({
                "page": chunk["page"],
                "content": content,
                "embedding": emb
            })
            
        # Save document record to SQLite
        with get_db() as conn:
            cursor = conn.execute(
                "INSERT INTO documents (user_id, filename, filepath, type) VALUES (?, ?, ?, ?)",
                ("default", filename, filepath, file_type)
            )
            doc_id = cursor.lastrowid
            
        # Add chunks with embeddings to Vector Store (SQLite blobs)
        add_chunks(doc_id, chunks_to_index)
        
        flask_logger.info("Successfully uploaded and indexed document: %s (ID: %s)", filename, doc_id)
        return jsonify({"success": True, "id": doc_id, "filename": filename, "chunks": len(chunks)}), 201
        
    except Exception as e:
        flask_logger.exception("Upload processing failed:")
        if os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({"success": False, "error": f"Failed to process document: {str(e)}"}), 500

@documents_bp.route("/documents", methods=["GET"])
def list_documents():
    """Returns a list of all indexed documents."""
    try:
        with get_db() as conn:
            rows = conn.execute("SELECT id, filename, filepath, type, uploaded_at FROM documents ORDER BY id DESC").fetchall()
            docs = [dict(row) for row in rows]
        return jsonify({"success": True, "documents": docs}), 200
    except Exception as e:
        flask_logger.error("Failed to list documents: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500

@documents_bp.route("/documents/<int:document_id>", methods=["DELETE"])
def delete_document(document_id):
    """Deletes an indexed document and cleans up disk files."""
    try:
        with get_db() as conn:
            doc = conn.execute("SELECT filepath FROM documents WHERE id = ?", (document_id,)).fetchone()
            if not doc:
                return jsonify({"success": False, "error": "Document not found"}), 404
                
            filepath = doc["filepath"]
            # Delete from SQLite (document_chunks are deleted via CASCADE)
            conn.execute("DELETE FROM documents WHERE id = ?", (document_id,))
            
        # Remove file from disk
        if os.path.exists(filepath):
            os.remove(filepath)
            
        flask_logger.info("Deleted document ID %s and associated file", document_id)
        return jsonify({"success": True}), 200
    except Exception as e:
        flask_logger.error("Failed to delete document: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500

@documents_bp.route("/summarize", methods=["POST"])
def summarize_document():
    """Generates an offline summary of the document."""
    data = request.get_json() or {}
    doc_id = data.get("document_id")
    
    if not doc_id:
        return jsonify({"success": False, "error": "document_id is required"}), 400
        
    try:
        # Load candidate text: concatenate the first few chunks (up to 8000 characters)
        with get_db() as conn:
            rows = conn.execute(
                "SELECT content FROM document_chunks WHERE document_id = ? ORDER BY id ASC LIMIT 15",
                (doc_id,)
            ).fetchall()
            
        if not rows:
            return jsonify({"success": False, "error": "Document text chunks not found"}), 404
            
        text = "\n".join([row["content"] for row in rows])
        trimmed_text = text[:8000] # Safe context length
        
        prompt = (
            "Summarize the following document content concisely and objectively. Focus on the core facts.\n\n"
            f"Content:\n{trimmed_text}\n\nSummary:"
        )
        
        flask_logger.info("Requesting document summary from Ollama...")
        summary = query_ollama_model(prompt)
        return jsonify({"success": True, "summary": summary}), 200
        
    except Exception as e:
        flask_logger.exception("Failed to summarize:")
        return jsonify({"success": False, "error": str(e)}), 500

@documents_bp.route("/ask-document", methods=["POST"])
def ask_document():
    """Retrieves relevant chunks and queries Ollama to answer a question (RAG)."""
    data = request.get_json() or {}
    question = data.get("question", "").strip()
    doc_id = data.get("document_id") # Optional (if None, searches all docs)
    
    if not question:
        return jsonify({"success": False, "error": "question is required"}), 400
        
    try:
        # 1. Embed query
        q_emb = generate_embedding(question)
        
        # 2. Perform local cosine similarity search
        k = 3 # Retrieve top 3 chunks
        matches = similarity_search(q_emb, document_id=doc_id, k=k)
        
        if not matches:
            return jsonify({
                "success": True,
                "answer": "No relevant document chunks found to answer your question.",
                "sources": []
            }), 200
            
        # 3. Build RAG Context
        context_str = ""
        sources = []
        for match in matches:
            context_str += f"\nSource: {match['filename']} (Page {match['page'] or 1}):\n{match['content']}\n---"
            sources.append({
                "document_id": match["document_id"],
                "filename": match["filename"],
                "page": match["page"]
            })
            
        # 4. Query local LLM
        prompt = (
            "You are a secure document analysis bot. Answer the user question based ONLY on the following context. "
            "If the context does not contain the answer, say 'I cannot find the answer in the provided documents.' "
            "Do not make up facts.\n\n"
            f"Context:\n{context_str}\n\n"
            f"Question: {question}\n\n"
            "Answer:"
        )
        
        flask_logger.info("Executing RAG query to Ollama...")
        answer = query_ollama_model(prompt)
        
        return jsonify({
            "success": True,
            "answer": answer,
            "sources": sources
        }), 200
        
    except Exception as e:
        flask_logger.exception("RAG pipeline query failed:")
        return jsonify({"success": False, "error": str(e)}), 500

@documents_bp.route("/read-document", methods=["POST"])
def read_document():
    """Synthesizes text content from a document into a local audio file."""
    data = request.get_json() or {}
    doc_id = data.get("document_id")
    read_type = data.get("read_type", "full") # full, pages, paragraph, text
    
    if not doc_id:
        return jsonify({"success": False, "error": "document_id is required"}), 400
        
    try:
        text_to_read = ""
        
        with get_db() as conn:
            if read_type == "full":
                rows = conn.execute("SELECT content FROM document_chunks WHERE document_id = ? ORDER BY id ASC", (doc_id,)).fetchall()
                text_to_read = " ".join([r["content"] for r in rows])
            elif read_type == "pages":
                pages = data.get("pages", [1]) # page numbers
                placeholders = ",".join(["?"] * len(pages))
                query = f"SELECT content FROM document_chunks WHERE document_id = ? AND page IN ({placeholders}) ORDER BY id ASC"
                params = [doc_id] + list(pages)
                rows = conn.execute(query, params).fetchall()
                text_to_read = " ".join([r["content"] for r in rows])
            elif read_type == "text":
                text_to_read = data.get("text", "").strip()
            else:
                return jsonify({"success": False, "error": "Invalid read_type specified."}), 400

        if not text_to_read:
            return jsonify({"success": False, "error": "No text content found for the selection."}), 422
            
        # Limit text length to prevent CPU/memory exhaustion (default max 3000 characters)
        text_to_read = text_to_read[:3000]
        
        # Call Chatterbox TTS
        static_audio_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "audio")
        audio_result = generate_speech_audio(text_to_read, static_audio_dir)
        audio_filename = audio_result["filename"]
        
        return jsonify({
            "success": True,
            "audio_file": f"/static/audio/{audio_filename}",
            "text_length": len(text_to_read)
        }), 200
        
    except Exception as e:
        flask_logger.exception("Text-to-speech reading failed:")
        return jsonify({"success": False, "error": str(e)}), 500
