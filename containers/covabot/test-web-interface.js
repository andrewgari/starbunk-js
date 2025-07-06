#!/usr/bin/env node

/**
 * Quick test script to verify the CovaBot web interface is working
 * This script starts the web server and performs basic API tests
 */

const { spawn } = require('child_process');
const http = require('http');

console.log('🧪 Testing CovaBot Web Interface...\n');

// Start the web server
console.log('📡 Starting web server...');
const server = spawn('npm', ['run', 'dev:web'], {
  cwd: __dirname,
  stdio: ['pipe', 'pipe', 'pipe']
});

let serverReady = false;

server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(`[SERVER] ${output.trim()}`);
  
  if (output.includes('running on http://localhost:3001')) {
    serverReady = true;
    console.log('\n✅ Server is ready! Running tests...\n');
    runTests();
  }
});

server.stderr.on('data', (data) => {
  console.error(`[SERVER ERROR] ${data.toString().trim()}`);
});

// Test functions
async function runTests() {
  try {
    // Test 1: Health check
    console.log('🔍 Test 1: Health check...');
    await testHealthCheck();
    
    // Test 2: Get notes
    console.log('🔍 Test 2: Get notes...');
    await testGetNotes();
    
    // Test 3: Get stats
    console.log('🔍 Test 3: Get stats...');
    await testGetStats();
    
    // Test 4: Web interface
    console.log('🔍 Test 4: Web interface...');
    await testWebInterface();
    
    console.log('\n🎉 All tests passed! CovaBot web interface is working correctly.');
    console.log('🌐 Access the interface at: http://localhost:3001');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    console.log('\n🛑 Stopping server...');
    server.kill();
    process.exit(0);
  }
}

function makeRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function testHealthCheck() {
  const response = await makeRequest('/api/health');
  if (response.status === 200 && response.data.success) {
    console.log('  ✅ Health check passed');
  } else {
    throw new Error(`Health check failed: ${response.status}`);
  }
}

async function testGetNotes() {
  const response = await makeRequest('/api/notes');
  if (response.status === 200 && response.data.success !== undefined) {
    console.log(`  ✅ Notes API working (${response.data.data?.length || 0} notes)`);
  } else {
    throw new Error(`Notes API failed: ${response.status}`);
  }
}

async function testGetStats() {
  const response = await makeRequest('/api/stats');
  if (response.status === 200) {
    console.log('  ✅ Stats API working');
  } else {
    throw new Error(`Stats API failed: ${response.status}`);
  }
}

async function testWebInterface() {
  const response = await makeRequest('/');
  if (response.status === 200 && typeof response.data === 'string' && response.data.includes('CovaBot')) {
    console.log('  ✅ Web interface serving correctly');
  } else {
    throw new Error(`Web interface failed: ${response.status}`);
  }
}

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping server...');
  server.kill();
  process.exit(0);
});

// Timeout after 30 seconds
setTimeout(() => {
  if (!serverReady) {
    console.error('\n❌ Server failed to start within 30 seconds');
    server.kill();
    process.exit(1);
  }
}, 30000);
