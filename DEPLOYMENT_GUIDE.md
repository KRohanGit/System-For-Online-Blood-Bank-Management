# LifeLink Deployment Guide

## Overview
This guide will help you deploy your LifeLink application with:
- **Frontend**: Hosted on Vercel
- **Backend**: Hosted on Railway
- **CI/CD**: Automatic deployment on GitHub push

## Prerequisites
- GitHub repository with your code
- Vercel account (free tier available)
- Railway account (free tier available)
- MongoDB Atlas account for production database

---

## Part 1: Setup MongoDB Atlas (Database)

### Step 1: Create MongoDB Atlas Cluster
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up or log in
3. Click "Build a Database"
4. Choose **FREE** tier (M0)
5. Select your preferred region
6. Name your cluster (e.g., "lifelink-cluster")
7. Click "Create"

### Step 2: Configure Database Access
1. In Atlas dashboard, go to **Database Access**
2. Click "Add New Database User"
3. Create username and strong password
4. Set privileges to "Read and write to any database"
5. Click "Add User"

### Step 3: Configure Network Access
1. Go to **Network Access**
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (0.0.0.0/0)
4. Click "Confirm"

### Step 4: Get Connection String
1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy the connection string
4. Replace `<password>` with your database user password
5. Replace `<dbname>` with "lifelink"

Example: `mongodb+srv://username:password@cluster.mongodb.net/lifelink?retryWrites=true&w=majority`

---

## Part 2: Deploy Backend to Railway

### Step 1: Create Railway Account
1. Go to [Railway.app](https://railway.app)
2. Sign up with GitHub account
3. Authorize Railway to access your repositories

### Step 2: Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your LifeLink repository
4. Railway will detect it's a Node.js project

### Step 3: Configure Root Directory
1. In Railway dashboard, click your service
2. Go to **Settings**
3. Scroll to "Root Directory"
4. Set to: `Backend`
5. Click "Save"

### Step 4: Add Environment Variables
1. In Railway dashboard, go to **Variables** tab
2. Add these variables:

```
NODE_ENV=production
PORT=${{RAILWAY_PUBLIC_PORT}}
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=generate_a_strong_secret_key_here
FRONTEND_URL=https://your-app.vercel.app
```

**Important**: 
- Replace `MONGODB_URI` with your Atlas connection string from Part 1
- Generate a strong JWT_SECRET: Run this in terminal:
  ```
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
- Keep `FRONTEND_URL` placeholder for now; we'll update it after Vercel deployment

### Step 5: Deploy Backend
1. Railway will automatically deploy your backend
2. Wait for deployment to complete
3. Click on your service to see the URL
4. Your backend URL will be something like: `https://your-app.railway.app`
5. Copy this URL - you'll need it for frontend

### Step 6: Test Backend
1. Visit: `https://your-backend-url.railway.app/health`
2. You should see: `{"success":true,"message":"Server is running"}`

---

## Part 3: Deploy Frontend to Vercel

### Step 1: Create Vercel Account
1. Go to [Vercel.com](https://vercel.com)
2. Sign up with GitHub account
3. Authorize Vercel to access your repositories

### Step 2: Import Project
1. Click "Add New..." → "Project"
2. Import your GitHub repository
3. Vercel will detect it's a React app

### Step 3: Configure Framework Settings
1. **Framework Preset**: Create React App (auto-detected)
2. **Root Directory**: Click "Edit" and set to `frontend`
3. **Build Command**: `npm run build` (default)
4. **Output Directory**: `build` (default)
5. **Install Command**: `npm install` (default)

### Step 4: Add Environment Variables
1. Before deploying, expand "Environment Variables"
2. Add this variable:

```
REACT_APP_API_URL=https://your-backend-url.railway.app
```

**Important**: Replace `your-backend-url.railway.app` with your actual Railway URL from Part 2, Step 5

### Step 5: Deploy Frontend
1. Click "Deploy"
2. Wait for deployment to complete (2-3 minutes)
3. Vercel will provide your live URL (e.g., `https://lifelink-abc123.vercel.app`)
4. Click "Visit" to see your app

### Step 6: Update Backend CORS
1. Go back to Railway dashboard
2. Open your backend service
3. Go to **Variables** tab
4. Update `FRONTEND_URL` to your Vercel URL
5. Your backend will automatically redeploy

---

## Part 4: Verify Deployment

### Test Complete Integration
1. Visit your Vercel frontend URL
2. Try to login or register
3. Check browser console for errors
4. Test API calls by using the application features

**Common Issues:**

**Issue 1: CORS Error**
- Check Railway's `FRONTEND_URL` matches your Vercel URL exactly
- Ensure no trailing slash in URLs

**Issue 2: API Not Found (404)**
- Verify Railway backend URL in Vercel environment variables
- Check Railway logs for errors

**Issue 3: Database Connection Error**
- Verify MongoDB Atlas connection string
- Check IP whitelist includes 0.0.0.0/0
- Ensure database user has correct permissions

---

## Part 5: Automatic CI/CD Setup

### Vercel Auto-Deploy
Vercel automatically deploys on every push to GitHub:
1. Push changes to GitHub: `git push origin main`
2. Vercel detects the push
3. Automatically rebuilds and deploys frontend
4. Check deployment status in Vercel dashboard

### Railway Auto-Deploy
Railway automatically deploys on every push to GitHub:
1. Push changes to GitHub: `git push origin main`
2. Railway detects the push
3. Automatically rebuilds and deploys backend
4. Check deployment status in Railway dashboard

### Deployment Notifications
**Vercel:**
- Get notified on GitHub commits
- See deployment status on Vercel dashboard
- Can integrate with Slack/Discord

**Railway:**
- Check deployment logs in Railway dashboard
- View build progress in real-time

---

## Part 6: Environment Variables Reference

### Frontend (.env)
```
REACT_APP_API_URL=https://your-backend.railway.app
```

### Backend (.env)
```
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/lifelink
JWT_SECRET=your_generated_secret_key_64_chars
FRONTEND_URL=https://your-app.vercel.app
```

---

## Part 7: Local Development Setup

### Backend
1. Navigate to Backend folder: `cd Backend`
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env`: `copy .env.example .env`
4. Update `.env` with your values
5. Start server: `npm run dev`
6. Backend runs on: `http://localhost:5000`

### Frontend
1. Navigate to frontend folder: `cd frontend`
2. Install dependencies: `npm install`
3. Create `.env` file with: `REACT_APP_API_URL=http://localhost:5000`
4. Start app: `npm start`
5. Frontend runs on: `http://localhost:3000`

---

## Part 8: Production Best Practices

### Security
1. **Never commit .env files** - Already in .gitignore
2. **Use strong JWT secrets** - Generate with crypto module
3. **Enable MongoDB encryption** - Use SSL/TLS connections
4. **Implement rate limiting** - Add express-rate-limit
5. **Use HTTPS only** - Both Railway and Vercel provide free SSL

### Performance
1. **Enable caching** - Use Redis for session storage
2. **Compress responses** - Add compression middleware
3. **Optimize images** - Compress before upload
4. **Monitor performance** - Use Railway/Vercel analytics

### Monitoring
1. **Railway Logs**: View real-time backend logs
2. **Vercel Analytics**: Track frontend performance
3. **MongoDB Atlas Monitoring**: Database performance
4. **Error Tracking**: Consider Sentry integration

---

## Part 9: Updating Your Application

### Frontend Updates
1. Make changes to frontend code
2. Commit and push to GitHub:
   ```
   git add .
   git commit -m "Update frontend feature"
   git push origin main
   ```
3. Vercel automatically detects and deploys
4. Check deployment at: vercel.com/dashboard

### Backend Updates
1. Make changes to backend code
2. Commit and push to GitHub:
   ```
   git add .
   git commit -m "Update backend API"
   git push origin main
   ```
3. Railway automatically detects and deploys
4. Check deployment at: railway.app/dashboard

### Database Migrations
1. Test migrations locally first
2. Backup production database
3. Run migration scripts carefully
4. Monitor for errors

---

## Part 10: Troubleshooting

### Deployment Fails

**Vercel Build Error:**
1. Check build logs in Vercel dashboard
2. Verify all dependencies are in package.json
3. Test build locally: `npm run build`
4. Check for environment variable issues

**Railway Deploy Error:**
1. Check Railway logs for errors
2. Verify Root Directory is set to "Backend"
3. Check package.json has correct start script
4. Verify MongoDB connection string

### Application Errors

**500 Internal Server Error:**
1. Check Railway logs for detailed error
2. Verify environment variables are set
3. Check database connectivity
4. Review recent code changes

**Network Request Failed:**
1. Verify CORS settings in backend
2. Check API URL in frontend env variables
3. Ensure Railway service is running
4. Check browser console for CORS errors

### Database Issues

**Connection Timeout:**
1. Verify MongoDB Atlas IP whitelist
2. Check connection string format
3. Ensure database user exists
4. Test connection with MongoDB Compass

**Authentication Failed:**
1. Verify database username/password
2. Check password special characters are URL encoded
3. Ensure user has correct permissions

---

## Part 11: Cost Optimization

### Free Tier Limits

**Vercel Free:**
- 100 GB bandwidth per month
- Unlimited deployments
- Automatic SSL
- Custom domains

**Railway Free:**
- $5 credit per month
- 500 hours of execution
- 1 GB RAM per service
- 1 GB storage

**MongoDB Atlas Free:**
- 512 MB storage
- Shared RAM
- Suitable for development/small apps

### Tips to Stay Free
1. Optimize bundle size
2. Use efficient database queries
3. Implement caching strategies
4. Monitor usage regularly

---

## Part 12: Custom Domain Setup (Optional)

### Add Custom Domain to Vercel
1. Go to Vercel dashboard → Project Settings → Domains
2. Enter your custom domain
3. Add DNS records provided by Vercel
4. Wait for DNS propagation (24-48 hours)

### Add Custom Domain to Railway
1. Go to Railway → Service → Settings → Domains
2. Click "Add Domain"
3. Enter your custom domain
4. Add CNAME record to your DNS provider
5. Update `FRONTEND_URL` in Railway if needed

---

## Summary Checklist

- [ ] MongoDB Atlas cluster created and configured
- [ ] Backend deployed to Railway with environment variables
- [ ] Frontend deployed to Vercel with API URL
- [ ] CORS configured with correct frontend URL
- [ ] Test complete user flow end-to-end
- [ ] Auto-deployment working on git push
- [ ] Both services running without errors
- [ ] Production environment variables secured
- [ ] Database backups configured
- [ ] Monitoring and logging enabled

---

## Support & Resources

**Documentation:**
- Vercel Docs: https://vercel.com/docs
- Railway Docs: https://docs.railway.app
- MongoDB Atlas: https://docs.atlas.mongodb.com

**Community:**
- Vercel Discord: https://vercel.com/discord
- Railway Discord: https://discord.gg/railway
- Stack Overflow: Search for specific errors

---

**Your LifeLink application is now production-ready and deployed!**

Every time you push to GitHub, both your frontend and backend will automatically update. No manual redeployment needed.
