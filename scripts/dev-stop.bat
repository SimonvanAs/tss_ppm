@echo off
REM TSS PPM Development Environment Stop Script

echo ==========================================
echo  Stopping TSS PPM Services
echo ==========================================
echo.

cd /d "%~dp0.."

docker compose down

echo.
echo Services stopped.
echo.
pause
