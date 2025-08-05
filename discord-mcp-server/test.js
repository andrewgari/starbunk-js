#!/usr/bin/env node

// Simple test to verify the MCP server can start
// This doesn't require a Discord token, just tests the MCP server initialization

import { spawn } from 'child_process';

console.log('Testing Discord MCP Server startup...');

const server = spawn('node', ['build/index.js'], {
  env: { ...process.env, DISCORD_TOKEN: 'fake_token_for_test' },
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let errorOutput = '';

server.stdout.on('data', (data) => {
  output += data.toString();
});

server.stderr.on('data', (data) => {
  errorOutput += data.toString();
});

// Kill the server after 3 seconds
setTimeout(() => {
  server.kill('SIGTERM');
}, 3000);

server.on('close', (code) => {
  console.log('\n--- Test Results ---');
  console.log('Exit code:', code);
  
  let testPassed = false;
  
  if (errorOutput.includes('Failed to connect to Discord') || errorOutput.includes('Incorrect login details')) {
    console.log('✅ MCP server started correctly (expected Discord auth failure with fake token)');
    testPassed = true;
  } else if (output.includes('Discord MCP Server') || errorOutput.includes('Discord MCP Server')) {
    console.log('✅ MCP server started correctly');
    testPassed = true;
  } else {
    console.log('❌ Unexpected output:');
    console.log('STDOUT:', output);
    console.log('STDERR:', errorOutput);
    testPassed = false;
  }
  
  process.exit(testPassed ? 0 : 1);
});