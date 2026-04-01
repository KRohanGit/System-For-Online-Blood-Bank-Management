@echo off
REM ============================================================================
REM LifeLink Multi-Service Startup Script (Windows)
REM Starts ML Service (Python) and Backend (Node.js) together
REM ============================================================================

echo.
echo ╔════════════════════════════════════════════════════════════════════════╗
echo ║                  LifeLink System - Master Startup                      ║
echo ║                                                                        ║
echo ║  This will start all services:                                        ║
echo ║    - ML Service (Python FastAPI) on port 8000                         ║
echo ║    - Backend API (Node.js Express) on port 5000                       ║
echo ║    - MongoDB (if using Docker Compose)                                ║
echo ║                                                                        ║
echo ║  Close this window to stop all services.                              ║
echo ╚════════════════════════════════════════════════════════════════════════╝
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Error: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

REM Check if Python is installed
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Error: Python is not installed or not in PATH
    pause
    exit /b 1
)

echo ✅ Node.js and Python found
echo.

REM Change to project directory
cd /d "%~dp0"

REM Check for .env file
if not exist ".env" (
    echo ⚠️  Warning: .env file not found in project root
    echo    Creating a sample one...
    echo MONGO_URI=mongodb://lifelink:lifelink_secure@localhost:27017/lifelink?authSource=admin > .env
    echo ML_SERVICE_URL=http://127.0.0.1:8000 >> .env
    echo FRONTEND_URL=http://localhost:3000 >> .env
)

echo 🚀 Starting ML Service (Python)...
echo.

REM Start ML Service in a new window
start "LifeLink ML Service" cmd /k "cd ml-service && python main.py"

REM Wait for ML service to start (5 seconds)
timeout /t 5 /nobreak

echo 🚀 Starting Backend API (Node.js)...
echo.

REM Start Backend in a new window
start "LifeLink Backend API" cmd /k "cd Backend && node server.js"

echo.
echo.
echo ✅ All services started!
echo.
echo   ML Service URL:  http://localhost:8000
echo   Backend URL:     http://localhost:5000
echo   Frontend starts on: http://localhost:3000
echo.
echo 📝 Logs are saved to ./logs/ directory
echo.
echo Press Ctrl+C in each window to stop individual services.
echo.

timeout /t 3600
