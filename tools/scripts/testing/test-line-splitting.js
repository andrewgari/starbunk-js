#!/usr/bin/env node

/**
 * Focused test to identify JSON line-splitting issues
 * This script specifically tests scenarios that might cause multi-line output
 */

const path = require('path');
const fs = require('fs');

// Test both structured and non-structured logging
const testScenarios = [
    {
        name: 'STRUCTURED_LOGGING_ENABLED',
        env: { ENABLE_STRUCTURED_LOGGING: 'true' }
    },
    {
        name: 'STRUCTURED_LOGGING_DISABLED',
        env: { ENABLE_STRUCTURED_LOGGING: 'false' }
    }
];

function runTestScenario(scenario) {
    console.log(`\n=== ${scenario.name} ===`);

    // Set environment
    Object.assign(process.env, {
        SERVICE_NAME: 'line-split-test',
        CONTAINER_NAME: 'test-container',
        NODE_ENV: 'development',
        ...scenario.env
    });

    // Import fresh logger instance
    delete require.cache[require.resolve('../../../packages/shared/dist/services/logger')];
    const { Logger } = require('../../../packages/shared/dist/services/logger');
    const logger = new Logger();

    console.log(`Structured logging: ${process.env.ENABLE_STRUCTURED_LOGGING}`);

    // Test cases that might cause line splitting
    console.log('\n1. Testing error with stack trace:');
    const error = new Error('Multi-line error message\nwith newlines in it');
    error.stack = `Error: Multi-line error message
with newlines in it
    at Object.<anonymous> (/path/to/file.js:10:15)
    at Module._compile (module.js:456:26)
    at Object.Module._extensions..js (module.js:474:10)`;

    logger.error('Error with stack trace', error);

    console.log('\n2. Testing object with multiline strings:');
    logger.info('Object with multilines', {
        message: 'This is line 1\nThis is line 2\nThis is line 3',
        sql: 'SELECT *\nFROM users\nWHERE id = 1',
        description: 'A very long description that contains\nmultiple lines and might\ncause JSON parsing issues'
    });

    console.log('\n3. Testing very long single message:');
    const longMessage = 'A'.repeat(1000) + '\nB'.repeat(1000) + '\nC'.repeat(1000);
    logger.warn('Long message with newlines', { content: longMessage });

    console.log('\n4. Testing normal vs console methods:');
    logger.info('Normal info message');

    // Test direct console output vs logger output
    console.log('\n5. Raw console output:');
    console.log('Direct console.log with object:', {
        key: 'value\nwith\nnewlines',
        stack: 'line1\nline2\nline3'
    });

    console.log('\n6. Testing multiple arguments:');
    logger.info('Message with multiple args',
        { arg1: 'value1\nwith\nnewlines' },
        { arg2: 'value2\nmore\nlines' },
        'string arg with\nnewlines'
    );
}

console.log('=== LINE SPLITTING TEST ===');

// Check if shared package is built
const distPath = path.resolve(__dirname, '../../../packages/shared/dist');
if (!fs.existsSync(distPath)) {
    console.log('❌ Shared package not built. Please run: npm run build:shared');
    process.exit(1);
}

// Run both scenarios
testScenarios.forEach(runTestScenario);

console.log('\n=== ANALYSIS ===');
console.log('Look for:');
console.log('1. JSON objects split across multiple lines');
console.log('2. Stack traces appearing as separate log entries');
console.log('3. Multiline strings breaking JSON structure');
console.log('4. Differences between structured vs formatted output');