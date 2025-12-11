@echo off
REM TSS PPM Development Environment Startup Script
REM This script starts all services using Docker Compose

echo ==========================================
echo  TSS PPM Development Environment
echo ==========================================
echo.

REM Check if Docker is running
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo Docker is running.
echo.

REM Check if .env file exists
if not exist "%~dp0..\.env" (
    echo Creating .env file from .env.example...
    copy "%~dp0..\.env.example" "%~dp0..\.env"
    echo.
    echo IMPORTANT: Please review and update .env file with your settings!
    echo.
)

REM Navigate to project root
cd /d "%~dp0.."

echo Starting services with Docker Compose...
echo This may take a few minutes on first run (building images, downloading models).
echo.

REM Start all services
docker compose up -d --build

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to start services!
    echo Run 'docker compose logs' to see what went wrong.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo  Services Starting...
echo ==========================================
echo.
echo Waiting for services to be healthy...

REM Wait for PostgreSQL
echo Waiting for PostgreSQL...
:wait_postgres
docker compose exec -T postgres pg_isready -U ppm -d tss_ppm >nul 2>&1
if %errorlevel% neq 0 (
    timeout /t 2 >nul
    goto wait_postgres
)
echo PostgreSQL is ready.

REM Wait for Keycloak
echo Waiting for Keycloak (this may take up to 2 minutes)...
:wait_keycloak
curl -s -o nul http://localhost:8080/auth/health/ready
if %errorlevel% neq 0 (
    timeout /t 5 >nul
    goto wait_keycloak
)
echo Keycloak is ready.

echo.
echo ==========================================
echo  Running Database Migrations
echo ==========================================
echo.

REM Run Prisma migrations
docker compose exec -T api npx prisma migrate deploy

echo.
echo ==========================================
echo  Seeding Database
echo ==========================================
echo.

REM Run seed script
docker compose exec -T api npm run db:seed

echo.
echo ==========================================
echo  Development Environment Ready!
echo ==========================================
echo.
echo Access the application at:
echo   Frontend:    http://localhost
echo   Keycloak:    http://localhost:8080/auth
echo   API:         http://localhost/api/v1/health/live
echo   PostgreSQL:  localhost:5432
echo.
echo Test accounts (all passwords: test123):
echo   employee@tss.eu   - Employee role
echo   manager@tss.eu    - Manager role
echo   hr@tss.eu         - HR role
echo   admin@tss.eu      - OpCo Admin role
echo   superadmin@tss.eu - TSS Super Admin role
echo.
echo Keycloak Admin Console:
echo   URL:      http://localhost:8080/auth/admin
echo   Username: admin
echo   Password: (see .env file)
echo.
echo Commands:
echo   docker compose logs -f          - View logs
echo   docker compose down             - Stop services
echo   docker compose up -d --build    - Rebuild and restart
echo.
pause
