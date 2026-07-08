import os
import logging

doc_logger = logging.getLogger("vaani_doc_processor")

def parse_pdf(filepath: str) -> list:
    """
    Extracts text page-by-page from a PDF file.
    Tries PyMuPDF (fitz) first, falls back to pdfplumber.
    Returns a list of tuples: (page_num, page_text)
    """
    pages = []
    
    # 1. Try PyMuPDF (fitz)
    try:
        import fitz
        doc_logger.info("Parsing PDF with PyMuPDF...")
        doc = fitz.open(filepath)
        for page_num, page in enumerate(doc):
            text = page.get_text() or ""
            pages.append((page_num + 1, text))
        return pages
    except ImportError:
        doc_logger.warning("PyMuPDF (fitz) not installed. Trying pdfplumber fallback...")
    except Exception as e:
        doc_logger.error(f"PyMuPDF error: {e}. Trying pdfplumber fallback...")

    # 2. Try pdfplumber
    try:
        import pdfplumber
        doc_logger.info("Parsing PDF with pdfplumber...")
        with pdfplumber.open(filepath) as pdf:
            for page_num, page in enumerate(pdf.pages):
                text = page.extract_text() or ""
                pages.append((page_num + 1, text))
        return pages
    except ImportError:
        doc_logger.error("Both PyMuPDF and pdfplumber are missing. Cannot parse PDF.")
        raise ImportError("No PDF parser installed. Please install 'pymupdf' or 'pdfplumber'.")
    except Exception as e:
        doc_logger.error(f"pdfplumber error: {e}")
        raise

def parse_docx(filepath: str) -> list:
    """
    Extracts text from a Word document (.docx).
    Treats each paragraph as a content block.
    Returns a list of tuples: (page_num, text) (where page_num is defaulted to 1).
    """
    try:
        import docx
        doc_logger.info("Parsing DOCX with python-docx...")
        doc = docx.Document(filepath)
        # Combine all paragraphs with newlines
        full_text = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
        # docx doesn't have simple native page numbers, we group as page 1
        return [(1, full_text)]
    except ImportError:
        doc_logger.error("python-docx is not installed. Cannot parse DOCX.")
        raise ImportError("DOCX parser not installed. Please install 'python-docx'.")
    except Exception as e:
        doc_logger.error(f"docx parsing error: {e}")
        raise

def parse_txt(filepath: str) -> list:
    """
    Extracts text from a raw text file (.txt).
    Returns a list of tuples: (page_num, text) (where page_num is defaulted to 1).
    """
    try:
        doc_logger.info("Parsing TXT natively...")
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()
        return [(1, text)]
    except Exception as e:
        doc_logger.error(f"TXT parsing error: {e}")
        raise

def chunk_document_text(pages: list, chunk_size: int = 500, chunk_overlap: int = 100) -> list:
    """
    Splits page-by-page text into overlapping chunks, maintaining page mapping.
    Each chunk is returned as a dict: {'page': int, 'content': str}
    """
    chunks = []
    
    for page_num, text in pages:
        text = text.strip()
        if not text:
            continue
            
        # Simple word-based chunker with character-size limit
        words = text.split()
        current_chunk = []
        current_char_count = 0
        
        for word in words:
            current_chunk.append(word)
            current_char_count += len(word) + 1 # +1 for space
            
            if current_char_count >= chunk_size:
                chunks.append({
                    "page": page_num,
                    "content": " ".join(current_chunk)
                })
                # Handle overlap: take last N words that fit into the overlap size
                overlap_words = []
                overlap_len = 0
                for w in reversed(current_chunk):
                    if overlap_len + len(w) + 1 <= chunk_overlap:
                        overlap_words.insert(0, w)
                        overlap_len += len(w) + 1
                    else:
                        break
                current_chunk = overlap_words
                current_char_count = overlap_len
                
        # Append remaining text if any
        if current_chunk:
            chunks.append({
                "page": page_num,
                "content": " ".join(current_chunk)
            })
            
    return chunks

def extract_and_chunk(filepath: str, file_type: str, chunk_size: int = 500, chunk_overlap: int = 100) -> list:
    """
    Main orchestrator for extracting text and chunking it based on file type.
    """
    file_type = file_type.lower()
    if file_type == "pdf":
        pages = parse_pdf(filepath)
    elif file_type in ["docx", "doc"]:
        pages = parse_docx(filepath)
    elif file_type in ["txt", "text"]:
        pages = parse_txt(filepath)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")
        
    return chunk_document_text(pages, chunk_size, chunk_overlap)
