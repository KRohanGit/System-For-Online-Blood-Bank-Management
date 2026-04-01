#!/usr/bin/env node

/**
 * Verification script to test if services are running
 */

const http = require('http');

function checkService(host, port, path, serviceName) {
  return new Promise((resolve) => {
    const options = {
      hostname: host,
      port: port,
      path: path,
      method: 'GET',
      timeout: 3000
    };

    const req = http.request(options, (res) => {
      if (res.statusCode === 200) {
        console.log(`✅ ${serviceName} is running on ${host}:${port}`);
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
  
  const backendOk = await checkService('localhost', 5000, '/health', 'Backend API');
  const mlOk = await checkService('localhost', 8000, '/health', 'ML Service');
  
  console.log('\n' + '='.repeat(50));
  if (backendOk && mlOk) {
    console.log('✅ All services are running successfully!');
    console.log('🌐 Backend: http://localhost:5000');
    console.log('🤖 ML Service: http://localhost:8000');
  } else if (backendOk) {
    console.log('⚠️  Backend is running but ML service not ready yet');
    console.log('💡 ML service may still be starting - wait 5-10 seconds and try again');
  } else {
    console.log('❌ Services are not responding');
  }
  console.log('='.repeat(50) + '\n');
}

main();
