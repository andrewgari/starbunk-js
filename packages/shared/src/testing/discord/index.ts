/**
 * Fake Discord testing utilities
 * Provides a complete fake Discord environment for e2e testing without connecting to Discord
 */

export { FakeDiscordClient } from './FakeDiscordClient';
export { FakeDiscordEnvironment } from './FakeDiscordEnvironment';
export type { FakeDiscordEnvironmentConfig } from './FakeDiscordEnvironment';
export { MessageCapture } from './MessageCapture';
export type { CapturedMessage } from './MessageCapture';
