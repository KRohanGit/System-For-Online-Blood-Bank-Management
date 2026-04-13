#!/usr/bin/env node

/**
 * Verification script to test if services are running
 */

const http = require('http');
const https = require('https');

function checkService(baseUrl, path, serviceName) {
  return new Promise((resolve) => {
    const target = new URL(path, baseUrl);
    const lib = target.protocol === 'https:' ? https : http;

    const options = {
      hostname: target.hostname,
      port: target.port || (target.protocol === 'https:' ? 443 : 80),
      path: `${target.pathname}${target.search}`,
      method: 'GET',
      timeout: 3000
    };

    const req = lib.request(options, (res) => {
      if (res.statusCode === 200) {
        console.log(`✅ ${serviceName} is running on ${target.origin}`);
        resolve(true);
      } else {
        console.log(`❌ ${serviceName} returned status ${res.statusCode}`);
        resolve(false);
      }
    });

    req.on('error', (error) => {
      console.log(`❌ ${serviceName} unable to connect: ${error.message}`);
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      console.log(`❌ ${serviceName} timeout`);
      resolve(false);
    });

    req.end();
  });
}

async function main() {
  console.log('\n🔍 Verifying Services...\n');

  const backendBaseUrl = process.env.BACKEND_URL;
  const mlBaseUrl = process.env.ML_API_URL || process.env.ML_SERVICE_URL;

  if (!backendBaseUrl || !mlBaseUrl) {
    console.error('❌ Missing required environment variables. Set BACKEND_URL and ML_API_URL (or ML_SERVICE_URL).');
    process.exit(1);
  }
  
  const backendOk = await checkService(backendBaseUrl, '/health', 'Backend API');
  const mlOk = await checkService(mlBaseUrl, '/health', 'ML Service');
  
  console.log('\n' + '='.repeat(50));
  if (backendOk && mlOk) {
    console.log('✅ All services are running successfully!');
    console.log(`🌐 Backend: ${backendBaseUrl}`);
    console.log(`🤖 ML Service: ${mlBaseUrl}`);
  } else if (backendOk) {
    console.log('⚠️  Backend is running but ML service not ready yet');
    console.log('💡 ML service may still be starting - wait 5-10 seconds and try again');
  } else {
    console.log('❌ Services are not responding');
  }
  console.log('='.repeat(50) + '\n');
}

main();
