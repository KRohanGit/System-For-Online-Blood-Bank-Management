require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/database');

// Import routes
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

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware - ALWAYS ON
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n🌐 [${timestamp}] ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('📦 Body:', JSON.stringify(req.body, null, 2));
  }
  if (req.query && Object.keys(req.query).length > 0) {
    console.log('🔍 Query:', req.query);
  }
  next();
});

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/hospital', hospitalRoutes);
app.use('/api/donor', donorRoutes);
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/blood-inventory', bloodInventoryRoutes);
app.use('/api/public', publicUserRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/blood-camps', bloodCampRoutes);
app.use('/api/emergency-intelligence', emergencyIntelligenceRoutes);
app.use('/api/doctor-clinical', doctorClinicalRoutes);
app.use('/api/geolocation', geolocationRoutes);
app.use('/api/emergency-coordination', emergencyCoordinationRoutes);
app.use('/api/clinical-advisory', clinicalAdvisoryRoutes);
app.use('/api/audit-trail', auditTrailRoutes);

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

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start server function
const startServer = async () => {
  try {
    // Connect to MongoDB first
    await connectDB();
    
    // Start escalation monitoring service
    const { startEscalationMonitoring } = require('./src/services/escalationService');
    startEscalationMonitoring(2); // Check every 2 minutes
    
    // Start server
    const PORT = process.env.PORT || 5000;
    
    app.listen(PORT, () => {
      console.log('\n🚀 ═══════════════════════════════════════');
      console.log(`   LifeLink Backend Server Running`);
      console.log('   ═══════════════════════════════════════');
      console.log(`   📍 URL: http://localhost:${PORT}`);
      console.log(`   🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   📅 Started: ${new Date().toLocaleString()}`);
      console.log(`   🔔 Escalation Service: Active`);
      console.log(`   📅 Started: ${new Date().toLocaleString()}`);
      console.log('   ═══════════════════════════════════════\n');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  // Close server & exit process
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

module.exports = app;
