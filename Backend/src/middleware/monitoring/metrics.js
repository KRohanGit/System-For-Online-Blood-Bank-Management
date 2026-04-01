const client = require('prom-client');

const register = new client.Registry();

client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
});
register.registerMetric(httpRequestDuration);

const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});
register.registerMetric(httpRequestTotal);

const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});
register.registerMetric(activeConnections);

const emergencyRequestsTotal = new client.Counter({
  name: 'emergency_requests_total',
  help: 'Total emergency blood requests',
  labelNames: ['blood_group', 'severity']
});
register.registerMetric(emergencyRequestsTotal);

const bloodInventoryGauge = new client.Gauge({
  name: 'blood_inventory_units',
  help: 'Current blood inventory units',
  labelNames: ['blood_group', 'status']
});
register.registerMetric(bloodInventoryGauge);

const donorRegistrationsTotal = new client.Counter({
  name: 'donor_registrations_total',
  help: 'Total donor registrations'
});
register.registerMetric(donorRegistrationsTotal);

const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  activeConnections.inc();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    const labels = {
      method: req.method,
      route: route,
      status_code: res.statusCode
    };
    httpRequestDuration.observe(labels, duration);
    httpRequestTotal.inc(labels);
    activeConnections.dec();
  });

  next();
};

module.exports = {
  register,
  metricsMiddleware,
  emergencyRequestsTotal,
  bloodInventoryGauge,
  donorRegistrationsTotal,
  httpRequestDuration,
  httpRequestTotal
};
