# LifeLink Quick Start (5 Minutes)

Just copy-paste. That's it.

## Step 1) Install 3 things

Open CMD as Administrator:

```cmd
winget install --id Git.Git -e
winget install --id OpenJS.NodeJS.LTS -e
winget install --id MongoDB.Server -e
```

Restart laptop.

## Step 2) Clone & Setup

```cmd
cd %USERPROFILE%\Documents
git clone <YOUR_GITHUB_REPO_LINK>
cd CapStoneProject
copy Backend\.env.example Backend\.env
copy frontend\.env.example frontend\.env
```

Replace `<YOUR_GITHUB_REPO_LINK>` with your repo URL.

## Step 3) Edit 2 Files

Open `Backend\.env` in Notepad and change:

```
MONGODB_URI=mongodb://localhost:27017/lifelink
JWT_SECRET=anyLongRandomSecretString123456789
```

Open `frontend\.env` and verify:

```
REACT_APP_API_URL=http://localhost:5000/api
```

## Step 4) Install Dependencies

CMD Window 1:

```cmd
cd %USERPROFILE%\Documents\CapStoneProject\Backend
npm install
```

CMD Window 2:

```cmd
cd %USERPROFILE%\Documents\CapStoneProject\frontend
npm install
```

## Step 5) Start Services

CMD Window 1 (Backend):

```cmd
net start MongoDB
cd %USERPROFILE%\Documents\CapStoneProject\Backend
npm run dev
```

CMD Window 2 (Frontend):

```cmd
cd %USERPROFILE%\Documents\CapStoneProject\frontend
npm start
```

## Done

Open browser and go to: http://localhost:3000

## Everyday Start

Window 1:

```cmd
net start MongoDB
cd %USERPROFILE%\Documents\CapStoneProject\Backend
npm run dev
```

Window 2:

```cmd
cd %USERPROFILE%\Documents\CapStoneProject\frontend
npm start
```

## If something breaks

**"port already in use"**

```cmd
netstat -ano | findstr :5000
taskkill /PID <number> /F
```

**"npm install fails"**

```cmd
npm cache clean --force
npm install
```

**"mongo not found"**

```cmd
net start MongoDB
```

That's all.
