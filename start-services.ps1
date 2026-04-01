# PowerShell script to start all LifeLink services
# Usage: powershell -File start-services.ps1

Write-Host "`n" -ForegroundColor White
Write-Host "╔════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                  LifeLink System - Master Startup                      ║" -ForegroundColor Cyan
Write-Host "║                                                                        ║" -ForegroundColor Cyan
Write-Host "║  Starting all services:                                               ║" -ForegroundColor Cyan
Write-Host "║    - ML Service (Python FastAPI) on port 8000                         ║" -ForegroundColor Cyan
Write-Host "║    - Backend API (Node.js Express) on port 5000                       ║" -ForegroundColor Cyan
Write-Host "║    - MongoDB (if using Docker Compose)                                ║" -ForegroundColor Cyan
Write-Host "║                                                                        ║" -ForegroundColor Cyan
Write-Host "║  Close this window or press Ctrl+C to stop all services.              ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host "`n" -ForegroundColor White

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "   Download from: https://nodejs.org/" -ForegroundColor Yellow
    pause
    exit 1
}

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Python is not installed or not in PATH" -ForegroundColor Red
    Write-Host "   Download from: https://python.org/" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "`n" -ForegroundColor White

# Change to project directory
$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectDir

# Check for .env file
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Warning: .env file not found in project root" -ForegroundColor Yellow
    Write-Host "   Creating a sample one..." -ForegroundColor Yellow
    @"
MONGO_URI=mongodb://lifelink:lifelink_secure@localhost:27017/lifelink?authSource=admin
ML_SERVICE_URL=http://127.0.0.1:8000
FRONTEND_URL=http://localhost:3000
"@ | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "   Sample .env created. Update it with your configuration." -ForegroundColor Cyan
}

# Create logs directory if it doesn't exist
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" -Force | Out-Null
    Write-Host "📁 Created logs directory" -ForegroundColor Green
}

Write-Host "🚀 Starting ML Service (Python)..." -ForegroundColor Cyan
Write-Host ""

# Start ML Service in a new window
$mlServiceParams = @{
    FilePath = "python"
    ArgumentList = "main.py"
    WorkingDirectory = "$projectDir\ml-service"
    NoNewWindow = $false
    PassThru = $true
}
$mlProcess = Start-Process @mlServiceParams

Write-Host "   ML Service started with PID: $($mlProcess.Id)" -ForegroundColor Green
Write-Host "   A new window should open. If not, check that Python is installed correctly." -ForegroundColor Yellow

# Wait for ML service to start (5 seconds)
Write-Host "   Waiting for ML Service to initialize..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

Write-Host "`n🚀 Starting Backend API (Node.js)..." -ForegroundColor Cyan
Write-Host ""

# Start Backend in a new window
$backendParams = @{
    FilePath = "node"
    ArgumentList = "server.js"
    WorkingDirectory = "$projectDir\Backend"
    NoNewWindow = $false
    PassThru = $true
}
$backendProcess = Start-Process @backendParams

Write-Host "   Backend started with PID: $($backendProcess.Id)" -ForegroundColor Green
Write-Host "   A new window should open. If not, check that Node.js is installed correctly." -ForegroundColor Yellow

Write-Host "`n" -ForegroundColor White
Write-Host "✅ All services started!" -ForegroundColor Green
Write-Host "`n" -ForegroundColor White
Write-Host "   📍 ML Service URL:  http://localhost:8000" -ForegroundColor Cyan
Write-Host "   📍 Backend URL:     http://localhost:5000" -ForegroundColor Cyan
Write-Host "   📍 Frontend starts on: http://localhost:3000" -ForegroundColor Cyan
Write-Host "`n" -ForegroundColor White
Write-Host "📝 Logs are saved to:" -ForegroundColor Yellow
Write-Host "   📄 ML Service: .\logs\ml-service.log" -ForegroundColor White
Write-Host "   📄 Backend:    .\logs\backend.log" -ForegroundColor White
Write-Host "`n" -ForegroundColor White

# Keep the script running and monitor processes
Write-Host "Press Ctrl+C to stop all services." -ForegroundColor Yellow
Write-Host "`n" -ForegroundColor White

$running = $true
$checkInterval = 10  # Check every 10 seconds

while ($running) {
    try {
        Start-Sleep -Seconds $checkInterval
        
        # Check if processes are still running
        $mlRunning = Get-Process -Id $mlProcess.Id -ErrorAction SilentlyContinue
        $backendRunning = Get-Process -Id $backendProcess.Id -ErrorAction SilentlyContinue
        
        if (-not $mlRunning -or -not $backendRunning) {
            Write-Host "⚠️  One or more services have stopped." -ForegroundColor Yellow
            if (-not $mlRunning) {
                Write-Host "   ML Service (PID: $($mlProcess.Id)) is no longer running" -ForegroundColor Red
            }
            if (-not $backendRunning) {
                Write-Host "   Backend (PID: $($backendProcess.Id)) is no longer running" -ForegroundColor Red
            }
        }
    } catch {
        # Silently catch errors (expected when process stops)
    }
}
