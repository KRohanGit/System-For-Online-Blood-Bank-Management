# ⚡ ML Service Quick Fix - Cheat Sheet

## 🎯 The Problem
❌ ML Service shows "unavailable" after server restart  
❌ Hospital dashboard ML features don't work  
❌ Have to manually start services separately  

## ✅ The Solution
Just double-click to start everything:

### Windows
```
Double-click: start-services.bat
```

### Mac/Linux
```
bash start-services.sh
```

## 📊 What Happens
- ✅ ML Service starts (Python) → Port 8000
- ✅ Backend API starts (Node.js) → Port 5000  
- ✅ Health monitoring every 30 seconds
- ✅ Auto-restart if anything crashes
- ✅ Hospital dashboard works perfectly

## 🔍 Verify It Works
```bash
curl http://localhost:8000/health   # Should show: "healthy"
curl http://localhost:5000/health   # Should show: "healthy"
```

## 📋 Files Changed

| File | Change |
|------|--------|
| `Backend/ecosystem.config.js` | Added ML service management |
| `Backend/server.js` | Added ML monitoring |
| `Backend/src/services/ml/mlService.js` | Added retry + monitoring |
| New: `start-all-services.js` | Master service manager |
| New: `start-services.bat` | Windows startup |
| New: `start-services.sh` | Unix startup |

## 🚀 Usage

1. **First Time:** Double-click `start-services.bat` (Windows) or run `bash start-services.sh` (Unix)
2. **Wait:** 5 seconds for services to fully start
3. **Refresh:** Browser if hospital dashboard is already open
4. **Use:** All ML features should work now

## ⚠️ If Still Having Issues

### Check if ML Service is running
```bash
curl http://localhost:8000/health
```

### Check if Backend is running
```bash
curl http://localhost:5000/health
```

### Check logs
```bash
tail -f logs/ml-service.log   # ML Service logs
tail -f logs/backend.log      # Backend logs
```

### Kill stuck processes
```bash
# Windows
taskkill /F /IM python.exe
taskkill /F /IM node.exe

# Mac/Linux
killall python
killall node
```

## 🔄 What Changed in the Code

### Before (Broken)
- ML Service had to be started manually
- Backend didn't know if ML Service was running
- No retry logic, just instant failure
- Hospital dashboard would crash

### After (Fixed)
- Both services start together automatically
- Backend monitors ML Service health every 30 seconds
- Failed calls automatically retry (1s, 2s, 4s delays)
- Services auto-restart if they crash
- Hospital dashboard works reliably

## 📝 Key Improvements

| Feature | Status |
|---------|--------|
| Auto-startup | ✅ Both services together |
| Auto-restart on crash | ✅ Yes (5 retries) |
| Health monitoring | ✅ Every 30 seconds |
| Retry logic | ✅ 3 attempts with backoff |
| Error handling | ✅ Clear messages |
| Logging | ✅ To `./logs/` directory |
| Service dependencies | ✅ Automatic management |

## 🎓 How It Works

```
You run: start-services.bat
    ↓
ML Service starts (port 8000)
    ↓
Backend API starts (port 5000)
    ↓
Backend checks if ML is ready
    ↓
Health monitoring begins
    ↓
Hospital clicks ML feature
    ↓
Backend calls ML Service
    ↓
✅ Works perfectly!
    ↓
(If ML crashes)
    ↓
Auto-restart within 3 seconds
    ↓
✅ Still works!
```

## 💡 Pro Tips

1. **Keep terminal windows open** - Shows real-time logs
2. **Check logs** - First thing if something doesn't work
3. **Port conflicts** - Kill old processes if ports are busy
4. **Restart everything** - Close all windows and run start script again
5. **Check internet** - Some features need MongoDB connection

## 🆘 Emergency Reset

If nothing works:
```bash
# Kill everything
taskkill /F /IM python.exe
taskkill /F /IM node.exe

# Wait 2 seconds

# Start fresh (Windows)
start-services.bat

# Or (Unix)
bash start-services.sh
```

---

**Quick Link:** [Full Startup Guide](./ML_SERVICE_STARTUP_GUIDE.md)
