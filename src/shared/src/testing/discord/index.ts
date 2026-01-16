/**
 * Fake Discord testing utilities
 * Provides a complete fake Discord environment for e2e testing without connecting to Discord
 */

export { FakeDiscordClient } from './fake-discord-client';
export { FakeDiscordEnvironment } from './fake-discord-environments';
export type { FakeDiscordEnvironmentConfig } from './fake-discord-environments';
export { MessageCapture } from './message-capture';
export type { CapturedMessage } from './message-capture';
