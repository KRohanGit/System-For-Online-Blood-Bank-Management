# LifeLink Frontend + Backend Setup (Windows CMD Only)

This guide is only for running frontend and backend on a faculty laptop.
No Docker, no ML service, no Python steps.

## 1) Install Required Software

You only need these 3 things:

1. Git
2. Node.js LTS (includes npm)
3. MongoDB Community Server

### Option A: Install using normal CMD commands (recommended)

Open CMD as Administrator and run:

```cmd
winget install --id Git.Git -e
winget install --id OpenJS.NodeJS.LTS -e
winget install --id MongoDB.Server -e
```

Restart the laptop after install.

### Option B: Manual install using browser

1. Git: https://git-scm.com/download/win
2. Node.js LTS: https://nodejs.org
3. MongoDB Community Server: https://www.mongodb.com/try/download/community

While installing MongoDB, keep these checked:

1. Install MongoDB as a Service
2. Install MongoDB Compass (optional but useful)

## 2) Verify Installations

Open new CMD window and run:

```cmd
git --version
node --version
npm --version
mongod --version
```

If any command fails, reinstall that software and reopen CMD.

## 3) Start MongoDB Service

```cmd
net start MongoDB
```

If you see service name not found, open Services app and check actual name (sometimes MongoDB Server).

## 4) Clone Project

```cmd
cd %USERPROFILE%\Documents
git clone <YOUR_GITHUB_REPO_LINK>
cd CapStoneProject
```

Replace <YOUR_GITHUB_REPO_LINK> with your real GitHub repo URL.

## 5) Create Environment Files

From CapStoneProject root:

```cmd
copy Backend\.env.example Backend\.env
copy frontend\.env.example frontend\.env
```

## 6) Configure Backend Environment

Open file Backend\.env and set these values:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/lifelink
JWT_SECRET=replace_with_a_long_random_secret
CLIENT_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
ML_SERVICE_URL=http://localhost:8000
```

Important:

1. Keep MONGODB_URI exactly as above for local MongoDB.
2. JWT_SECRET must be changed to any long random text.

## 7) Configure Frontend Environment

Open file frontend\.env and keep:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

## 8) Install Backend Dependencies

```cmd
cd Backend
npm install
```

## 9) Install Frontend Dependencies

Open another CMD window:

```cmd
cd %USERPROFILE%\Documents\CapStoneProject\frontend
npm install
```

## 10) Run Backend

In backend CMD window:

```cmd
cd %USERPROFILE%\Documents\CapStoneProject\Backend
npm run dev
```

Backend should run on:

1. http://localhost:5000
2. Health check: http://localhost:5000/health

## 11) Run Frontend

In frontend CMD window:

```cmd
cd %USERPROFILE%\Documents\CapStoneProject\frontend
npm start
```

Frontend opens at:

1. http://localhost:3000

## 12) Quick Working Test

Run in any CMD:

```cmd
curl http://localhost:5000/health
```

If backend is healthy and frontend opens in browser, setup is done.

## 13) Daily Start Commands (after first-time setup)

Open CMD window 1:

```cmd
net start MongoDB
cd %USERPROFILE%\Documents\CapStoneProject\Backend
npm run dev
```

Open CMD window 2:

```cmd
cd %USERPROFILE%\Documents\CapStoneProject\frontend
npm start
```

## 14) Common Errors and Fixes

### A) node is not recognized

Reinstall Node.js LTS and reopen CMD.

### B) git is not recognized

Reinstall Git and ensure Add Git to PATH is enabled.

### C) Mongo connection error

1. Run: net start MongoDB
2. Confirm Backend\.env has MONGODB_URI=mongodb://localhost:27017/lifelink

### D) Port already in use

Check port:

```cmd
netstat -ano | findstr :3000
netstat -ano | findstr :5000
```

Kill PID:

```cmd
taskkill /PID <PID_NUMBER> /F
```

### E) npm install fails

```cmd
npm cache clean --force
```

Then run npm install again.

## 15) Update Project Later

```cmd
cd %USERPROFILE%\Documents\CapStoneProject
git pull
cd Backend
npm install
cd ..\frontend
npm install
```
