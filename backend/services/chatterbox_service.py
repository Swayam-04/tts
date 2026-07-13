import os
import time
import uuid
import threading
from pathlib import Path
from config import Config
from logger import chatterbox_logger
from exceptions import ChatterboxError

# Global state for both single language packs
_chatterbox_model_en = None
_chatterbox_model_hi = None
_model_lock = threading.Lock()

# Centralized voice profiles map pointing to different reference audio files
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICE_MAP = {
    "default": os.path.join(_backend_dir, "voices", "default.wav"),
    "male": os.path.join(_backend_dir, "voices", "male.wav"),
    "female": os.path.join(_backend_dir, "voices", "female.wav"),
    "drdo": os.path.join(_backend_dir, "voices", "drdo.wav"),
    "neural": os.path.join(_backend_dir, "voices", "drdo.wav")
}

def check_chatterbox_status() -> bool:
    """Compatibility wrapper for health check."""
    return health()

def get_latest_snapshot(repo_name: str) -> Path:
    from pathlib import Path
    import os
    cache_base = Path(os.path.expanduser("~")) / ".cache" / "huggingface" / "hub"
    repo_dir = cache_base / f"models--{repo_name.replace('/', '--')}"
    snapshots_dir = repo_dir / "snapshots"
    if snapshots_dir.exists():
        snapshots = sorted(list(snapshots_dir.iterdir()))
        if snapshots:
            return snapshots[-1]
    return None

def initialize():
    """Load both Chatterbox English and Hindi models into memory."""
    global _chatterbox_model_en, _chatterbox_model_hi
    with _model_lock:
        device = getattr(Config, 'CHATTERBOX_DEVICE', 'cuda')
        import torch
        if device == 'cuda' and not torch.cuda.is_available():
            device = 'cpu'

        # 1. Load English single language pack
        if _chatterbox_model_en is None:
            chatterbox_logger.info("Initializing English single language pack...")
            try:
                from chatterbox import ChatterboxTTS
                from pathlib import Path
                from huggingface_hub import hf_hub_download

                # Resolve locally if possible
                local_dir = get_latest_snapshot("ResembleAI/chatterbox")
                if local_dir:
                    _chatterbox_model_en = ChatterboxTTS.from_local(local_dir, device)
                else:
                    _chatterbox_model_en = ChatterboxTTS.from_pretrained(device)
                chatterbox_logger.info("English single language pack loaded successfully!")
            except Exception as e:
                chatterbox_logger.error("Failed to load English language pack: %s", e)

        # 2. Hindi single language pack is loaded lazily on-demand via ensure_hindi_loaded()

def ensure_hindi_loaded():
    """Load the Hindi model lazily on-demand if it hasn't been loaded yet."""
    global _chatterbox_model_hi
    if _chatterbox_model_hi is not None:
        return True

    with _model_lock:
        if _chatterbox_model_hi is not None:
            return True

        device = getattr(Config, 'CHATTERBOX_DEVICE', 'cuda')
        import torch
        if device == 'cuda' and not torch.cuda.is_available():
            device = 'cpu'

        chatterbox_logger.info("Initializing Hindi single language pack on-demand...")
        try:
            from chatterbox.mtl_tts import ChatterboxMultilingualTTS, T3, S3Gen, VoiceEncoder, MTLTokenizer, Conditionals
            from chatterbox.models.t3.modules.t3_config import T3Config
            from safetensors.torch import load_file as load_safetensors
            from huggingface_hub import snapshot_download
            from pathlib import Path

            # Try local first
            ckpt_dir = get_latest_snapshot("ResembleAI/Chatterbox-Multilingual-hi")
            if not ckpt_dir:
                try:
                    ckpt_dir = Path(snapshot_download(
                        repo_id="ResembleAI/Chatterbox-Multilingual-hi",
                        repo_type="model",
                        revision="main",
                        allow_patterns=["ve.pt", "t3_hi.safetensors", "s3gen.pt", "grapheme_mtl_merged_expanded_v1.json", "conds.pt"],
                        local_files_only=True
                    ))
                except Exception:
                    ckpt_dir = Path(snapshot_download(
                        repo_id="ResembleAI/Chatterbox-Multilingual-hi",
                        repo_type="model",
                        revision="main",
                        allow_patterns=["ve.pt", "t3_hi.safetensors", "s3gen.pt", "grapheme_mtl_merged_expanded_v1.json", "conds.pt"]
                    ))

            # Load generic English components for S3Gen and VoiceEncoder if missing
            en_dir = get_latest_snapshot("ResembleAI/chatterbox")
            if not en_dir:
                from huggingface_hub import hf_hub_download
                en_local_file = hf_hub_download(repo_id="ResembleAI/chatterbox", filename="ve.safetensors")
                en_dir = Path(en_local_file).parent

            map_location = torch.device('cpu') if device in ["cpu", "mps"] else None

            ve = VoiceEncoder()
            ve.load_state_dict(load_safetensors(en_dir / "ve.safetensors"))
            ve.to(device).eval()

            s3gen = S3Gen()
            s3gen.load_state_dict(load_safetensors(en_dir / "s3gen.safetensors"), strict=False)
            s3gen.to(device).eval()

            # Load T3 Hindi weights and MTLTokenizer configuration
            t3 = T3(T3Config.multilingual())
            t3_state = load_safetensors(ckpt_dir / "t3_hi.safetensors")
            if "model" in t3_state.keys():
                t3_state = t3_state["model"][0]
            t3.load_state_dict(t3_state)
            t3.to(device).eval()

            tokenizer = MTLTokenizer(str(ckpt_dir / "grapheme_mtl_merged_expanded_v1.json"))

            conds = None
            if (ckpt_dir / "conds.pt").exists():
                conds = Conditionals.load(ckpt_dir / "conds.pt", map_location=map_location).to(device)
            elif (en_dir / "conds.pt").exists():
                conds = Conditionals.load(en_dir / "conds.pt", map_location=map_location).to(device)

            _chatterbox_model_hi = ChatterboxMultilingualTTS(t3, s3gen, ve, tokenizer, device, conds=conds)
            
            # Check if loaded conditionals are missing speech prompt tokens (common when reusing English conds)
            if _chatterbox_model_hi.conds is None or _chatterbox_model_hi.conds.t3.cond_prompt_speech_tokens is None:
                chatterbox_logger.info("Hindi conditionals missing speech tokens. Preparing from silent dummy WAV...")
                import tempfile
                import wave
                import struct
                
                fd, tmp_wav_path = tempfile.mkstemp(suffix=".wav")
                try:
                    os.close(fd)
                    sample_rate = 16000
                    duration = 1.0
                    num_samples = int(sample_rate * duration)
                    with wave.open(tmp_wav_path, 'wb') as wav_file:
                        wav_file.setnchannels(1)
                        wav_file.setsampwidth(2)
                        wav_file.setframerate(sample_rate)
                        for _ in range(num_samples):
                            wav_file.writeframesraw(struct.pack('<h', 0))
                            
                    _chatterbox_model_hi.prepare_conditionals(tmp_wav_path)
                    chatterbox_logger.info("Hindi conditionals prepared successfully using dummy reference.")
                finally:
                    try:
                        os.remove(tmp_wav_path)
                    except Exception:
                        pass
            
            chatterbox_logger.info("Hindi single language pack loaded successfully on-demand!")
            return True
        except Exception as e:
            chatterbox_logger.error("Failed to load Hindi language pack: %s", e)
            raise e

def health() -> bool:
    """Check if English language pack is loaded."""
    with _model_lock:
        return _chatterbox_model_en is not None

def list_models() -> list:
    """Return available language pack details."""
    models = []
    device = getattr(Config, 'CHATTERBOX_DEVICE', 'cuda')
    if _chatterbox_model_en is not None:
        models.append({"id": "en", "name": "English Pack", "device": device})
    models.append({"id": "hi", "name": "Hindi Pack", "device": device})
    return models

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

def generate_speech_audio(text: str, output_dir: str, language: str = 'en', voice: str = 'default') -> dict:
    """Generate speech using Chatterbox TTS and save to MP3 with auto-chunking & cleaning"""
    global _chatterbox_model_en, _chatterbox_model_hi
    
    # Validate incoming voice
    if not voice or voice not in VOICE_MAP:
        voice = "default"
        
    reference_audio = VOICE_MAP[voice]
    if not os.path.exists(reference_audio):
        raise ChatterboxError(f"Voice profile unavailable: Reference audio file for '{voice}' is missing.")
        
    # Debug logging
    chatterbox_logger.info("Selected Voice: %s", voice)
    chatterbox_logger.info("Reference File: %s", reference_audio)
    chatterbox_logger.info("Generation Started")
    print(f"Selected Voice: {voice}")
    print(f"Reference File: {reference_audio}")
    print("Generation Started")

    start_time = time.time()
    
    # 1. Clean input formatting
    cleaned_text = clean_text_for_tts(text)
    if not cleaned_text or len(cleaned_text.strip()) == 0:
        raise ChatterboxError("No readable text found.")
        
    if language == 'hi':
        ensure_hindi_loaded()
        model = _chatterbox_model_hi
    else:
        if _chatterbox_model_en is None:
            initialize()
        model = _chatterbox_model_en

    if model is None:
        raise ChatterboxError(f"Chatterbox returned an error: Model initialization failed for language {language}.")
                
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
                    if language == 'hi':
                        audio_tensor = model.generate(sentence, language_id='hi', audio_prompt_path=reference_audio)
                    else:
                        audio_tensor = model.generate(sentence, audio_prompt_path=reference_audio)
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
                
        # Debug logging
        chatterbox_logger.info("Generation Completed")
        print("Generation Completed")
                
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
