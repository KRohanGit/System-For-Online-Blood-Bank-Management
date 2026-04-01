const os = require('os');
const mongoose = require('mongoose');

let serviceStartTime = Date.now();

const getHealthStatus = async () => {
  const dbState = mongoose.connection.readyState;
  const dbStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const uptime = Math.floor((Date.now() - serviceStartTime) / 1000);
  const memUsage = process.memoryUsage();

  return {
    status: dbState === 1 ? 'healthy' : 'degraded',
    uptime,
    database: {
      status: dbStates[dbState] || 'unknown',
      connected: dbState === 1
    },
    memory: {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024)
    },
    system: {
      platform: os.platform(),
      cpuCount: os.cpus().length,
      freeMemory: Math.round(os.freemem() / 1024 / 1024),
      totalMemory: Math.round(os.totalmem() / 1024 / 1024),
      loadAverage: os.loadavg()
    },
    timestamp: new Date().toISOString()
  };
};

const setStartTime = () => {
  serviceStartTime = Date.now();
};

module.exports = { getHealthStatus, setStartTime };
