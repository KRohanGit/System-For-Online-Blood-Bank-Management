# Quick Deployment Reference

## URLs You'll Need

### Development (Local)
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

### Production
- Frontend: https://your-app.vercel.app (get after Vercel deployment)
- Backend: https://your-app.railway.app (get after Railway deployment)
- Database: mongodb+srv://... (get from MongoDB Atlas)

---

## Railway Environment Variables

```
NODE_ENV=production
PORT=${{RAILWAY_PUBLIC_PORT}}
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/lifelink
JWT_SECRET=[generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"]
FRONTEND_URL=https://your-app.vercel.app
```

---

## Vercel Environment Variables

```
REACT_APP_API_URL=https://your-app.railway.app
```

---

## Deployment Order

1. **MongoDB Atlas** → Get connection string
2. **Railway** (Backend) → Deploy with MongoDB URI → Get Railway URL
3. **Vercel** (Frontend) → Deploy with Railway URL
4. **Railway** → Update FRONTEND_URL with Vercel URL

---

## Testing Checklist

### Backend Test
Visit: `https://your-backend.railway.app/health`
Expected: `{"success":true,"message":"Server is running"}`

### Frontend Test
1. Visit your Vercel URL
2. Open browser console (F12)
3. Try login/register
4. Check for errors

### Integration Test
1. Register a new user
2. Login with credentials
3. Navigate through app features
4. Verify API calls succeed

---

## Common Fixes

### CORS Error
**Problem**: "Access blocked by CORS policy"
**Fix**: Update Railway `FRONTEND_URL` to match Vercel URL exactly (no trailing slash)

### 404 API Not Found
**Problem**: "Cannot GET /api/..."
**Fix**: 
- Check Railway Root Directory is set to "Backend"
- Verify Vercel `REACT_APP_API_URL` has correct Railway URL

### Database Connection Failed
**Problem**: "MongoServerError: Authentication failed"
**Fix**:
- Check MongoDB Atlas IP whitelist (0.0.0.0/0)
- Verify connection string username/password
- URL encode special characters in password

### Build Failed
**Problem**: Deployment fails on Vercel/Railway
**Fix**:
- Check build logs for specific error
- Verify all dependencies in package.json
- Test build locally first

---

## Git Push Workflow

```bash
git add .
git commit -m "Your change description"
git push origin main
```

Both Vercel and Railway will automatically detect and deploy!

---

## Monitoring

**View Logs:**
- Railway: Dashboard → Service → Deployments → View Logs
- Vercel: Dashboard → Project → Deployments → View Function Logs

**Check Status:**
- Railway: Dashboard shows service status
- Vercel: Dashboard shows deployment status

---

## Quick Commands

### Generate JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Local Backend (Development)
```bash
cd Backend
npm install
npm run dev
```

### Local Frontend (Development)
```bash
cd frontend
npm install
npm start
```

### Build Frontend Locally
```bash
cd frontend
npm run build
```

---

## Environment File Templates

### Backend/.env
```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/lifelink
JWT_SECRET=local_development_secret_key
FRONTEND_URL=http://localhost:3000
```

### frontend/.env
```
REACT_APP_API_URL=http://localhost:5000
```

---

## Update Process

1. Make code changes locally
2. Test locally (npm run dev)
3. Commit and push to GitHub
4. Check Vercel/Railway dashboards
5. Test production deployment
6. Monitor for errors

---

**Need help? Check DEPLOYMENT_GUIDE.md for detailed instructions!**
