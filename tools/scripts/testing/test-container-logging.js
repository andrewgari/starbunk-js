#!/usr/bin/env node

/**
 * Test script to verify logging behavior in actual container environment
 * This should be run inside a container to see the real output behavior
 */

// Import logger from the container's shared package
const { logger } = require('@starbunk/shared');

console.log('=== CONTAINER LOGGING TEST ===');
console.log('Environment:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- ENABLE_STRUCTURED_LOGGING:', process.env.ENABLE_STRUCTURED_LOGGING);
console.log('- SERVICE_NAME:', process.env.SERVICE_NAME);
console.log('- CONTAINER_NAME:', process.env.CONTAINER_NAME);
console.log('');

// Test the problematic scenarios
console.log('Testing problematic scenarios:');

// 1. Error with stack trace (main issue)
const error = new Error('Test error with\nmultiline message');
error.stack = `Error: Test error with
multiline message
    at Object.<anonymous> (/path/to/file.js:10:15)
    at Module._compile (module.js:456:26)`;

logger.error('Error with multiline stack trace', error);

// 2. Object with multiline strings
logger.info('Object with multilines', {
    sql: 'SELECT *\nFROM users\nWHERE active = true',
    description: 'Multi-line\ndescription\nwith newlines'
});

// 3. Multiple arguments with newlines
logger.warn('Multiple args test',
    { first: 'value\nwith\nnewlines' },
    'Second arg\nwith newlines'
);

console.log('\n=== TEST COMPLETE ===');