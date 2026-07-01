import os
import requests
import logging
from config import Config
from exceptions import OmniVoiceError

def generate_speech_audio(text, output_dir):
    """
    Calls the local OmniVoice Studio API to synthesize speech from text.
    Saves the resulting MP3 to output_dir/output.mp3
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    filename = "output.mp3"
    filepath = os.path.join(output_dir, filename)

    payload = {
        "model": "omnivoice",
        "input": text,
        "voice": "default",
        "response_format": "mp3",
        "speed": 1,
        "language": "",
        "description": "",
        "instruct": "",
        "duration": 1,
        "seed": 1,
        "denoise": True,
        "preprocess_prompt": True,
        "chunk_duration": 0,
        "chunk_threshold": 0
    }

    url = f"{Config.OMNIVOICE_BASE_URL}/v1/audio/speech"
    
    logging.info("OmniVoice request URL: %s", url)
    # Exclude full text from payload log to avoid clutter, or log it entirely
    logging.info("OmniVoice request payload: %s", payload)

    try:
        response = requests.post(url, json=payload, timeout=60)
        
        if response.status_code == 200:
            logging.info("OmniVoice response: 200 OK (Audio stream received, %d bytes)", len(response.content))
            with open(filepath, 'wb') as f:
                f.write(response.content)
            return filename
        else:
            err_msg = f"OmniVoice Studio Error {response.status_code}: {response.text}"
            logging.error("OmniVoice response: %s", err_msg)
            raise OmniVoiceError(response.text)

    except requests.exceptions.ConnectionError as e:
        err_msg = f"Failed to connect to OmniVoice Studio: {str(e)}"
        logging.error(err_msg)
        raise OmniVoiceError(err_msg)
    except requests.exceptions.RequestException as e:
        err_msg = f"OmniVoice request failed: {str(e)}"
        logging.error(err_msg)
        raise OmniVoiceError(err_msg)
