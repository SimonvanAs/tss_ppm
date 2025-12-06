"""
Local Whisper Speech-to-Text Server
Uses Hugging Face Transformers Whisper model running locally for privacy-focused transcription.
"""

import os
import tempfile
import subprocess
from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline
import librosa
import numpy as np

app = Flask(__name__)
CORS(app)

# Determine device and dtype
device = "cuda:0" if torch.cuda.is_available() else "cpu"
torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32

print(f"Using device: {device}")
print("Loading Whisper 'small' model... (this may take a moment on first run)")

# Load model and processor from Hugging Face
model_id = "openai/whisper-small"

model = AutoModelForSpeechSeq2Seq.from_pretrained(
    model_id,
    torch_dtype=torch_dtype,
    low_cpu_mem_usage=True,
    use_safetensors=True
)
model.to(device)

processor = AutoProcessor.from_pretrained(model_id)

# Create pipeline
pipe = pipeline(
    "automatic-speech-recognition",
    model=model,
    tokenizer=processor.tokenizer,
    feature_extractor=processor.feature_extractor,
    torch_dtype=torch_dtype,
    device=device,
)

print("Model loaded successfully!")

# Language code mapping
LANGUAGE_MAP = {
    'en': 'english',
    'en-US': 'english',
    'en-GB': 'english',
    'nl': 'dutch',
    'nl-NL': 'dutch',
    'es': 'spanish',
    'es-ES': 'spanish',
}


def convert_audio_to_wav(input_path, output_path):
    """Convert audio file to WAV format using ffmpeg if available, otherwise try librosa."""
    try:
        # Try ffmpeg first (handles more formats)
        result = subprocess.run(
            ['ffmpeg', '-i', input_path, '-ar', '16000', '-ac', '1', '-y', output_path],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            return True
    except FileNotFoundError:
        pass  # ffmpeg not installed

    # Fallback: try loading directly with librosa
    try:
        audio, sr = librosa.load(input_path, sr=16000, mono=True)
        import soundfile as sf
        sf.write(output_path, audio, 16000)
        return True
    except Exception as e:
        print(f"Audio conversion failed: {e}")
        return False


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'model': 'whisper-small', 'device': device})


@app.route('/transcribe', methods=['POST'])
def transcribe():
    """
    Transcribe audio file to text.
    Expects multipart form data with:
    - audio: audio file (webm, mp3, wav, etc.)
    - language: language code (optional, e.g., 'en', 'nl', 'es')
    """
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400

    audio_file = request.files['audio']
    language = request.form.get('language', 'en')

    # Map language code
    whisper_language = LANGUAGE_MAP.get(language, 'english')

    # Save to temporary file
    temp_path = None
    wav_path = None
    try:
        # Create temp file with appropriate extension
        suffix = '.webm'
        if audio_file.filename:
            _, ext = os.path.splitext(audio_file.filename)
            if ext:
                suffix = ext

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_path = temp_file.name
            audio_file.save(temp_path)

        print(f"Received audio file: {temp_path} ({os.path.getsize(temp_path)} bytes)")

        # Convert to WAV for better compatibility
        wav_path = temp_path + '.wav'

        # Try direct loading first with librosa
        try:
            print(f"Loading audio with librosa...")
            audio_array, sr = librosa.load(temp_path, sr=16000, mono=True)
            print(f"Audio loaded: {len(audio_array)} samples, {sr}Hz")
        except Exception as e:
            print(f"Direct loading failed: {e}")
            # Try converting first
            if convert_audio_to_wav(temp_path, wav_path):
                audio_array, sr = librosa.load(wav_path, sr=16000, mono=True)
            else:
                raise Exception("Could not load or convert audio file")

        print(f"Transcribing audio ({whisper_language})...")

        # Transcribe with Whisper pipeline using audio array
        result = pipe(
            {"raw": audio_array, "sampling_rate": 16000},
            generate_kwargs={"language": whisper_language}
        )

        text = result['text'].strip()
        print(f"Transcription: {text}")

        return jsonify({'text': text})

    except Exception as e:
        print(f"Transcription error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Transcription failed', 'details': str(e)}), 500

    finally:
        # Clean up temp files
        for path in [temp_path, wav_path]:
            if path and os.path.exists(path):
                try:
                    os.unlink(path)
                except Exception:
                    pass


if __name__ == '__main__':
    print("\n" + "="*50)
    print("Local Whisper Speech-to-Text Server")
    print("="*50)
    print(f"Model: whisper-small (~500MB)")
    print(f"Device: {device}")
    print("Supported languages: English, Dutch, Spanish")
    print("Server running at: http://localhost:3001")
    print("="*50 + "\n")

    app.run(host='0.0.0.0', port=3001, debug=False)
