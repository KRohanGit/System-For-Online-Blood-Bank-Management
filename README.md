# LifeLink Blood Donation Platform

LifeLink is a full-stack blood donation management system for donors, hospitals, doctors, and super admins. It covers user authentication, donor management, blood inventory, blood camps, emergency coordination, geolocation features, realtime notifications, and AI-assisted clinical workflows.

## Project Walkthrough

The repository is organized into three main services:

```text
CapStoneProject/
├── frontend/       React app deployed on Vercel
├── Backend/        Node.js/Express API deployed on Render
├── ml-service/     Python ML service used for predictions and intelligence
└── monitoring/     Prometheus and Grafana configs
```

### Frontend

The frontend is a React application that handles landing pages, role-based sign-in/sign-up flows, dashboards, maps, charts, and realtime UI updates. API calls live under `frontend/src/services/`.

### Backend

The backend is an Express API with MongoDB, JWT auth, role-based routes, file uploads, realtime services, and health checks. Main entry point: [Backend/server.js](Backend/server.js).

### ML Service

The ML service is a Python app used for prediction and intelligence workflows. It is started separately from the backend when running locally.

## Installation Guide

### Prerequisites

- Node.js 18 or newer
- npm
- MongoDB Atlas or a local MongoDB instance
- Python 3.10+ for the ML service

### 1) Clone and open the project

```bash
git clone <your-repo-url>
cd CapStoneProject
```

### 2) Install backend dependencies

```bash
cd Backend
npm install
```

Create `Backend/.env` from `Backend/.env.example` and set at least:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/lifelink
JWT_SECRET=your_long_random_secret
FRONTEND_URL=http://localhost:3000
CLIENT_URL=http://localhost:3000
ML_SERVICE_URL=http://localhost:8000
```

Start the backend:

```bash
npm run dev
```

### 3) Install frontend dependencies

```bash
cd ..
cd frontend
npm install
```

Create `frontend/.env` and set:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm start
```

### 4) Install and run the ML service

```bash
cd ..
cd ml-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### 5) Start everything together

From the project root you can use the helper scripts:

```bash
start-services.bat
```

or on macOS/Linux:

```bash
bash start-services.sh
```

## How the App Works

### User Roles

- Donors sign in with hospital-provided credentials.
- Hospitals register, manage donors, blood inventory, and coordination.
- Doctors review clinical and donation-related workflows.
- Super admins manage platform-wide operations.

### Core Flows

1. A hospital or doctor signs up and waits for verification.
2. A verified hospital can create or manage donor accounts.
3. Users sign in and land on the correct dashboard.
4. The frontend calls the backend through `/api` routes.
5. Realtime and AI-driven features are handled through the backend and ML service.

### Important API Pattern

The backend routes are mounted under `/api`. For example:

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/blood-inventory`

This matters for deployment because the frontend must point to the backend base URL with `/api` included.

## Deployment

### Current recommended setup

- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas

### Environment variables for production

Frontend on Vercel:

```env
REACT_APP_API_URL=https://lifelink-backend-ttoi.onrender.com/api
```

Backend on Render:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_long_random_secret
FRONTEND_URL=https://your-vercel-app.vercel.app
CLIENT_URL=https://your-vercel-app.vercel.app
ML_SERVICE_URL=https://your-ml-service-url
```

## Can You Close Vercel or Render?

If you mean closing the browser tabs or leaving the dashboard, yes, that is fine. The deployments stay live on their own.

If you mean deleting, pausing, or shutting down the Vercel or Render services, no, do not do that. The app will only keep working while those deployments remain active. If they are connected to GitHub, future pushes will keep auto-deploying.

So the practical answer is:

- You can close the dashboard.
- You should not disable the services.
- You should keep the production environment variables in place.

## Scripts

### Backend

```bash
npm start
npm run dev
npm run smoke:clinical
npm run simulate:delivery
```

### Frontend

```bash
npm start
npm run build
npm test
```

## Notes

- The backend CORS config is already set up for production origins.
- The frontend must use the `/api` suffix in production.
- If you redeploy after changing environment variables, verify the live site once to make sure the new bundle is active.

2. Vercel automatically:
   - Detects push to main branch
   - Builds React application
   - Deploys to production
   - Updates live site

3. Railway automatically:
   - Detects push to main branch
   - Builds Node.js application
   - Runs tests (if configured)
   - Deploys to production
   - Restarts service

No manual intervention required!

## Testing

### Test Backend Health
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-02-19T..."
}
```

### Test Frontend
1. Open http://localhost:3000
2. Check browser console for errors
3. Test user registration/login
4. Verify API calls succeed

## Troubleshooting

### Common Issues

**CORS Error**
- Check FRONTEND_URL in backend .env
- Verify URL matches exactly (no trailing slash)

**API Connection Failed**
- Verify REACT_APP_API_URL in frontend .env
- Check backend is running
- Verify network connectivity

**Database Connection Error**
- Check MongoDB is running
- Verify connection string format
- Check database user permissions

**Build Failures**
- Clear node_modules and reinstall
- Check for missing dependencies
- Verify Node.js version compatibility

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) Part 10 for detailed troubleshooting.

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m "Add feature"`
4. Push to branch: `git push origin feature-name`
5. Submit pull request

## License

ISC License

## Author

K. Rohan

## Support

For deployment issues, refer to:
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Complete deployment guide
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Quick reference guide
- [EXAMPLE_API_USAGE.js](./EXAMPLE_API_USAGE.js) - API usage examples

---

**Made with ❤️ for saving lives through blood donation**
