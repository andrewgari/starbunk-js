#!/usr/bin/env node

/**
 * Test script to reproduce JSON line-splitting issue in structured logging
 * This script tests the logger implementation to identify the source of the problem
 */

const path = require('path');
const fs = require('fs');

// Set up environment for testing
process.env.ENABLE_STRUCTURED_LOGGING = 'true';
process.env.SERVICE_NAME = 'test-service';
process.env.CONTAINER_NAME = 'test-container';
process.env.NODE_ENV = 'development';

console.log('=== Testing Logger Behavior ===');
console.log('Environment setup:');
console.log('- ENABLE_STRUCTURED_LOGGING:', process.env.ENABLE_STRUCTURED_LOGGING);
console.log('- SERVICE_NAME:', process.env.SERVICE_NAME);
console.log('- CONTAINER_NAME:', process.env.CONTAINER_NAME);
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('');

// Check if shared package is built
const distPath = path.resolve(__dirname, '../../../packages/shared/dist');
if (!fs.existsSync(distPath)) {
    console.log('❌ Shared package not built. Please run: npm run build:shared');
    process.exit(1);
}
console.log('✅ Shared package is available');

// Import the logger after building
const { logger } = require('../../../packages/shared/dist/services/logger');

console.log('\n=== Testing Structured Logging Output ===');

// Test various logging scenarios that might cause JSON splitting
console.log('\n1. Simple log messages:');
logger.info('Simple info message');
logger.warn('Simple warning message');
logger.error('Simple error message');

console.log('\n2. Log messages with additional data:');
logger.info('Message with data', { userId: 123, action: 'login' });
logger.warn('Warning with context', { component: 'auth', attempts: 3 });

console.log('\n3. Log messages with complex objects:');
logger.info('Complex object', {
    user: {
        id: 123,
        name: 'Test User',
        preferences: {
            theme: 'dark',
            notifications: true
        }
    },
    metadata: {
        timestamp: new Date().toISOString(),
        source: 'test-script'
    }
});

console.log('\n4. Log messages with arrays:');
logger.info('Array data', {
    items: ['item1', 'item2', 'item3'],
    numbers: [1, 2, 3, 4, 5]
});

console.log('\n5. Log message with error object:');
const testError = new Error('Test error message');
testError.stack = 'Error: Test error message\n    at test (/path/to/file.js:123:45)';
logger.error('Error occurred', testError);

console.log('\n6. Log message with multiline strings:');
logger.info('Multiline message', {
    description: 'This is a\nmultiline\nstring that might\ncause issues',
    code: 'function test() {\n  return "hello";\n}'
});

console.log('\n7. Log message with special characters:');
logger.info('Special chars', {
    text: 'Contains "quotes" and \'apostrophes\' and {braces} and [brackets]',
    unicode: '🎉 Unicode characters 🚀',
    escaped: 'Contains\\backslashes\\and\\paths'
});

console.log('\n8. Very long log message:');
const longMessage = 'This is a very long message that might exceed normal line lengths and could potentially cause issues with log parsing or display in Grafana dashboards when the JSON is formatted or split across multiple lines due to length constraints or terminal width limitations.';
logger.info(longMessage, {
    longData: longMessage.repeat(3),
    timestamp: new Date().toISOString()
});

console.log('\n=== Testing Non-Structured Logging (Formatted) ===');

// Temporarily disable structured logging to compare
process.env.ENABLE_STRUCTURED_LOGGING = 'false';

// Create new logger instance with updated environment
const { Logger } = require('../../../packages/shared/dist/services/logger');
const formattedLogger = new Logger();

console.log('\n9. Same messages with formatted logging:');
formattedLogger.info('Simple info message');
formattedLogger.info('Message with data', { userId: 123, action: 'login' });
formattedLogger.error('Error occurred', testError);

console.log('\n=== Test Complete ===');
console.log('Check the output above for any JSON formatting issues or line splits');