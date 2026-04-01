require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const connectDB = require('./src/config/database');

const { securityHeaders, sanitizeInput, authLimiter, apiLimiter } = require('./src/middleware/security');
const { metricsMiddleware, register } = require('./src/middleware/monitoring/metrics');
const { getHealthStatus, setStartTime } = require('./src/services/monitoring/healthService');

const authRoutes = require('./src/routes/authRoutes');
const doctorRoutes = require('./src/routes/doctorRoutes');
const hospitalRoutes = require('./src/routes/hospitalRoutes');
const donorRoutes = require('./src/routes/donorRoutes');
const superAdminRoutes = require('./src/routes/superAdminRoutes');
const bloodInventoryRoutes = require('./src/routes/bloodInventoryRoutes');
const publicUserRoutes = require('./src/routes/publicUserRoutes');
const communityRoutes = require('./src/routes/communityRoutes');
const appointmentRoutes = require('./src/routes/appointmentRoutes');
const bloodCampRoutes = require('./src/routes/bloodCampRoutes');
const emergencyIntelligenceRoutes = require('./src/routes/emergencyIntelligenceRoutes');
const doctorClinicalRoutes = require('./src/routes/doctorClinicalRoutes');
const geolocationRoutes = require('./src/routes/geolocationRoutes');
const emergencyCoordinationRoutes = require('./src/routes/emergencyCoordinationRoutes');
const clinicalAdvisoryRoutes = require('./src/routes/clinicalAdvisory');
const auditTrailRoutes = require('./src/routes/auditTrail');
const donationRoutes = require('./src/routes/donation.routes');
const donorAuthRoutes = require('./src/routes/donorAuth.routes');
const donorDashboardRoutes = require('./src/routes/donor.routes');
const emergencyRoutes = require('./src/routes/emergency.routes');
const blockchainRoutes = require('./src/routes/blockchainRoutes');
const bloodTraceRoutes = require('./src/routes/blood.routes');
const mlRoutes = require('./src/routes/mlRoutes');
const rlRoutes = require('./src/routes/rlRoutes');
const graphRoutes = require('./src/routes/graphRoutes');
const syntheticRoutes = require('./src/routes/syntheticRoutes');
const optimizeRoutes = require('./src/routes/optimizeRoutes');
const secureDocumentRoutes = require('./src/routes/secureDocumentRoutes');

const app = express();
const server = http.createServer(app);

app.use(securityHeaders);
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeInput);
app.use(metricsMiddleware);

app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
  }
  next();
});

app.get('/health', async (req, res) => {
  try {
    const health = await getHealthStatus();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({ status: 'error', message: error.message });
  }
});

app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/doctor', apiLimiter, doctorRoutes);
app.use('/api/hospital', apiLimiter, hospitalRoutes);
app.use('/api/donor', apiLimiter, donorRoutes);
app.use('/api/superadmin', apiLimiter, superAdminRoutes);
app.use('/api/blood-inventory', apiLimiter, bloodInventoryRoutes);
app.use('/api/public', publicUserRoutes);
app.use('/api/community', apiLimiter, communityRoutes);
app.use('/api/appointments', apiLimiter, appointmentRoutes);
app.use('/api/blood-camps', apiLimiter, bloodCampRoutes);
app.use('/api/emergency-intelligence', apiLimiter, emergencyIntelligenceRoutes);
app.use('/api/doctor-clinical', apiLimiter, doctorClinicalRoutes);
app.use('/api/geolocation', geolocationRoutes);
app.use('/api/emergency-coordination', emergencyCoordinationRoutes);
app.use('/api/clinical-advisory', apiLimiter, clinicalAdvisoryRoutes);
app.use('/api/audit-trail', apiLimiter, auditTrailRoutes);
app.use('/api/donations', apiLimiter, donationRoutes);
app.use('/api/donor-auth', authLimiter, donorAuthRoutes);
app.use('/api/donor-dashboard', apiLimiter, donorDashboardRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/blockchain', apiLimiter, blockchainRoutes);
app.use('/api/blood', apiLimiter, bloodTraceRoutes);
app.use('/api/ml', apiLimiter, mlRoutes);
app.use('/api/rl', apiLimiter, rlRoutes);
app.use('/api/graph', apiLimiter, graphRoutes);
app.use('/api/synthetic', apiLimiter, syntheticRoutes);
app.use('/api/optimize', apiLimiter, optimizeRoutes);
app.use('/api/documents', apiLimiter, secureDocumentRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'LifeLink Backend API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      doctor: '/api/doctor',
      hospital: '/api/hospital',
      donor: '/api/donor'
    }
  });
});

app.use((req, res, next) => {
  const error = new Error('Route not found');
  error.status = 404;
  next(error);
});

app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const startServer = async () => {
  try {
    await connectDB();
    setStartTime();

    // Initialize and start ML Service (automatically spawns Python process)
    console.log('🚀 Starting ML Service Manager...');
    const { initializeMLService } = require('./src/services/ml/mlProcessManager');
    try {
      await initializeMLService();
    } catch (error) {
      console.warn('⚠️ ML Service initialization warning:', error.message);
      // Continue even if ML service fails to start - it will retry
    }

    const { startEscalationMonitoring } = require('./src/services/escalationService');
    startEscalationMonitoring(2);

    const { initializeSocket } = require('./src/services/realtime/socketService');
    const io = initializeSocket(server);
    app.set('io', io);

    const { setupEventHandlers } = require('./src/services/realtime/eventHandlers');
    setupEventHandlers();

    const rlAllocationAgentService = require('./src/services/rl-agent');
    rlAllocationAgentService.initializeRealtime();

    const graphIntelligenceService = require('./src/services/graph-intelligence');
    graphIntelligenceService.initializeRealtime();

    const { startWatchdog } = require('./src/services/monitoring/watchdog');
    startWatchdog(30);

    const PORT = process.env.PORT || 5000;

    server.listen(PORT, () => {
      console.log('\n' + '='.repeat(60));
      console.log('✅ LifeLink Backend Server Started Successfully!');
      console.log('='.repeat(60));
      console.log(`🔌 Backend API running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📈 Metrics: http://localhost:${PORT}/metrics`);
      console.log(`🤖 ML Service: http://localhost:8000/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('='.repeat(60) + '\n');
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

startServer();

const gracefulShutdown = async (signal) => {
  console.log(`${signal} received. Starting graceful shutdown...`);
  
  // Shutdown ML Service Manager
  try {
    const { shutdownMLService } = require('./src/services/ml/mlProcessManager');
    await shutdownMLService();
  } catch (error) {
    console.error('Error shutting down ML Service:', error.message);
  }
  
  server.close(() => {
    console.log('HTTP server closed.');
    const mongoose = require('mongoose');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed.');
      process.exit(0);
    });
  });
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

module.exports = { app, server };
