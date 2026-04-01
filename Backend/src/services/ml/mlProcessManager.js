const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

let mlProcess = null;
let isShuttingDown = false;
let restartAttempts = 0;
const MAX_RESTART_ATTEMPTS = 5;
const RESTART_DELAY = 3000;
const HEALTH_CHECK_INTERVAL = 30000;
let healthIntervalRef = null;

function getProjectRoot() {
  return path.join(__dirname, '../../../../');
}

function resolvePythonExecutable(mlServicePath) {
  const projectRoot = getProjectRoot();
  const candidates = [
    process.env.ML_PYTHON_PATH,
    path.join(projectRoot, '.venv-1', 'Scripts', 'python.exe'),
    path.join(projectRoot, '.venv', 'Scripts', 'python.exe'),
    path.join(mlServicePath, '.venv', 'Scripts', 'python.exe'),
    path.join(mlServicePath, '.venv-1', 'Scripts', 'python.exe')
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return 'python';
}

/**
 * Start the ML Service as a child process - Using exec for better shell support
 */
function startMLService() {
  return new Promise((resolve, reject) => {
    if (mlProcess) {
      console.log('[ML Manager] ML Service already running');
      resolve();
      return;
    }

    if (isShuttingDown) {
      console.log('[ML Manager] Cannot start while shutting down');
      reject(new Error('Service is shutting down'));
      return;
    }

    try {
      const mlServicePath = path.join(getProjectRoot(), 'ml-service');
      
      // Ensure ml-service directory exists
      if (!fs.existsSync(mlServicePath)) {
        console.error('[ML Manager] ML Service directory not found:', mlServicePath);
        reject(new Error('ML Service directory not found'));
        return;
      }

      const mainPyPath = path.join(mlServicePath, 'main.py');
      if (!fs.existsSync(mainPyPath)) {
        console.error('[ML Manager] main.py not found at:', mainPyPath);
        reject(new Error('main.py not found'));
        return;
      }

      checkMLHealth()
        .then(() => {
          console.log('[ML Manager] ML Service already healthy on port 8000');
          resolve();
        })
        .catch(() => {
          const pythonExecutable = resolvePythonExecutable(mlServicePath);

          console.log('[ML Manager] Starting ML Service...');
          console.log('[ML Manager] ML Service path:', mlServicePath);
          console.log('[ML Manager] main.py path:', mainPyPath);
          console.log('[ML Manager] Python executable:', pythonExecutable);

          const args = ['-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', '8000'];
          console.log('[ML Manager] Command:', `${pythonExecutable} ${args.join(' ')}`);

          mlProcess = spawn(pythonExecutable, args, {
            cwd: mlServicePath,
            env: { ...process.env, PYTHONUNBUFFERED: '1', PORT: '8000' },
            stdio: ['ignore', 'pipe', 'pipe']
          });

          mlProcess.stdout.on('data', (data) => {
            const message = data.toString().trim();
            if (message) {
              console.log(`[ML Service] ${message}`);
            }
          });

          mlProcess.stderr.on('data', (data) => {
            const message = data.toString().trim();
            if (message && !message.includes('WARNING')) {
              console.error(`[ML Service] ${message}`);
            } else if (message) {
              console.log(`[ML Service] ${message}`);
            }
          });

          mlProcess.on('exit', (code, signal) => {
            console.log(`[ML Manager] ML Service exited with code ${code} (signal: ${signal || 'none'})`);
            mlProcess = null;

            if (!isShuttingDown && restartAttempts < MAX_RESTART_ATTEMPTS) {
              restartAttempts++;
              console.log(`[ML Manager] Attempting restart (${restartAttempts}/${MAX_RESTART_ATTEMPTS}) in ${RESTART_DELAY}ms...`);
              setTimeout(() => {
                startMLService().catch((err) => {
                  console.error('[ML Manager] Failed to restart:', err.message);
                });
              }, RESTART_DELAY);
            } else if (!isShuttingDown && restartAttempts >= MAX_RESTART_ATTEMPTS) {
              console.error('[ML Manager] Max restart attempts reached');
            }
          });

          mlProcess.on('error', (err) => {
            console.error('[ML Manager] Error starting ML Service:', err.message);
            mlProcess = null;
            reject(err);
          });

          setTimeout(() => {
            checkMLHealth()
              .then(() => {
                console.log('[ML Manager] ML Service started successfully');
                console.log('[ML Manager] ML Service running on http://localhost:8000');
                restartAttempts = 0;
                resolve();
              })
              .catch((err) => {
                console.warn('[ML Manager] Health check failed (service warming up):', err.message);
                resolve();
              });
          }, 4000);
        });
    } catch (error) {
      console.error('[ML Manager] Exception:', error.message);
      mlProcess = null;
      reject(error);
    }
  });
}

/**
 * Check ML Service health
 */
function checkMLHealth() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8000,
      path: '/health',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      if (res.statusCode === 200) {
        resolve({ status: 'healthy' });
      } else {
        reject(new Error(`Status ${res.statusCode}`));
      }
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

/**
 * Start periodic health monitoring
 */
function startHealthMonitoring() {
  if (healthIntervalRef) {
    clearInterval(healthIntervalRef);
    healthIntervalRef = null;
  }

  healthIntervalRef = setInterval(async () => {
    try {
      if (!mlProcess || isShuttingDown) {
        return;
      }

      await checkMLHealth();
      console.log('[ML Manager] ✅ Health check passed');
    } catch (error) {
      console.warn('[ML Manager] Health check failed:', error.message);
      
      if (!isShuttingDown && mlProcess) {
        console.log('[ML Manager] Restarting ML Service...');
        await stopMLService();
        await new Promise(r => setTimeout(r, 1000));
        await startMLService().catch(err => {
          console.error('[ML Manager] Restart failed:', err.message);
        });
      }
    }
  }, HEALTH_CHECK_INTERVAL);

  return healthIntervalRef;
}

/**
 * Stop the ML Service
 */
async function stopMLService() {
  return new Promise((resolve) => {
    if (healthIntervalRef) {
      clearInterval(healthIntervalRef);
      healthIntervalRef = null;
    }

    if (!mlProcess) {
      resolve();
      return;
    }

    isShuttingDown = true;
    console.log('[ML Manager] Stopping ML Service...');

    try {
      if (mlProcess.kill('SIGTERM')) {
        const timeout = setTimeout(() => {
          console.log('[ML Manager] Force killing ML Service...');
          if (mlProcess) {
            mlProcess.kill('SIGKILL');
          }
          mlProcess = null;
          resolve();
        }, 5000);

        mlProcess.on('exit', () => {
          clearTimeout(timeout);
          mlProcess = null;
          console.log('[ML Manager] ✅ ML Service stopped');
          resolve();
        });
      } else {
        mlProcess = null;
        resolve();
      }
    } catch (error) {
      console.error('[ML Manager] Error stopping:', error.message);
      mlProcess = null;
      resolve();
    }
  });
}

/**
 * Get ML Service status
 */
function getMLServiceStatus() {
  return {
    isRunning: mlProcess !== null && mlProcess.exitCode === null,
    pid: mlProcess ? mlProcess.pid : null,
    restartAttempts: restartAttempts,
    maxRestartAttempts: MAX_RESTART_ATTEMPTS
  };
}

/**
 * Initialize ML Service Manager
 */
async function initializeMLService() {
  try {
    console.log('[ML Manager] 🚀 Initializing ML Service Manager...');
    isShuttingDown = false;
    
    // Wait for dependencies
    await new Promise(r => setTimeout(r, 500));
    
    await startMLService();
    startHealthMonitoring();
    
    console.log('[ML Manager] ✅ Initialization complete');
    return true;
  } catch (error) {
    console.error('[ML Manager] ❌ Initialization failed:', error.message);
    return false;
  }
}

/**
 * Shutdown ML Service Manager
 */
async function shutdownMLService() {
  isShuttingDown = true;
  await stopMLService();
}

module.exports = {
  initializeMLService,
  startMLService,
  stopMLService,
  shutdownMLService,
  checkMLHealth,
  getMLServiceStatus,
  startHealthMonitoring
};
