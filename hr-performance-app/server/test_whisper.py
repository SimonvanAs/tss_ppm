#!/usr/bin/env python3
"""
Test script for Faster-Whisper server
Run the server first, then execute this script to verify transcription works.

Usage:
    python test_whisper.py [server_url]

Example:
    python test_whisper.py http://localhost:3001
"""

import sys
import requests
import tempfile
import wave
import struct
import math

SERVER_URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3001"


def generate_test_audio(filename, duration=2, frequency=440):
    """Generate a simple test WAV file with a tone."""
    sample_rate = 16000
    num_samples = int(sample_rate * duration)

    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)

        for i in range(num_samples):
            # Generate a simple sine wave (will result in silence/noise transcription)
            value = int(32767 * 0.3 * math.sin(2 * math.pi * frequency * i / sample_rate))
            wav_file.writeframes(struct.pack('<h', value))


def test_health():
    """Test the health endpoint."""
    print(f"\n1. Testing health endpoint: {SERVER_URL}/health")
    try:
        response = requests.get(f"{SERVER_URL}/health", timeout=10)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
        return response.status_code == 200
    except requests.exceptions.ConnectionError:
        print(f"   ERROR: Could not connect to server at {SERVER_URL}")
        print(f"   Make sure the server is running!")
        return False
    except Exception as e:
        print(f"   ERROR: {e}")
        return False


def test_transcribe():
    """Test the transcribe endpoint with a generated audio file."""
    print(f"\n2. Testing transcribe endpoint: {SERVER_URL}/transcribe")

    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        temp_path = f.name

    try:
        # Generate test audio
        print("   Generating test audio file...")
        generate_test_audio(temp_path)

        # Send to server
        print("   Sending to server...")
        with open(temp_path, 'rb') as audio_file:
            files = {'audio': ('test.wav', audio_file, 'audio/wav')}
            data = {'language': 'en'}
            response = requests.post(
                f"{SERVER_URL}/transcribe",
                files=files,
                data=data,
                timeout=60
            )

        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")

        # A sine wave tone won't produce meaningful text, but server should respond
        return response.status_code == 200

    except Exception as e:
        print(f"   ERROR: {e}")
        return False
    finally:
        import os
        if os.path.exists(temp_path):
            os.unlink(temp_path)


def test_transcribe_languages():
    """Test transcription with different languages."""
    print(f"\n3. Testing language support")

    languages = ['en', 'nl', 'es']

    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        temp_path = f.name

    try:
        generate_test_audio(temp_path, duration=1)

        for lang in languages:
            print(f"   Testing language: {lang}...", end=" ")
            with open(temp_path, 'rb') as audio_file:
                files = {'audio': ('test.wav', audio_file, 'audio/wav')}
                data = {'language': lang}
                response = requests.post(
                    f"{SERVER_URL}/transcribe",
                    files=files,
                    data=data,
                    timeout=60
                )

            if response.status_code == 200:
                print("OK")
            else:
                print(f"FAILED ({response.status_code})")
                return False

        return True

    except Exception as e:
        print(f"   ERROR: {e}")
        return False
    finally:
        import os
        if os.path.exists(temp_path):
            os.unlink(temp_path)


def main():
    print("=" * 50)
    print("Faster-Whisper Server Test")
    print("=" * 50)
    print(f"Server URL: {SERVER_URL}")

    results = []

    # Run tests
    results.append(("Health check", test_health()))

    if results[0][1]:  # Only continue if health check passed
        results.append(("Transcription", test_transcribe()))
        results.append(("Language support", test_transcribe_languages()))

    # Summary
    print("\n" + "=" * 50)
    print("Test Results:")
    print("=" * 50)

    all_passed = True
    for name, passed in results:
        status = "PASS" if passed else "FAIL"
        print(f"   {name}: {status}")
        if not passed:
            all_passed = False

    print("=" * 50)

    if all_passed:
        print("\nAll tests passed! Server is working correctly.")
        return 0
    else:
        print("\nSome tests failed. Check the output above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
