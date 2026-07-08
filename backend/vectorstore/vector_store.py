import numpy as np
import logging
from memory.memory import get_db

vector_logger = logging.getLogger("vaani_vector_store")

def add_chunks(document_id: int, chunks: list):
    """
    Saves a list of document chunks to the database.
    Each chunk is a dict containing 'page' (int or None), 'content' (str), and 'embedding' (list of floats).
    """
    with get_db() as conn:
        for chunk in chunks:
            page = chunk.get("page")
            content = chunk.get("content", "")
            embedding_list = chunk.get("embedding", [])
            
            # Serialize the float embedding list to float32 binary blob
            embedding_blob = np.array(embedding_list, dtype=np.float32).tobytes()
            
            conn.execute(
                "INSERT INTO document_chunks (document_id, page, content, embedding) VALUES (?, ?, ?, ?)",
                (document_id, page, content, embedding_blob)
            )
    vector_logger.info(f"Successfully added {len(chunks)} chunks for document ID: {document_id}")

def similarity_search(query_embedding: list, document_id: int = None, k: int = 3) -> list:
    """
    Performs cosine-similarity search against document chunks stored in SQLite.
    If document_id is provided, searches only within that document. Otherwise, searches across all documents.
    """
    if not query_embedding:
        return []
        
    q_arr = np.array(query_embedding, dtype=np.float32)
    q_norm = np.linalg.norm(q_arr)
    if q_norm == 0:
        return []

    # Retrieve candidate chunks from SQLite
    with get_db() as conn:
        if document_id is not None:
            rows = conn.execute(
                """
                SELECT c.id, c.page, c.content, c.embedding, d.filename, d.id as doc_id
                FROM document_chunks c
                JOIN documents d ON c.document_id = d.id
                WHERE c.document_id = ?
                """,
                (document_id,)
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT c.id, c.page, c.content, c.embedding, d.filename, d.id as doc_id
                FROM document_chunks c
                JOIN documents d ON c.document_id = d.id
                """
            ).fetchall()

    if not rows:
        return []

    results = []
    for row in rows:
        emb_blob = row["embedding"]
        if not emb_blob:
            continue
            
        # Deserialize binary blob back to a float32 NumPy array
        c_arr = np.frombuffer(emb_blob, dtype=np.float32)
        
        # Guard if dimensions mismatched
        if len(c_arr) != len(q_arr):
            continue
            
        c_norm = np.linalg.norm(c_arr)
        if c_norm == 0:
            similarity = 0.0
        else:
            similarity = float(np.dot(q_arr, c_arr) / (q_norm * c_norm))

        results.append({
            "chunk_id": row["id"],
            "page": row["page"],
            "content": row["content"],
            "filename": row["filename"],
            "document_id": row["doc_id"],
            "score": similarity
        })

    # Sort by score descending and return top k
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:k]
