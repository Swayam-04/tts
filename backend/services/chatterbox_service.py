import os
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

def generate_speech_audio(text: str, output_dir: str) -> dict:
    """Generate speech using Chatterbox TTS and save to MP3"""
    global _chatterbox_model
    
    if not text or not text.strip():
        raise ChatterboxError("Empty text provided for TTS")
        
    with _model_lock:
        if _chatterbox_model is None:
            chatterbox_logger.warning("Chatterbox model not initialized. Initializing now...")
            initialize()
            if _chatterbox_model is None:
                raise ChatterboxError("Model initialization failed.")

    try:
        import torch
        import torchaudio
        chatterbox_logger.info("Generating audio for text: %s...", text[:50])
        
        import re
        
        # Split by sentences but keep delimiters
        chunks = re.split(r'([.?!]+)', text)
        sentences = []
        for i in range(0, len(chunks)-1, 2):
            sentences.append(chunks[i] + chunks[i+1])
        if len(chunks) % 2 != 0 and chunks[-1].strip():
            sentences.append(chunks[-1])
            
        if not sentences:
            sentences = [text]
            
        all_audio = []
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence: continue
            
            # Chatterbox generation
            audio_tensor = _chatterbox_model.generate(sentence)
            
            # Check if output is a tuple (some TTS models return audio and sample rate)
            if isinstance(audio_tensor, tuple):
                audio_tensor = audio_tensor[0]
    
            # Ensure tensor is 2D: [channels, time]
            if audio_tensor.dim() == 1:
                audio_tensor = audio_tensor.unsqueeze(0)
            elif audio_tensor.dim() > 2:
                audio_tensor = audio_tensor.squeeze()
                if audio_tensor.dim() == 1:
                    audio_tensor = audio_tensor.unsqueeze(0)
            
            all_audio.append(audio_tensor)
            
        if not all_audio:
            raise ChatterboxError("Failed to generate audio tensors")
            
        # Concatenate audio tensors
        audio_tensor = torch.cat(all_audio, dim=-1)

        os.makedirs(output_dir, exist_ok=True)
        filename = f"chatterbox_{uuid.uuid4().hex[:8]}.mp3"
        filepath = os.path.join(output_dir, filename)

        wav_path = filepath.replace(".mp3", ".wav")
        sample_rate = getattr(Config, 'CHATTERBOX_SAMPLE_RATE', 24000)
        
        # Save audio using torchaudio as WAV first
        torchaudio.save(wav_path, audio_tensor.cpu(), sample_rate=sample_rate)
        
        # Just return the WAV file natively (HTML5 <audio> plays .wav perfectly)
        filename = filename.replace(".mp3", ".wav")
        filepath = wav_path
        
        chatterbox_logger.info("Audio saved to %s", filepath)
        
        return {
            "success": True,
            "filename": filename,
            "filepath": filepath
        }
    except Exception as e:
        chatterbox_logger.error("Failed to generate speech: %s", str(e))
        raise ChatterboxError(f"Generation failed: {e}")
