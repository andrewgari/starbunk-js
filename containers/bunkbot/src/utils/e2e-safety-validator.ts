/**
 * E2E Safety Validator
 * 
 * CRITICAL SAFETY COMPONENT: Prevents live E2E tests from running in production
 * or sending messages to non-whitelisted servers/channels
 */

import { logger } from '@starbunk/shared';

export interface SafetyValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  environment: {
    nodeEnv: string;
    debugMode: boolean;
    testingEnabled: boolean;
    whitelistedServers: string[];
    whitelistedChannels: string[];
  };
}

export class E2ESafetyValidator {
  private static readonly REQUIRED_ENV_VARS = [
    'E2E_TEST_ENABLED',
    'TESTING_SERVER_IDS', 
    'TESTING_CHANNEL_IDS'
  ];

  private static readonly FORBIDDEN_PRODUCTION_VALUES = [
    '753251582719688714', // Starbunk Crusaders main server
    '696689954759245915', // Snowfall server
    '798613445301633134'  // Covadax server
  ];

  /**
   * Validates that the environment is safe for live E2E testing
   */
  static validateTestEnvironment(): SafetyValidationResult {
    const result: SafetyValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        debugMode: process.env.DEBUG_MODE === 'true',
        testingEnabled: process.env.E2E_TEST_ENABLED === 'true',
        whitelistedServers: this.getWhitelistedServers(),
        whitelistedChannels: this.getWhitelistedChannels()
      }
    };

    // Check if E2E testing is enabled
    if (!result.environment.testingEnabled) {
      result.errors.push('E2E_TEST_ENABLED is not set to true');
      result.isValid = false;
    }

    // Validate required environment variables
    for (const envVar of this.REQUIRED_ENV_VARS) {
      if (!process.env[envVar]) {
        result.errors.push(`Required environment variable ${envVar} is not set`);
        result.isValid = false;
      }
    }

    // Check for production environment
    if (result.environment.nodeEnv === 'production') {
      result.errors.push('Live E2E tests should not run in production environment');
      result.isValid = false;
    }

    // Validate debug mode is enabled
    if (!result.environment.debugMode) {
      result.warnings.push('DEBUG_MODE is not enabled - recommended for E2E testing');
    }

    // Check for forbidden production server IDs
    const forbiddenServers = result.environment.whitelistedServers.filter(
      serverId => this.FORBIDDEN_PRODUCTION_VALUES.includes(serverId)
    );
    
    if (forbiddenServers.length > 0) {
      result.errors.push(
        `Forbidden production server IDs detected: ${forbiddenServers.join(', ')}`
      );
      result.isValid = false;
    }

    // Validate whitelist configuration
    if (result.environment.whitelistedServers.length === 0) {
      result.errors.push('No whitelisted servers configured');
      result.isValid = false;
    }

    if (result.environment.whitelistedChannels.length === 0) {
      result.errors.push('No whitelisted channels configured');
      result.isValid = false;
    }

    // Check for placeholder values
    if (this.hasPlaceholderValues(result.environment)) {
      result.errors.push('Configuration contains placeholder values - update e2e-test-config.json');
      result.isValid = false;
    }

    return result;
  }

  /**
   * Validates that a specific server ID is whitelisted for testing
   */
  static isServerWhitelisted(serverId: string): boolean {
    const whitelistedServers = this.getWhitelistedServers();
    return whitelistedServers.includes(serverId);
  }

  /**
   * Validates that a specific channel ID is whitelisted for testing
   */
  static isChannelWhitelisted(channelId: string): boolean {
    const whitelistedChannels = this.getWhitelistedChannels();
    return whitelistedChannels.includes(channelId);
  }

  /**
   * Validates that a message can be sent to the specified channel
   */
  static canSendToChannel(serverId: string, channelId: string): boolean {
    return this.isServerWhitelisted(serverId) && this.isChannelWhitelisted(channelId);
  }

  /**
   * Gets the list of whitelisted server IDs
   */
  private static getWhitelistedServers(): string[] {
    const serverIds = process.env.TESTING_SERVER_IDS;
    return serverIds ? serverIds.split(',').map(id => id.trim()) : [];
  }

  /**
   * Gets the list of whitelisted channel IDs
   */
  private static getWhitelistedChannels(): string[] {
    const channelIds = process.env.TESTING_CHANNEL_IDS;
    return channelIds ? channelIds.split(',').map(id => id.trim()) : [];
  }

  /**
   * Checks if the test configuration contains placeholder values
   */
  private static hasPlaceholderValues(environment: { whitelistedServers: string[]; whitelistedChannels: string[] }): boolean {
    const placeholders = [
      'REPLACE_WITH_YOUR_TEST_SERVER_ID',
      'REPLACE_WITH_YOUR_TEST_CHANNEL_ID_1',
      'REPLACE_WITH_YOUR_TEST_CHANNEL_ID_2',
      'REPLACE_WITH_YOUR_USER_ID_FOR_WEBHOOK',
      '123456789012345678'
    ];

    const allValues = [
      ...environment.whitelistedServers,
      ...environment.whitelistedChannels
    ];

    return allValues.some(value => placeholders.includes(value));
  }

  /**
   * Logs the safety validation results
   */
  static logValidationResults(result: SafetyValidationResult): void {
    if (result.isValid) {
      logger.info('🔒 E2E Safety validation passed');
      logger.info(`   Environment: ${result.environment.nodeEnv}`);
      logger.info(`   Debug Mode: ${result.environment.debugMode}`);
      logger.info(`   Whitelisted Servers: ${result.environment.whitelistedServers.length}`);
      logger.info(`   Whitelisted Channels: ${result.environment.whitelistedChannels.length}`);
    } else {
      logger.error('🚨 E2E Safety validation FAILED');
      result.errors.forEach(error => logger.error(`   ERROR: ${error}`));
    }

    if (result.warnings.length > 0) {
      result.warnings.forEach(warning => logger.warn(`   WARNING: ${warning}`));
    }
  }

  /**
   * Throws an error if the environment is not safe for E2E testing
   */
  static enforceTestSafety(): void {
    const validation = this.validateTestEnvironment();
    this.logValidationResults(validation);

    if (!validation.isValid) {
      throw new Error(
        `E2E testing environment is not safe. Errors: ${validation.errors.join(', ')}`
      );
    }
  }
}

/**
 * Middleware function to validate safety before any E2E test operations
 */
export function requireSafeTestEnvironment(): void {
  E2ESafetyValidator.enforceTestSafety();
}

/**
 * Decorator for test functions that require safety validation
 */
export function SafeE2ETest(target: unknown, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;

  descriptor.value = function (...args: unknown[]) {
    requireSafeTestEnvironment();
    return method.apply(this, args);
  };

  return descriptor;
}
