import os
import time
import traceback
from services.ollama_service import query_ollama_model
from services.omnivoice_service import generate_speech_audio
from exceptions import OllamaError, OmniVoiceError
from logger import pipeline_logger

class PipelineOrchestrator:
    @staticmethod
    def generate_response(prompt):
        try:
            start_time = time.time()
            pipeline_logger.info("Starting pipeline generation for prompt: %s", prompt)
            
            # 1. Ollama Stage
            try:
                ollama_start = time.time()
                response_text = query_ollama_model(prompt)
                ollama_latency = time.time() - ollama_start
                pipeline_logger.info("Ollama stage completed in %.2fs. Generated text length: %d", ollama_latency, len(response_text))
                
                if not response_text or response_text.strip() == "":
                    return PipelineOrchestrator._format_error("Ollama", "Generated text is empty")
                    
            except OllamaError as e:
                return PipelineOrchestrator._format_error("Ollama", str(e))

            # 2. OmniVoice Stage
            try:
                tts_start = time.time()
                static_audio_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "audio")
                audio_result = generate_speech_audio(response_text, static_audio_dir)
                audio_filename = audio_result["filename"]
                tts_latency = time.time() - tts_start
                pipeline_logger.info("OmniVoice stage completed in %.2fs", tts_latency)
            except OmniVoiceError as e:
                return PipelineOrchestrator._format_error("OmniVoice", str(e))
                
            total_latency = time.time() - start_time
            pipeline_logger.info("Pipeline completed successfully in %.2fs", total_latency)
            
            return {
                "success": True,
                "generated_text": response_text,
                "audio_file": f"/static/audio/{audio_filename}",
                "latencies": {
                    "ollama": round(ollama_latency, 2),
                    "omnivoice": round(tts_latency, 2),
                    "total": round(total_latency, 2)
                }
            }
            
        except Exception as e:
            return PipelineOrchestrator._format_error("Flask", str(e))
            
    @staticmethod
    def _format_error(stage, reason):
        tb = traceback.format_exc()
        pipeline_logger.error("Pipeline Error at %s stage: %s\n%s", stage, reason, tb)
        return {
            "success": False,
            "stage": stage,
            "reason": reason,
            "trace": tb
        }
