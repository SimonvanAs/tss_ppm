@echo off
echo ==========================================
echo Setting up Local Whisper Server
echo ==========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://www.python.org/downloads/
    pause
    exit /b 1
)

echo Python found!
echo.

REM Remove old venv if exists
if exist "venv" (
    echo Removing old virtual environment...
    rmdir /s /q venv
)

REM Create virtual environment
echo Creating virtual environment...
python -m venv venv

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo Installing dependencies (this may take several minutes)...
echo - Flask (web server)
echo - PyTorch (machine learning framework)
echo - Transformers (Hugging Face - includes Whisper)
echo.

pip install --upgrade pip
pip install flask==3.0.0 flask-cors==4.0.0
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
pip install transformers accelerate

echo.
echo ==========================================
echo Setup complete!
echo ==========================================
echo.
echo To start the server, run: start_whisper.bat
echo (First run will download the Whisper model ~500MB)
echo.
pause
