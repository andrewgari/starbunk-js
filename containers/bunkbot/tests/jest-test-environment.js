/**
 * Custom Jest Test Environment
 * 
 * This custom environment ensures that DEBUG_MODE is always false during tests,
 * regardless of what the CI/CD environment sets. This is critical for chance-based
 * tests to work correctly.
 */

const { TestEnvironment } = require('jest-environment-node');

class CustomTestEnvironment extends TestEnvironment {
  constructor(config, context) {
    // Force DEBUG_MODE to false BEFORE calling super
    process.env.DEBUG_MODE = 'false';
    process.env.NODE_ENV = 'test';
    
    super(config, context);
    
    // Also set it in the global environment
    this.global.process.env.DEBUG_MODE = 'false';
    this.global.process.env.NODE_ENV = 'test';
  }

  async setup() {
    await super.setup();
    
    // Ensure DEBUG_MODE is false in the test environment
    this.global.process.env.DEBUG_MODE = 'false';
    this.global.process.env.NODE_ENV = 'test';
    
    // Force the shared library to recognize the change
    try {
      // Clear require cache to force fresh import
      const sharedPath = require.resolve('@starbunk/shared');
      delete require.cache[sharedPath];
      
      const { setDebugMode } = require('@starbunk/shared');
      setDebugMode(false);
      
      console.log('[Custom Jest Environment] DEBUG_MODE forced to false');
    } catch (error) {
      console.log('[Custom Jest Environment] Could not import setDebugMode:', error.message);
    }
  }

  async teardown() {
    await super.teardown();
  }
}

module.exports = CustomTestEnvironment;
