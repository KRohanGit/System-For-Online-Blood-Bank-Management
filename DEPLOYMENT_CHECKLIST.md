# LifeLink Deployment Checklist

Follow this checklist to deploy your application successfully.

## Pre-Deployment Checklist

### Code Preparation
- [x] All hardcoded localhost URLs replaced with environment variables
- [x] Frontend uses `process.env.REACT_APP_API_URL`
- [x] Backend uses `process.env.PORT` and `process.env.FRONTEND_URL`
- [x] CORS configured in backend server.js
- [x] .env.example files created for both frontend and backend
- [x] .gitignore includes .env files

### Local Testing
- [ ] Backend runs successfully: `cd Backend && npm run dev`
- [ ] Frontend runs successfully: `cd frontend && npm start`  
- [ ] Login/Register functionality works
- [ ] API calls succeed without errors
- [ ] Browser console shows no errors

### Git Repository
- [ ] All changes committed to GitHub
- [ ] Repository is accessible (public or authorized access)
- [ ] Latest code pushed to main branch

---

## MongoDB Atlas Setup

- [ ] Account created at mongodb.com/cloud/atlas
- [ ] Free M0 cluster created
- [ ] Database user created with password
- [ ] Network access configured (0.0.0.0/0)
- [ ] Connection string copied
- [ ] Password in connection string URL-encoded if contains special chars
- [ ] Database name set to "lifelink" in connection string

**Connection String Format:**
```
mongodb+srv://username:password@cluster.mongodb.net/lifelink?retryWrites=true&w=majority
```

---

## Railway Deployment (Backend)

### Account Setup
- [ ] Account created at railway.app
- [ ] GitHub account connected
- [ ] Repository access authorized

### Project Configuration
- [ ] New project created
- [ ] GitHub repository connected
- [ ] Root Directory set to: `Backend`

### Environment Variables
- [ ] `NODE_ENV` = `production`
- [ ] `PORT` = `${{RAILWAY_PUBLIC_PORT}}`
- [ ] `MONGODB_URI` = Your Atlas connection string
- [ ] `JWT_SECRET` = Generated strong secret (64 chars)
- [ ] `FRONTEND_URL` = Temporary placeholder (will update after Vercel)

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Deployment Verification
- [ ] First deployment completed successfully
- [ ] Railway URL copied (e.g., https://your-app.railway.app)
- [ ] Health endpoint works: `https://your-app.railway.app/health`
- [ ] Response shows: `{"success":true,"message":"Server is running"}`
- [ ] Logs show no errors

---

## Vercel Deployment (Frontend)

### Account Setup
- [ ] Account created at vercel.com
- [ ] GitHub account connected
- [ ] Repository imported

### Project Configuration
- [ ] Framework preset: Create React App
- [ ] Root Directory set to: `frontend`
- [ ] Build command: `npm run build`
- [ ] Output directory: `build`
- [ ] Install command: `npm install`

### Environment Variables
- [ ] `REACT_APP_API_URL` = Your Railway URL (without trailing slash)

**Example:**
```
REACT_APP_API_URL=https://your-app.railway.app
```

### Deployment Verification
- [ ] Deployment completed successfully
- [ ] Vercel URL copied (e.g., https://lifelink.vercel.app)
- [ ] Site loads without errors
- [ ] Browser console shows no CORS errors

---

## Final Configuration

### Update Railway CORS
- [ ] Go to Railway dashboard
- [ ] Open your backend service
- [ ] Go to Variables tab
- [ ] Update `FRONTEND_URL` to your Vercel URL
- [ ] Wait for automatic redeployment
- [ ] New deployment completes successfully

**Frontend URL Format (no trailing slash):**
```
FRONTEND_URL=https://your-app.vercel.app
```

---

## Integration Testing

### Authentication Flow
- [ ] Visit Vercel URL
- [ ] Open browser DevTools (F12)
- [ ] Try registering new account
- [ ] Registration succeeds without CORS errors
- [ ] Try logging in
- [ ] Login succeeds and redirects properly
- [ ] Token saved in localStorage

### API Integration
- [ ] Dashboard loads data
- [ ] API calls shown in Network tab
- [ ] Response status codes are 200
- [ ] No 404 or 500 errors
- [ ] No CORS policy errors

### Feature Testing
- [ ] Navigate between pages
- [ ] Test main features
- [ ] Submit forms
- [ ] Upload files (if applicable)
- [ ] Check data persists in database

---

## CI/CD Verification

### Auto-Deployment Test
1. [ ] Make a small change to frontend (e.g., change text)
2. [ ] Commit and push to GitHub
3. [ ] Check Vercel dashboard shows new deployment
4. [ ] Visit site and verify change appears
5. [ ] Make a small change to backend (e.g., console.log)
6. [ ] Commit and push to GitHub
7. [ ] Check Railway dashboard shows new deployment
8. [ ] Verify backend reflects change

---

## Monitoring Setup

### Vercel Monitoring
- [ ] Access Vercel dashboard
- [ ] Check deployment status
- [ ] Review build logs
- [ ] Enable analytics (optional)

### Railway Monitoring
- [ ] Access Railway dashboard
- [ ] Check service status (green indicator)
- [ ] Review deployment logs
- [ ] Check metrics tab for resource usage

### MongoDB Atlas Monitoring
- [ ] Access Atlas dashboard
- [ ] Check cluster status
- [ ] Review connection metrics
- [ ] Set up alerts (optional)

---

## Security Checklist

- [ ] JWT_SECRET is strong and unique (64+ characters)
- [ ] .env files are in .gitignore
- [ ] No sensitive data committed to repository
- [ ] MongoDB Atlas IP whitelist configured
- [ ] CORS only allows your frontend domain
- [ ] HTTPS enabled on both platforms (automatic)
- [ ] Database user has minimal required permissions

---

## Performance Optimization

- [ ] Frontend build size is reasonable
- [ ] Images optimized and compressed
- [ ] No console.logs in production frontend
- [ ] Database indexes created (if needed)
- [ ] API response times acceptable

---

## Documentation

- [ ] README.md created/updated
- [ ] DEPLOYMENT_GUIDE.md available
- [ ] QUICK_REFERENCE.md available
- [ ] Environment variables documented
- [ ] API endpoints documented (if needed)

---

## Backup & Recovery

- [ ] MongoDB Atlas automatic backups enabled
- [ ] Understand rollback process on Railway
- [ ] Understand rollback process on Vercel
- [ ] Know how to access previous deployments

---

## Common Issues Resolved

### If CORS Error Occurs:
- [ ] Verified FRONTEND_URL in Railway matches Vercel URL exactly
- [ ] No trailing slash in FRONTEND_URL
- [ ] Railway service redeployed after URL change
- [ ] Browser cache cleared

### If API Not Found (404):
- [ ] Verified REACT_APP_API_URL in Vercel
- [ ] Checked Railway Root Directory is "Backend"
- [ ] Confirmed backend endpoints exist
- [ ] Reviewed Railway logs for errors

### If Database Connection Fails:
- [ ] Verified MongoDB connection string
- [ ] Checked IP whitelist includes 0.0.0.0/0
- [ ] Confirmed database user credentials
- [ ] Tested connection with MongoDB Compass

---

## Post-Deployment

### Share Your App
- [ ] Vercel URL works: _____________________
- [ ] Railway URL works: _____________________
- [ ] Custom domain configured (optional)

### Monitor for 24 Hours
- [ ] Check Railway logs periodically
- [ ] Monitor Vercel deployment status
- [ ] Review MongoDB Atlas metrics
- [ ] Test from different devices/browsers

### Next Steps
- [ ] Set up custom domain (optional)
- [ ] Configure email notifications
- [ ] Add monitoring/alerting
- [ ] Plan for scaling (if needed)

---

## Emergency Contacts & Resources

**Documentation:**
- LifeLink Project: See README.md
- Deployment Guide: See DEPLOYMENT_GUIDE.md
- Quick Reference: See QUICK_REFERENCE.md

**Platform Support:**
- Vercel Docs: https://vercel.com/docs
- Railway Docs: https://docs.railway.app
- MongoDB Atlas: https://docs.atlas.mongodb.com

**Communities:**
- Vercel Discord: https://vercel.com/discord
- Railway Discord: https://discord.gg/railway

---

## Success Criteria

Your deployment is successful when:
- ✅ Backend health endpoint responds
- ✅ Frontend loads without errors
- ✅ Users can register and login
- ✅ API calls work end-to-end
- ✅ No CORS errors in console
- ✅ Auto-deployment works on git push
- ✅ Both services show "Active" status
- ✅ Data persists in MongoDB Atlas

---

**Congratulations! Your LifeLink application is now live! 🎉**

Every push to GitHub will automatically update your application.
