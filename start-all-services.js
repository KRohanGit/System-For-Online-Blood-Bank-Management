/**
 * Master Service Startup Script
 * Starts both the ML Service (Python) and Backend (Node.js) with auto-restart capability
 * Usage: node start-all-services.js
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = __dirname;
const ML_SERVICE_DIR = path.join(ROOT_DIR, 'ml-service');
const BACKEND_DIR = path.join(ROOT_DIR, 'Backend');
const LOGS_DIR = path.join(ROOT_DIR, 'logs');

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Service configurations
const services = {
  mlService: {
    name: 'ML Service',
    command: 'python',
    args: ['main.py'],
    cwd: ML_SERVICE_DIR,
    port: 8000,
    healthCheck: 'http://127.0.0.1:8000/health',
    restartDelay: 3000,
    maxRestarts: 5
  },
  backend: {
    name: 'Backend API',
    command: 'node',
    args: ['server.js'],
    cwd: BACKEND_DIR,
    port: 5000,
    healthCheck: 'http://127.0.0.1:5000/health',
    restartDelay: 2000,
    maxRestarts: 5,
    waitFor: 'mlService' // Wait for ML service to be ready
  }
};

class ServiceManager {
  constructor() {
    this.services = {};
    this.restartCounts = {};
    this.logStreams = {};
    this.serviceReadiness = {};

    // Initialize state
    Object.keys(services).forEach(key => {
      this.restartCounts[key] = 0;
      this.serviceReadiness[key] = false;
    });
  }

  isDependencyReady(serviceName) {
    const config = services[serviceName];
    if (!config.waitFor) return true;
    return this.serviceReadiness[config.waitFor] === true;
  }

  startService(name, config) {
    const self = this;

    // Skip if dependency not ready
    if (!this.isDependencyReady(name)) {
      console.log(`⏳ ${config.name}: Waiting for ${services[config.waitFor].name} to be ready...`);
      setTimeout(() => this.startService(name, config), 1000);
      return;
    }

    console.log(`🚀 Starting ${config.name}...`);

    // Create log file
    const logFile = path.join(LOGS_DIR, `${name}.log`);
    const logStream = fs.createWriteStream(logFile, { flags: 'a' });
    this.logStreams[name] = logStream;

    // Spawn the service
    const service = spawn(config.command, config.args, {
      cwd: config.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONUNBUFFERED: 1,
        PORT: config.port
      }
    });

    service.stdout.on('data', (data) => {
      const timestamp = new Date().toISOString();
      logStream.write(`[${timestamp}] ${data}`);
      process.stdout.write(`[${config.name}] ${data}`);
    });

    service.stderr.on('data', (data) => {
      const timestamp = new Date().toISOString();
      logStream.write(`[${timestamp}] ERROR: ${data}`);
      process.stderr.write(`[${config.name}] ERROR: ${data}`);
    });

    service.on('error', (error) => {
      console.error(`❌ ${config.name} error:`, error.message);
    });

    service.on('exit', (code, signal) => {
      console.log(`⚠️  ${config.name} exited with code ${code}, signal ${signal}`);
      this.serviceReadiness[name] = false;

      if (this.restartCounts[name] < config.maxRestarts) {
        this.restartCounts[name]++;
        console.log(`🔄 Restarting ${config.name} (attempt ${this.restartCounts[name]}/${config.maxRestarts})...`);
        setTimeout(() => this.startService(name, config), config.restartDelay);
      } else {
        console.error(`❌ ${config.name} failed to restart after ${config.maxRestarts} attempts`);
      }
    });

    this.services[name] = service;

    // Check service health
    this.checkServiceHealth(name, config);
  }

  checkServiceHealth(name, config) {
    const checkHealth = () => {
      if (!this.services[name]) return;

      fetch(config.healthCheck)
        .then(response => {
          if (response.ok) {
            if (!this.serviceReadiness[name]) {
              console.log(`✅ ${config.name} is healthy and ready`);
              this.serviceReadiness[name] = true;
              this.restartCounts[name] = 0;
            }
          }
        })
        .catch(() => {
          // Service not yet ready, keep checking
        });

      // Keep checking every 5 seconds
      if (this.services[name]) {
        setTimeout(checkHealth, 5000);
      }
    };

    setTimeout(checkHealth, 2000);
  }

  startAll() {
    console.log('\n🌟 LifeLink Multi-Service System Started\n');
    console.log('Starting services...\n');

    // Start services in order
    Object.entries(services).forEach(([name, config]) => {
      this.startService(name, config);
    });
  }

  stopAll() {
    console.log('\n🛑 Stopping all services...\n');
    Object.entries(this.services).forEach(([name, service]) => {
      if (service) {
        service.kill('SIGTERM');
        console.log(`Stopped ${services[name].name}`);
      }
    });

    // Close log streams
    Object.values(this.logStreams).forEach(stream => {
      if (stream) stream.end();
    });

    process.exit(0);
  }
}

// Initialize and start
const manager = new ServiceManager();

// Handle graceful shutdown
process.on('SIGINT', () => manager.stopAll());
process.on('SIGTERM', () => manager.stopAll());

// Start all services
manager.startAll();

// Display status every 30 seconds
setInterval(() => {
  console.log('\n📊 Service Status at', new Date().toISOString());
  Object.entries(services).forEach(([name, config]) => {
    const running = !!manager.services[name];
    const ready = manager.serviceReadiness[name];
    const status = running ? (ready ? '✅ Running' : '🟡 Starting') : '❌ Stopped';
    console.log(`   ${config.name}: ${status}`);
  });
  console.log('');
}, 30000);
