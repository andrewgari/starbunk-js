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
    // Simplified debug mode configuration
    process.env.DEBUG_MODE = 'false';
    process.env.NODE_ENV = 'test';

    super(config, context);

    this.global.process.env.DEBUG_MODE = 'false';
    this.global.process.env.NODE_ENV = 'test';
  }

  async setup() {
    await super.setup();

    this.global.process.env.DEBUG_MODE = 'false';
    this.global.process.env.NODE_ENV = 'test';

    try {
      const { setDebugMode } = require('@starbunk/shared');
      setDebugMode(false);
    } catch (error) {
      console.warn('[Custom Jest Environment] Debug mode setup failed:', error);
    }
  }

  async teardown() {
    // Explicit cleanup to prevent resource leaks
    try {
      // Attempt to import and use closeAllConnections if available
      let sharedModule;
      try {
        sharedModule = require('@starbunk/shared');
      } catch {
        console.warn('[Custom Jest Environment] Could not import shared module');
      }

      if (sharedModule && typeof sharedModule.closeAllConnections === 'function') {
        await sharedModule.closeAllConnections();
      }
    } catch (error) {
      console.warn('[Custom Jest Environment] Connection cleanup error:', error);
    }

    // Gracefully handle clearing timers
    try {
      const activeTimers = this.global.setTimeout._activeTimers || [];
      activeTimers.forEach(timer => {
        try {
          this.global.clearTimeout(timer);
        } catch (clearError) {
          console.warn('[Custom Jest Environment] Could not clear timer:', clearError);
        }
      });
    } catch (error) {
      console.warn('[Custom Jest Environment] Timer cleanup error:', error);
    }

    await super.teardown();
  }
}

module.exports = CustomTestEnvironment;
