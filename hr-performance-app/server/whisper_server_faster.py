"""
Production Whisper Speech-to-Text Server using Faster-Whisper
Uses CTranslate2 backend for 4x faster inference on CPU with lower RAM usage.
Designed to run with Gunicorn for production deployments.
"""

import os
import tempfile
import subprocess
from flask import Flask, request, jsonify
from flask_cors import CORS
from faster_whisper import WhisperModel
import librosa
import numpy as np

app = Flask(__name__)
CORS(app)

# Configuration via environment variables
MODEL_SIZE = os.environ.get('WHISPER_MODEL', 'small')
COMPUTE_TYPE = os.environ.get('WHISPER_COMPUTE_TYPE', 'int8')  # int8 for CPU, float16 for GPU
NUM_WORKERS = int(os.environ.get('WHISPER_WORKERS', '2'))

print(f"Loading Faster-Whisper '{MODEL_SIZE}' model (compute_type={COMPUTE_TYPE})...")

# Load Faster-Whisper model
# - int8 quantization reduces RAM usage and increases speed on CPU
# - cpu_threads controls parallelism within a single transcription
model = WhisperModel(
    MODEL_SIZE,
    device="cpu",
    compute_type=COMPUTE_TYPE,
    cpu_threads=2,  # Leave room for multiple Gunicorn workers
    download_root=os.environ.get('WHISPER_MODEL_DIR', None)
)

print("Model loaded successfully!")

# Language code mapping (Faster-Whisper uses ISO codes)
LANGUAGE_MAP = {
    'en': 'en',
    'en-US': 'en',
    'en-GB': 'en',
    'nl': 'nl',
    'nl-NL': 'nl',
    'es': 'es',
    'es-ES': 'es',
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
    return jsonify({
        'status': 'ok',
        'model': f'faster-whisper-{MODEL_SIZE}',
        'compute_type': COMPUTE_TYPE,
        'device': 'cpu'
    })


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
    whisper_language = LANGUAGE_MAP.get(language, 'en')

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

        print(f"Transcribing audio (language={whisper_language})...")

        # Transcribe with Faster-Whisper
        # Pass audio as numpy array directly
        segments, info = model.transcribe(
            audio_array,
            language=whisper_language,
            beam_size=5,
            vad_filter=True,  # Filter out silence for faster processing
            vad_parameters=dict(min_silence_duration_ms=500)
        )

        # Combine all segments into single text
        text = " ".join([segment.text.strip() for segment in segments])
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
    print("Faster-Whisper Speech-to-Text Server")
    print("="*50)
    print(f"Model: {MODEL_SIZE} (compute_type={COMPUTE_TYPE})")
    print("Device: CPU")
    print("Supported languages: English, Dutch, Spanish")
    print("Server running at: http://localhost:3001")
    print("")
    print("For production, use Gunicorn:")
    print("  gunicorn -w 2 -b 0.0.0.0:3001 --timeout 120 whisper_server_faster:app")
    print("="*50 + "\n")

    app.run(host='0.0.0.0', port=3001, debug=False)
