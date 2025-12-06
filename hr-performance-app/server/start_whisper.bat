@echo off
echo ==========================================
echo Starting Local Whisper Server
echo ==========================================
echo.

REM Check if venv exists
if not exist "venv" (
    echo Virtual environment not found!
    echo Please run setup_whisper.bat first.
    pause
    exit /b 1
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo Starting Whisper server on http://localhost:3001
echo (First run will download the model - ~500MB)
echo.
echo Press Ctrl+C to stop the server
echo.

python whisper_server.py
