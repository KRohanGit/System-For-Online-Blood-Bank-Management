const os = require('os');
const mongoose = require('mongoose');
const eventBus = require('../realtime/eventBus');


const THRESHOLDS = {
  memoryUsagePct: 85,
  eventLoopLagMs: 500,
  dbResponseMs: 5000,
  errorRatePerMin: 50
};

const state = {
  checks: [],
  incidents: [],
  lastCheck: null,
  errorCount: 0,
  errorWindow: [],
  intervalId: null
};

async function checkDatabaseHealth() {
  const start = Date.now();
  try {
    await mongoose.connection.db.admin().ping();
    const latency = Date.now() - start;
    return {
      name: 'database',
      status: latency < THRESHOLDS.dbResponseMs ? 'healthy' : 'degraded',
      latency,
      message: latency < THRESHOLDS.dbResponseMs ? 'Database responsive' : `High latency: ${latency}ms`
    };
  } catch (error) {
    return {
      name: 'database',
      status: 'unhealthy',
      latency: Date.now() - start,
      message: error.message
    };
  }
}

function checkMemoryHealth() {
  const used = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedPct = ((totalMem - freeMem) / totalMem) * 100;
  const heapPct = (used.heapUsed / used.heapTotal) * 100;
  return {
    name: 'memory',
    status: usedPct < THRESHOLDS.memoryUsagePct ? 'healthy' : 'degraded',
    systemUsedPct: Math.round(usedPct),
    heapUsedPct: Math.round(heapPct),
    heapUsedMB: Math.round(used.heapUsed / 1024 / 1024),
    rssMB: Math.round(used.rss / 1024 / 1024),
    message: usedPct < THRESHOLDS.memoryUsagePct ? 'Memory OK' : 'Memory pressure detected'
  };
}

function checkEventLoopHealth() {
  return new Promise((resolve) => {
    const start = Date.now();
    setImmediate(() => {
      const lag = Date.now() - start;
      resolve({
        name: 'event_loop',
        status: lag < THRESHOLDS.eventLoopLagMs ? 'healthy' : 'degraded',
        lagMs: lag,
        message: lag < THRESHOLDS.eventLoopLagMs ? 'Event loop OK' : `Event loop lag: ${lag}ms`
      });
    });
  });
}

function checkErrorRate() {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  state.errorWindow = state.errorWindow.filter(t => t > oneMinuteAgo);
  const rate = state.errorWindow.length;
  return {
    name: 'error_rate',
    status: rate < THRESHOLDS.errorRatePerMin ? 'healthy' : 'degraded',
    errorsPerMinute: rate,
    message: rate < THRESHOLDS.errorRatePerMin ? 'Error rate normal' : `High error rate: ${rate}/min`
  };
}

function recordError() {
  state.errorWindow.push(Date.now());
}

async function runHealthChecks() {
  const dbCheck = await checkDatabaseHealth();
  const memCheck = checkMemoryHealth();
  const elCheck = await checkEventLoopHealth();
  const errCheck = checkErrorRate();
  const checks = [dbCheck, memCheck, elCheck, errCheck];
  const unhealthy = checks.filter(c => c.status !== 'healthy');
  state.checks = checks;
  state.lastCheck = new Date().toISOString();
  if (unhealthy.length > 0) {
    const incident = {
      timestamp: new Date().toISOString(),
      degradedServices: unhealthy.map(c => c.name),
      details: unhealthy
    };
    state.incidents.push(incident);
    if (state.incidents.length > 100) {
      state.incidents = state.incidents.slice(-100);
    }
    eventBus.publish('system:health_degraded', {
      services: unhealthy.map(c => c.name),
      details: unhealthy
    });
    for (const check of unhealthy) {
      await attemptSelfHeal(check);
    }
  }
  return {
    overallStatus: unhealthy.length === 0 ? 'healthy' : 'degraded',
    checks,
    lastCheck: state.lastCheck
  };
}

async function attemptSelfHeal(check) {
  if (check.name === 'memory' && check.status === 'degraded') {
    if (global.gc) {
      global.gc();
    }
  }
  if (check.name === 'database' && check.status === 'unhealthy') {
    try {
      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(process.env.MONGO_URI);
      }
    } catch (err) {
      console.error('Self-heal DB reconnect failed:', err.message);
    }
  }
}

function startWatchdog(intervalSeconds = 30) {
  if (state.intervalId) {
    clearInterval(state.intervalId);
  }
  state.intervalId = setInterval(async () => {
    try {
      await runHealthChecks();
    } catch (err) {
      console.error('Watchdog check failed:', err.message);
    }
  }, intervalSeconds * 1000);
  runHealthChecks();
}

function stopWatchdog() {
  if (state.intervalId) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }
}

function getWatchdogStatus() {
  return {
    running: !!state.intervalId,
    lastCheck: state.lastCheck,
    currentChecks: state.checks,
    recentIncidents: state.incidents.slice(-10),
    totalIncidents: state.incidents.length
  };
}

module.exports = {
  startWatchdog,
  stopWatchdog,
  runHealthChecks,
  getWatchdogStatus,
  recordError,
  THRESHOLDS
};
