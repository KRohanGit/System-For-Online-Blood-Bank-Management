#!/bin/bash

# ============================================================================
# LifeLink Multi-Service Startup Script (Unix/Linux/macOS)
# Starts ML Service (Python) and Backend (Node.js) together
# ============================================================================

echo ""
echo "╔════════════════════════════════════════════════════════════════════════╗"
echo "║                  LifeLink System - Master Startup                      ║"
echo "║                                                                        ║"
echo "║  This will start all services:                                        ║"
echo "║    - ML Service (Python FastAPI) on port 8000                         ║"
echo "║    - Backend API (Node.js Express) on port 5000                       ║"
echo "║    - MongoDB (if using Docker Compose)                                ║"
echo "║                                                                        ║"
echo "║  Press Ctrl+C to stop all services.                                   ║"
echo "╚════════════════════════════════════════════════════════════════════════╝"
echo ""

# Trap Ctrl+C and cleanup
cleanup() {
    echo ""
    echo "🛑 Shutting down all services..."
    kill $ML_PID 2>/dev/null
    kill $BACKEND_PID 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python3 is not installed"
    exit 1
fi

echo "✅ Node.js and Python3 found"
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check for .env file
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found in project root"
    echo "   Creating a sample one..."
    cat > .env << EOF
MONGO_URI=mongodb://lifelink:lifelink_secure@localhost:27017/lifelink?authSource=admin
ML_SERVICE_URL=http://127.0.0.1:8000
FRONTEND_URL=http://localhost:3000
EOF
fi

# Create logs directory
mkdir -p logs

echo "🚀 Starting ML Service (Python)..."
echo ""

# Start ML Service
cd "$SCRIPT_DIR/ml-service"
python3 main.py > "$SCRIPT_DIR/logs/ml-service.log" 2>&1 &
ML_PID=$!
echo "   ML Service PID: $ML_PID"
echo ""

# Wait for ML service to start
sleep 5

echo "🚀 Starting Backend API (Node.js)..."
echo ""

# Start Backend
cd "$SCRIPT_DIR/Backend"
node server.js > "$SCRIPT_DIR/logs/backend.log" 2>&1 &
BACKEND_PID=$!
echo "   Backend API PID: $BACKEND_PID"
echo ""

echo "✅ All services started!"
echo ""
echo "   ML Service URL:  http://localhost:8000"
echo "   Backend URL:     http://localhost:5000"
echo "   Frontend starts on: http://localhost:3000"
echo ""
echo "📝 Logs are saved to ./logs/ directory"
echo "   - ML Service: ./logs/ml-service.log"
echo "   - Backend:    ./logs/backend.log"
echo ""
echo "Press Ctrl+C to stop all services."
echo ""

# Wait for both processes
wait
