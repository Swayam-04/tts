import os
import time
import uuid
import threading
from config import Config
from logger import chatterbox_logger
from exceptions import ChatterboxError

# Global state for the singleton model
_chatterbox_model = None
_model_lock = threading.Lock()

def check_chatterbox_status() -> bool:
    """Compatibility wrapper for health check."""
    return health()

def initialize():
    """Load the Chatterbox model into memory if not already loaded."""
    global _chatterbox_model
    with _model_lock:
        if _chatterbox_model is not None:
            return

        chatterbox_logger.info("Initializing Chatterbox TTS Model: %s", Config.CHATTERBOX_MODEL)
        try:
            import torch
            from chatterbox import ChatterboxTTS
            
            device = getattr(Config, 'CHATTERBOX_DEVICE', 'cuda')
            if device == 'cuda' and not torch.cuda.is_available():
                device = 'cpu'
                chatterbox_logger.warning("CUDA not available, falling back to CPU for Chatterbox")
            
            _chatterbox_model = ChatterboxTTS.from_pretrained(device)
            _chatterbox_initialized = True
            chatterbox_logger.info("Chatterbox TTS initialized on device: %s", device)
        except Exception as e:
            chatterbox_logger.exception("Failed to initialize Chatterbox TTS: %s", str(e))
            raise ChatterboxError(f"Initialization failed: {str(e)}")

def health() -> bool:
    """Check if Chatterbox is initialized and ready"""
    with _model_lock:
        return _chatterbox_model is not None

def list_models() -> list:
    """Return available model info"""
    if not health():
        return []
    return [{"id": Config.CHATTERBOX_MODEL, "device": getattr(Config, 'CHATTERBOX_DEVICE', 'cuda')}]

import re

def clean_text_for_tts(text: str) -> str:
    """Removes table formatting, page numbers, control characters, extra spacing for clean TTS."""
    if not text:
        return ""
    # Remove table formatting
    text = re.sub(r'\|', ' ', text)
    text = re.sub(r'\+[-+]+\+', ' ', text)
    text = re.sub(r'={3,}', ' ', text)
    text = re.sub(r'-{3,}', ' ', text)
    text = re.sub(r'_{3,}', ' ', text)
    # Remove control characters
    text = "".join(ch for ch in text if ch.isprintable() or ch in ['\n', '\r', '\t'])
    # Remove page numbers
    text = re.sub(r'(?i)\bpage\b\s*\d+\s*(?:\bof\b\s*\d+)?', ' ', text)
    # Remove multiple blank lines and extra spaces
    text = re.sub(r'\n\s*\n', '\n', text)
    text = re.sub(r'[ \t]+', ' ', text)
    return text.strip()

def chunk_text_for_tts(text: str) -> list:
    """Splits text into chunks between 800 and 1200 characters respecting sentence boundaries."""
    sentences = re.split(r'(?<=[.?!])\s+', text)
    chunks = []
    current_chunk = []
    current_length = 0
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        if current_length + len(sentence) > 1200 and current_chunk:
            chunks.append(" ".join(current_chunk))
            current_chunk = [sentence]
            current_length = len(sentence)
        else:
            current_chunk.append(sentence)
            current_length += len(sentence) + 1
        if len(sentence) > 1200:
            long_sentence = current_chunk.pop()
            words = long_sentence.split(' ')
            sub_chunk = []
            sub_len = 0
            for word in words:
                if sub_len + len(word) > 1000 and sub_chunk:
                    chunks.append(" ".join(sub_chunk))
                    sub_chunk = [word]
                    sub_len = len(word)
                else:
                    sub_chunk.append(word)
                    sub_len += len(word) + 1
            if sub_chunk:
                current_chunk = [" ".join(sub_chunk)]
                current_length = len(current_chunk[0])
    if current_chunk:
        chunks.append(" ".join(current_chunk))
    return chunks

def generate_speech_audio(text: str, output_dir: str) -> dict:
    """Generate speech using Chatterbox TTS and save to MP3 with auto-chunking & cleaning"""
    global _chatterbox_model
    
    start_time = time.time()
    
    # 1. Clean input formatting
    cleaned_text = clean_text_for_tts(text)
    if not cleaned_text or len(cleaned_text.strip()) == 0:
        raise ChatterboxError("No readable text found.")
        
    with _model_lock:
        if _chatterbox_model is None:
            chatterbox_logger.warning("Chatterbox model not initialized. Initializing now...")
            initialize()
            if _chatterbox_model is None:
                raise ChatterboxError("Chatterbox returned an error: Model initialization failed.")
                
    try:
        import torch
        import torchaudio
        
        # 2. Split into safe chunks of 800-1200 characters
        text_chunks = chunk_text_for_tts(cleaned_text)
        chatterbox_logger.info("Extracted Character Count: %d", len(cleaned_text))
        chatterbox_logger.info("Chunk Count: %d", len(text_chunks))
        
        all_audio = []
        
        # Generate audio sequentially for each chunk
        for chunk_idx, chunk in enumerate(text_chunks):
            # Split chunk into sentences for fine-grained generation
            chunks = re.split(r'([.?!]+)', chunk)
            sentences = []
            for i in range(0, len(chunks)-1, 2):
                sentences.append(chunks[i] + chunks[i+1])
            if len(chunks) % 2 != 0 and chunks[-1].strip():
                sentences.append(chunks[-1])
                
            if not sentences:
                sentences = [chunk]
                
            for sentence in sentences:
                sentence = sentence.strip()
                if not sentence:
                    continue
                
                # Chatterbox generation
                try:
                    audio_tensor = _chatterbox_model.generate(sentence)
                except Exception as gen_err:
                    chatterbox_logger.error("Chatterbox returned an error during synthesis: %s", gen_err)
                    raise ChatterboxError(f"Chatterbox returned an error: {str(gen_err)}")
                
                if isinstance(audio_tensor, tuple):
                    audio_tensor = audio_tensor[0]
                    
                if audio_tensor.dim() == 1:
                    audio_tensor = audio_tensor.unsqueeze(0)
                elif audio_tensor.dim() > 2:
                    audio_tensor = audio_tensor.squeeze()
                    if audio_tensor.dim() == 1:
                        audio_tensor = audio_tensor.unsqueeze(0)
                
                all_audio.append(audio_tensor)
                
        if not all_audio:
            raise ChatterboxError("Failed to generate audio: No audio tensors generated.")
            
        # Concatenate audio tensors sequentially (Failed to merge audio validation)
        try:
            audio_tensor = torch.cat(all_audio, dim=-1)
        except Exception as cat_err:
            chatterbox_logger.error("Failed to merge audio tensors: %s", cat_err)
            raise ChatterboxError(f"Failed to merge audio: {str(cat_err)}")
            
        os.makedirs(output_dir, exist_ok=True)
        filename = f"chatterbox_{uuid.uuid4().hex[:8]}.mp3"
        filepath = os.path.join(output_dir, filename)
        
        wav_path = filepath.replace(".mp3", ".wav")
        sample_rate = getattr(Config, 'CHATTERBOX_SAMPLE_RATE', 24000)
        
        # Save audio using torchaudio as WAV first
        torchaudio.save(wav_path, audio_tensor.cpu(), sample_rate=sample_rate)
        
        # Convert WAV to MP3 using lameenc
        encoding_start = time.time()
        try:
            import lameenc
            pcm_tensor = (torch.clamp(audio_tensor, -1.0, 1.0) * 32767.0).to(torch.int16)
            if pcm_tensor.shape[0] > 1:
                pcm_data = pcm_tensor.T.numpy().tobytes()
            else:
                pcm_data = pcm_tensor.numpy().tobytes()
                
            encoder = lameenc.Encoder()
            encoder.set_bit_rate(192)
            encoder.set_in_sample_rate(sample_rate)
            encoder.set_channels(pcm_tensor.shape[0])
            encoder.set_quality(2)
            
            mp3_data = encoder.encode(pcm_data)
            mp3_data += encoder.flush()
            
            with open(filepath, "wb") as f:
                f.write(mp3_data)
                
            # Delete temporary chunk WAV files after MP3 creation
            if os.path.exists(wav_path):
                os.remove(wav_path)
                
            chatterbox_logger.info("Successfully encoded and saved MP3 to %s", filepath)
        except Exception as encode_err:
            chatterbox_logger.error("lameenc conversion failed, falling back to WAV: %s", encode_err)
            filename = filename.replace(".mp3", ".wav")
            filepath = wav_path
        encoding_time = time.time() - encoding_start
            
        duration = float(audio_tensor.shape[-1]) / sample_rate
        generation_time = time.time() - start_time
        
        chatterbox_logger.info("Audio saved to %s (duration: %.2f seconds, elapsed: %.2f seconds)", filepath, duration, generation_time)
        
        return {
            "success": True,
            "filename": filename,
            "filepath": filepath,
            "duration": round(duration, 2),
            "generation_time": round(generation_time, 2),
            "encoding_time": round(encoding_time, 2),
            "character_count": len(cleaned_text),
            "chunk_count": len(text_chunks)
        }
    except Exception as e:
        chatterbox_logger.error("Failed to generate speech: %s", str(e))
        if 'ChatterboxError' in str(type(e)):
            raise
        raise ChatterboxError(f"Generation failed: {e}")
