/**
 * Voice connection subscription cleanup tests
 * Verifies that destroying a voice connection via disconnectVoiceConnection
 * causes all player subscriptions to be unsubscribed.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Voice from '@discordjs/voice';

// Mock logger to keep tests isolated and avoid real logging side effects
vi.mock('../src/observability/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    withError: vi.fn().mockReturnThis(),
    withMetadata: vi.fn().mockReturnThis(),
  },
}));

// Stub @discordjs/voice so voice-utils can import it without touching real Discord voice internals
vi.mock('@discordjs/voice', () => {
  const getVoiceConnection = vi.fn();

  return {
    joinVoiceChannel: vi.fn(),
    getVoiceConnection,
    VoiceConnectionStatus: {
      Ready: 'ready',
      Disconnected: 'disconnected',
      Destroyed: 'destroyed',
      Connecting: 'connecting',
      Signalling: 'signalling',
    },
  };
});

import { disconnectVoiceConnection, subscribePlayerToConnection } from '../src/utils/voice-utils';

describe('voice-utils subscription lifecycle', () => {
  beforeEach(() => {
    vi.mocked(Voice.getVoiceConnection).mockReset();
  });

  it('disconnectVoiceConnection destroys the connection and unsubscribes subscriptions', () => {
    type Subscription = { isActive: boolean; unsubscribe: () => void };

    const subscription1: Subscription = {
      isActive: true,
      unsubscribe: () => {},
    };
    subscription1.unsubscribe = vi.fn(() => {
      subscription1.isActive = false;
    });

    const subscription2: Subscription = {
      isActive: true,
      unsubscribe: () => {},
    };
    subscription2.unsubscribe = vi.fn(() => {
      subscription2.isActive = false;
    });

    const connection = {
      // Simulate two sequential subscriptions on the same connection
      subscribe: vi.fn().mockReturnValueOnce(subscription1).mockReturnValueOnce(subscription2),
      // When the connection is destroyed, underlying library is expected to
      // clean up all subscriptions. We model that here and assert on it.
      destroy: vi.fn(() => {
        if (subscription1.isActive) subscription1.unsubscribe();
        if (subscription2.isActive) subscription2.unsubscribe();
      }),
    } as any;

    // Voice-utils will obtain the connection via getVoiceConnection
    vi.mocked(Voice.getVoiceConnection).mockReturnValue(connection as any);

    const player: unknown = {};
    const returned1 = subscribePlayerToConnection(connection, player as any);
    const returned2 = subscribePlayerToConnection(connection, player as any);

    expect(connection.subscribe).toHaveBeenCalledTimes(2);
    expect(returned1).toBe(subscription1);
    expect(returned2).toBe(subscription2);
    expect(subscription1.isActive).toBe(true);
    expect(subscription2.isActive).toBe(true);

    // Act: disconnect should destroy the connection and trigger subscription cleanup
    disconnectVoiceConnection('test-guild-id');

    expect(connection.destroy).toHaveBeenCalledTimes(1);
    expect(subscription1.unsubscribe).toHaveBeenCalled();
    expect(subscription2.unsubscribe).toHaveBeenCalled();
    expect(subscription1.isActive).toBe(false);
    expect(subscription2.isActive).toBe(false);
  });
});
