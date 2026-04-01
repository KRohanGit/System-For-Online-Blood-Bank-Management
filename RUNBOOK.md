# LifeLink Operations Runbook

## Service Map
| Service | Port | Health Endpoint |
|---------|------|-----------------|
| Backend (Node.js) | 5000 | GET /health |
| ML Service (FastAPI) | 8000 | GET /health |
| Frontend (React) | 3000 | - |
| MongoDB | 27017 | - |
| Prometheus | 9090 | GET /-/healthy |
| Grafana | 3001 | GET /api/health |

---

## Local Development Setup

### Prerequisites
- Node.js 20+
- Python 3.11+
- MongoDB 6+ (local or Atlas)
- Docker & Docker Compose (optional)

### Backend
```bash
cd Backend
cp .env.example .env   # Edit with real values
npm install
node server.js
```

### ML Service
```bash
cd ml-service
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend
```bash
cd frontend
npm install
npm start
```

---

## Docker Deployment

### Full Stack
```bash
docker-compose up --build -d
```

### Individual Services
```bash
docker-compose up backend -d
docker-compose up ml-service -d
docker-compose up frontend -d
```

### Rebuild Single Service
```bash
docker-compose up --build --no-deps backend -d
```

### View Logs
```bash
docker-compose logs -f backend
docker-compose logs -f ml-service
docker-compose logs --tail=100 backend
```

### Stop All
```bash
docker-compose down
docker-compose down -v  # Also remove volumes
```

---

## Environment Variables

### Backend (.env)
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| MONGODB_URI | Yes | - | MongoDB connection string |
| JWT_SECRET | Yes | - | JWT signing secret (min 32 chars) |
| PORT | No | 5000 | Server port |
| NODE_ENV | No | development | Environment |
| ML_SERVICE_URL | No | http://localhost:8000 | ML microservice URL |
| FRONTEND_URL | No | http://localhost:3000 | Allowed CORS origin |
| ENCRYPTION_KEY | No | - | Data-at-rest encryption key |

### ML Service (.env)
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| MONGODB_URI | Yes | - | MongoDB connection string |
| PORT | No | 8000 | FastAPI port |
| DEBUG | No | false | Debug mode |

---

## Startup Order
1. MongoDB (must be healthy first)
2. Backend (connects to MongoDB)
3. ML Service (connects to MongoDB)
4. Frontend (calls Backend API)
5. Prometheus (scrapes Backend + ML)
6. Grafana (reads Prometheus)

Docker Compose `depends_on` with `condition: service_healthy` enforces this automatically.

---

## Health Checks

### Backend
```bash
curl http://localhost:5000/health
```
Expected: JSON with `status`, `database`, `memory`, and `timestamp`

### ML Service
```bash
curl http://localhost:8000/health
```
Expected: `{"status":"healthy","version":"1.0.0","uptime_seconds":...}`

### Blockchain Integrity
```bash
curl http://localhost:5000/api/blockchain/chain/verify
```
Expected: `{"valid":true,"blocks":...}`

---

## Strict Release Gate (No Deploy)

Use this gate before pushing for Railway/Vercel deployment.

### 1. Backend smoke (alternate port)
```bash
cd Backend
PORT=5001 npm start
```
Pass criteria:
- Startup completes without process crash
- `GET http://localhost:5001/health` returns HTTP 200
- `GET http://localhost:5001/api/ml/health` returns HTTP 200 when ML service is running

### 2. Frontend production build
```bash
cd frontend
npm run build
```
Pass criteria:
- Build completes successfully
- Warnings are documented and non-blocking

### 3. Port conflict precheck
Before local startup verify ports are free or override:
- Backend: 5000
- Frontend: 3000
- ML: 8000

### 4. Scope freeze
For release candidate handoff, include only intended release files and avoid bundling unrelated dirty workspace changes.

---

## Monitoring

### Prometheus Metrics
- Backend: `http://localhost:5000/metrics`
- Prometheus UI: `http://localhost:9090`

### Key Metrics
| Metric | Type | Description |
|--------|------|-------------|
| http_request_duration_seconds | Histogram | Request latency by route |
| http_requests_total | Counter | Total requests by method/route/status |
| active_connections | Gauge | Current WebSocket connections |

### Grafana Dashboards
- URL: `http://localhost:3001`
- Default credentials: admin / admin
- Prometheus datasource pre-configured

---

## Watchdog Self-Healing

The backend includes an automatic watchdog that runs every 30 seconds:
- Database connectivity check (auto-reconnect on failure)
- Memory usage monitoring (triggers GC at 85% heap usage)
- Event loop lag detection (alerts at >100ms)
- Error rate monitoring (alerts at >50/minute)

Events published to Socket.io channel `system:alert` when degradation detected.

Logs prefixed with `[Watchdog]` in stdout.

---

## Common Operations

### Create Admin User
```bash
cd Backend
node create-admin.js
```

### Create Super Admin
```bash
cd Backend
node create-super-admin.js
```

### Seed Hospital Data
```bash
cd Backend
node seed-hospitals.js
node seed-vizag-hospitals.js
```

### Seed Blood Camps
```bash
cd Backend
node seed-blood-camps.js
```

### Train ML Models
```bash
cd ml-service
python -m app.training.train_models
```

---

## Troubleshooting

### Backend won't start
1. Check MongoDB is running: `mongosh --eval "db.runCommand({ping:1})"`
2. Verify .env has valid MONGODB_URI
3. Check port 5000 is free: `netstat -ano | findstr :5000`

### ML Service won't start
1. Check Python version: `python --version` (need 3.11+)
2. Verify venv activated and dependencies installed
3. Check port 8000 is free

### WebSocket not connecting
1. Browser console: check for CORS errors
2. Verify FRONTEND_URL in backend .env matches actual frontend URL
3. Check `io.connect()` URL matches backend

### Docker build fails
1. Ensure Docker Desktop is running
2. Clear build cache: `docker-compose build --no-cache`
3. Check disk space: `docker system df`

### High memory usage
1. Watchdog auto-triggers GC at 85%
2. Manual restart: `docker-compose restart backend`
3. Check for memory leaks: review active connections count in /metrics

### Database connection drops
1. Watchdog auto-reconnects
2. Check MongoDB Atlas status / local mongod process
3. Verify network connectivity to MongoDB host

---

## Backup & Recovery

### MongoDB Backup
```bash
mongodump --uri="<MONGODB_URI>" --out=./backup/$(date +%Y%m%d)
```

### MongoDB Restore
```bash
mongorestore --uri="<MONGODB_URI>" ./backup/<date>/
```

### Blockchain State
The blockchain is in-memory and rebuilds from genesis on restart. For persistence, blockchain transactions are recorded alongside standard MongoDB documents via event handlers.

---

## Security Checklist
- [ ] JWT_SECRET is unique, random, 64+ characters
- [ ] MONGODB_URI uses authentication
- [ ] NODE_ENV=production in production
- [ ] Rate limiting active (100 req/15min general, 20 req/15min auth)
- [ ] Helmet security headers enabled
- [ ] MongoDB query sanitization enabled
- [ ] Token blacklist operational for logout/revocation
- [ ] HTTPS terminated at load balancer / reverse proxy
