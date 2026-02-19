# Deployment Troubleshooting Guide

## Table of Contents
1. [CORS Errors](#cors-errors)
2. [API Connection Issues](#api-connection-issues)
3. [Database Connection Errors](#database-connection-errors)
4. [Build Failures](#build-failures)
5. [Authentication Issues](#authentication-issues)
6. [Environment Variable Problems](#environment-variable-problems)
7. [File Upload Issues](#file-upload-issues)
8. [Performance Issues](#performance-issues)

---

## CORS Errors

### Error Message
```
Access to fetch at 'https://your-app.railway.app/api/...' from origin 'https://your-app.vercel.app' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

### Causes
1. FRONTEND_URL in Railway doesn't match your Vercel URL
2. Trailing slash mismatch
3. HTTP vs HTTPS mismatch
4. Missing CORS configuration

### Solutions

**Solution 1: Check Railway Environment Variables**
1. Go to Railway dashboard
2. Click your service
3. Go to "Variables" tab
4. Verify `FRONTEND_URL` is EXACTLY: `https://your-app.vercel.app`
5. No trailing slash at the end
6. Save and redeploy

**Solution 2: Verify Backend CORS Configuration**
Check your Backend/server.js has:
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
```

**Solution 3: Clear Browser Cache**
1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"

**Solution 4: Check Both URLs**
- Vercel URL: `https://your-app.vercel.app` (no trailing slash)
- Railway URL: `https://your-app.railway.app` (no trailing slash)
- They must match exactly

---

## API Connection Issues

### Error Message
```
Failed to fetch
Network request failed
TypeError: Failed to fetch
```

### Causes
1. Wrong API URL in frontend
2. Backend service not running
3. Network connectivity issues
4. Firewall blocking requests

### Solutions

**Solution 1: Verify Frontend Environment Variable**
1. Go to Vercel dashboard
2. Project → Settings → Environment Variables
3. Check `REACT_APP_API_URL` = `https://your-app.railway.app`
4. Redeploy if you made changes

**Solution 2: Check Backend is Running**
1. Visit: `https://your-app.railway.app/health`
2. Should see: `{"success":true,"message":"Server is running"}`
3. If error, check Railway logs

**Solution 3: Check Railway Service Status**
1. Go to Railway dashboard
2. Check service has green "Active" indicator
3. If red, click to see error logs
4. Redeploy if needed

**Solution 4: Test Locally**
```bash
curl https://your-app.railway.app/health
```

---

## Database Connection Errors

### Error Message
```
MongoServerError: bad auth : Authentication failed
MongooseServerSelectionError: connection timed out
Error: connect ETIMEDOUT
```

### Causes
1. Wrong MongoDB connection string
2. IP not whitelisted
3. Incorrect username/password
4. Special characters in password not URL-encoded

### Solutions

**Solution 1: Verify Connection String**
Format should be:
```
mongodb+srv://username:password@cluster.mongodb.net/lifelink?retryWrites=true&w=majority
```

Check:
- `username` is correct
- `password` is correct (URL-encoded if has special chars)
- `cluster` address is correct
- Database name is `lifelink`

**Solution 2: URL Encode Password**
If password has special characters like `@`, `#`, `!`, encode them:
- `@` becomes `%40`
- `#` becomes `%23`
- `!` becomes `%21`

Or use this tool: https://www.urlencoder.org/

**Solution 3: Check IP Whitelist**
1. Go to MongoDB Atlas
2. Network Access
3. Verify `0.0.0.0/0` is in the list
4. If not, add it
5. Wait 2-3 minutes for changes to apply

**Solution 4: Verify Database User**
1. Go to MongoDB Atlas
2. Database Access
3. Check user exists
4. Verify password is correct
5. Check permissions: "Read and write to any database"

**Solution 5: Test Connection String**
Use MongoDB Compass to test:
1. Download MongoDB Compass
2. Paste connection string
3. Try to connect
4. If fails, fix connection string

---

## Build Failures

### Vercel Build Error

**Error Message**
```
Build failed
Error: Command "npm run build" exited with 1
```

**Solutions:**

1. **Check Build Logs**
   - Go to Vercel dashboard
   - Click failed deployment
   - Review error message

2. **Test Build Locally**
   ```bash
   cd frontend
   npm run build
   ```
   Fix any errors that appear

3. **Common Fixes:**
   - Missing dependencies: `npm install --save missing-package`
   - Environment variable issues: Add in Vercel settings
   - Syntax errors: Check recent code changes
   - Import errors: Verify file paths are correct

4. **Clear Build Cache**
   - Vercel dashboard → Settings → General
   - Scroll to "Build & Development Settings"
   - Enable "Automatically expose System Environment Variables"

### Railway Build Error

**Error Message**
```
Build failed
npm ERR! missing script: start
```

**Solutions:**

1. **Verify package.json Scripts**
   Backend/package.json should have:
   ```json
   "scripts": {
     "start": "node server.js",
     "dev": "nodemon server.js"
   }
   ```

2. **Check Root Directory**
   - Railway dashboard → Settings
   - Verify "Root Directory" = `Backend`

3. **Check Railway Logs**
   - Dashboard → Deployments
   - Click latest deployment
   - View build logs for errors

4. **Test Locally**
   ```bash
   cd Backend
   npm install
   npm start
   ```

---

## Authentication Issues

### Error: 401 Unauthorized

**Causes:**
1. Token expired
2. Token not sent
3. Invalid token
4. JWT_SECRET mismatch

**Solutions:**

1. **Clear Local Storage**
   ```javascript
   localStorage.clear();
   ```
   Then login again

2. **Check Token in Browser**
   - Open DevTools → Application → Local Storage
   - Look for "token" key
   - Should be a long string

3. **Verify JWT_SECRET**
   - Check Railway environment variables
   - Must be same secret used to sign tokens
   - Generate new if needed

4. **Check Token is Sent**
   - DevTools → Network tab
   - Click API request
   - Headers → Request Headers
   - Should see: `Authorization: Bearer <token>`

### Error: 403 Forbidden

**Causes:**
1. User doesn't have permission
2. Role check failing
3. Middleware blocking request

**Solutions:**

1. **Check User Role**
   ```javascript
   console.log(localStorage.getItem('role'));
   ```

2. **Verify Route Permissions**
   - Check backend route middleware
   - Ensure user role is allowed

3. **Check Backend Logs**
   - Railway → Logs
   - Look for authorization errors

---

## Environment Variable Problems

### Variables Not Working

**Symptoms:**
- App uses localhost instead of production URL
- Undefined values in code
- Features not working

**Solutions:**

**For Vercel (Frontend):**

1. **Check Variable Name**
   - Must start with `REACT_APP_`
   - Example: `REACT_APP_API_URL`

2. **Add Variable**
   - Vercel dashboard → Settings → Environment Variables
   - Add: `REACT_APP_API_URL` = `https://your-app.railway.app`
   - Check "Production", "Preview", "Development"
   - Click "Save"

3. **Redeploy**
   - Go to Deployments tab
   - Click "..." on latest deployment
   - Click "Redeploy"

4. **Verify in Code**
   ```javascript
   console.log('API URL:', process.env.REACT_APP_API_URL);
   ```

**For Railway (Backend):**

1. **Check Variable Exists**
   - Railway dashboard → Variables tab
   - Verify all required variables present

2. **Add Missing Variable**
   - Click "New Variable"
   - Add name and value
   - Service automatically redeploys

3. **Check Variable Format**
   ```
   PORT=${{RAILWAY_PUBLIC_PORT}}    ✅ Correct
   PORT=5000                         ❌ Wrong for Railway
   ```

4. **Verify in Code**
   Add temporary log in server.js:
   ```javascript
   console.log('Environment:', process.env.NODE_ENV);
   console.log('Mongo URI:', process.env.MONGODB_URI ? 'Set' : 'Missing');
   ```

---

## File Upload Issues

### Files Not Uploading

**Error Messages:**
```
File too large
Upload failed
413 Payload Too Large
```

**Solutions:**

1. **Check File Size Limit**
   Backend should have:
   ```javascript
   app.use(express.json({ limit: '10mb' }));
   app.use(express.urlencoded({ limit: '10mb', extended: true }));
   ```

2. **Check Multer Configuration**
   ```javascript
   const upload = multer({
     limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
     fileFilter: (req, file, cb) => {
       // Add file type validation
     }
   });
   ```

3. **Verify Upload Directory Exists**
   - Check Backend/uploads/ folder structure
   - Ensure write permissions

4. **Check Railway Storage**
   - Railway has ephemeral storage
   - Consider using cloud storage (AWS S3, Cloudinary)

---

## Performance Issues

### Slow API Responses

**Solutions:**

1. **Check Database Queries**
   - Add indexes to frequently queried fields
   - Use `explain()` to analyze queries
   - Limit result sets

2. **Check Railway Resources**
   - Go to Railway → Metrics
   - Check CPU and Memory usage
   - Upgrade plan if needed

3. **Add Caching**
   ```javascript
   // Basic in-memory cache
   const cache = new Map();
   ```

4. **Optimize Bundle Size**
   ```bash
   cd frontend
   npm run build
   npx webpack-bundle-analyzer build/static/js/*.js
   ```

### Slow Page Loads

**Solutions:**

1. **Check Network Tab**
   - DevTools → Network
   - Look for slow requests
   - Optimize or cache slow endpoints

2. **Lazy Load Components**
   ```javascript
   const Component = React.lazy(() => import('./Component'));
   ```

3. **Optimize Images**
   - Compress images before upload
   - Use appropriate formats (WebP)
   - Resize to needed dimensions

4. **Check Vercel Analytics**
   - Vercel dashboard → Analytics
   - Review performance metrics
   - Identify bottlenecks

---

## Quick Diagnostic Commands

### Check Backend Health
```bash
curl https://your-app.railway.app/health
```

### Check Frontend
```bash
curl https://your-app.vercel.app
```

### Test Database Connection (Local)
```bash
cd Backend
node -e "require('dotenv').config(); const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(() => console.log('✅ Connected')).catch(e => console.log('❌ Error:', e.message))"
```

### Check Environment Variables (Local)
```bash
cd Backend
node -e "require('dotenv').config(); console.log('PORT:', process.env.PORT, '\nMONGO:', process.env.MONGODB_URI ? '✅ Set' : '❌ Missing')"
```

---

## Getting Help

### Information to Gather

When seeking help, provide:
1. **Error Message**: Exact error text
2. **Platform**: Vercel, Railway, or local
3. **Browser Console**: Any error messages
4. **Network Tab**: Failed request details
5. **Logs**: Railway/Vercel deployment logs
6. **Steps**: What you did before error occurred

### Where to Get Help

1. **Check Documentation**
   - README.md
   - DEPLOYMENT_GUIDE.md
   - This troubleshooting guide

2. **Platform Support**
   - Vercel: https://vercel.com/support
   - Railway: https://help.railway.app
   - MongoDB Atlas: https://support.mongodb.com

3. **Community**
   - Vercel Discord: https://vercel.com/discord
   - Railway Discord: https://discord.gg/railway
   - Stack Overflow: Tag with vercel, railway, express

---

## Prevention Tips

1. **Always Test Locally First**
   - Test changes on localhost before deploying
   - Verify API calls work
   - Check for console errors

2. **Use Version Control**
   - Commit working code
   - Tag stable releases
   - Can rollback if needed

3. **Monitor Regularly**
   - Check Railway/Vercel dashboards daily
   - Review logs for warnings
   - Monitor resource usage

4. **Keep Backups**
   - MongoDB Atlas automatic backups
   - Can restore previous versions
   - Download important data periodically

5. **Document Changes**
   - Note what you changed
   - Document environment variable updates
   - Keep deployment notes

---

**Still having issues? Check the platform-specific logs for detailed error messages!**
