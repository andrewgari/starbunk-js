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

import {
  disconnectVoiceConnection,
  subscribePlayerToConnection,
  createVoiceConnection,
  getGuildVoiceConnection,
  validateVoiceChannelAccess,
  canJoinVoiceChannel,
} from '../src/utils/voice-utils';

describe('voice-utils subscription lifecycle', () => {
  beforeEach(() => {
    vi.mocked(Voice.getVoiceConnection).mockReset();
    vi.mocked(Voice.joinVoiceChannel).mockReset();
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

  it('disconnectVoiceConnection is a no-op when no connection exists', () => {
    vi.mocked(Voice.getVoiceConnection).mockReturnValue(undefined as any);

    // Should not throw when there is no active connection for the guild
    disconnectVoiceConnection('missing-guild-id');
  });

  it('disconnectVoiceConnection logs an error when destroy throws', () => {
    const error = new Error('destroy failed');
    const connection = {
      destroy: vi.fn(() => {
        throw error;
      }),
    } as any;

    vi.mocked(Voice.getVoiceConnection).mockReturnValue(connection as any);

    // The error is handled internally and should not escape
    disconnectVoiceConnection('error-guild-id');

    expect(connection.destroy).toHaveBeenCalledTimes(1);
  });

  it('subscribePlayerToConnection returns undefined when subscribe returns falsy', () => {
    const connection = {
      subscribe: vi.fn().mockReturnValue(undefined),
    } as any;

    const player: unknown = {};
    const result = subscribePlayerToConnection(connection, player as any);

    expect(connection.subscribe).toHaveBeenCalledTimes(1);
    expect(result).toBeUndefined();
  });

  it('subscribePlayerToConnection returns undefined when subscribe throws', () => {
    const connection = {
      subscribe: vi.fn(() => {
        throw new Error('subscription failed');
      }),
    } as any;

    const player: unknown = {};
    const result = subscribePlayerToConnection(connection, player as any);

    expect(connection.subscribe).toHaveBeenCalledTimes(1);
    expect(result).toBeUndefined();
  });

  it('createVoiceConnection joins channel when no existing connection', () => {
    const connection = {
      on: vi.fn(),
    } as any;

    vi.mocked(Voice.getVoiceConnection).mockReturnValue(undefined as any);
    vi.mocked(Voice.joinVoiceChannel).mockReturnValue(connection as any);

    const channel = {
      id: 'channel-1',
      name: 'Music',
      guild: { id: 'guild-1', voiceAdapterCreator: {} },
      permissionsFor: vi.fn(),
    } as any;

    const result = createVoiceConnection(channel, channel.guild.voiceAdapterCreator);

    expect(Voice.joinVoiceChannel).toHaveBeenCalledWith({
      channelId: 'channel-1',
      guildId: 'guild-1',
      adapterCreator: channel.guild.voiceAdapterCreator,
    });
    expect(connection.on).toHaveBeenCalled();

    // Execute all registered event handlers to exercise logging callbacks
    const onCalls = (connection.on as any).mock.calls as [string, (...args: any[]) => void][];
    const handlers: Record<string, (...args: any[]) => void> = {};
    for (const [event, handler] of onCalls) {
      handlers[event] = handler;
    }

    handlers[Voice.VoiceConnectionStatus.Ready]?.();
    handlers[Voice.VoiceConnectionStatus.Disconnected]?.();
    handlers[Voice.VoiceConnectionStatus.Destroyed]?.();
    handlers[Voice.VoiceConnectionStatus.Connecting]?.();
    handlers[Voice.VoiceConnectionStatus.Signalling]?.();
    handlers['error']?.(new Error('test error'));
    handlers['stateChange']?.({ status: 'old' }, { status: 'new' });
    expect(result).toBe(connection);
  });

  it('createVoiceConnection reuses existing connection in same channel', () => {
    const existingConnection = {
      joinConfig: { channelId: 'channel-1' },
      destroy: vi.fn(),
      on: vi.fn(),
    } as any;

    vi.mocked(Voice.getVoiceConnection).mockReturnValue(existingConnection as any);

    const channel = {
      id: 'channel-1',
      name: 'Music',
      guild: { id: 'guild-1', voiceAdapterCreator: {} },
      permissionsFor: vi.fn(),
    } as any;

    const result = createVoiceConnection(channel, channel.guild.voiceAdapterCreator);

    expect(Voice.joinVoiceChannel).not.toHaveBeenCalled();
    expect(existingConnection.destroy).not.toHaveBeenCalled();
    expect(result).toBe(existingConnection);
  });

  it('createVoiceConnection destroys existing connection in different channel before joining new one', () => {
    const existingConnection = {
      joinConfig: { channelId: 'other-channel' },
      destroy: vi.fn(),
      on: vi.fn(),
    } as any;

    const newConnection = {
      on: vi.fn(),
    } as any;

    vi.mocked(Voice.getVoiceConnection).mockReturnValue(existingConnection as any);
    vi.mocked(Voice.joinVoiceChannel).mockReturnValue(newConnection as any);

    const channel = {
      id: 'channel-2',
      name: 'Other',
      guild: { id: 'guild-1', voiceAdapterCreator: {} },
      permissionsFor: vi.fn(),
    } as any;

    const result = createVoiceConnection(channel, channel.guild.voiceAdapterCreator);

    expect(existingConnection.destroy).toHaveBeenCalledTimes(1);
    expect(Voice.joinVoiceChannel).toHaveBeenCalledTimes(1);
    expect(result).toBe(newConnection);
  });

  it('getGuildVoiceConnection returns existing connection', () => {
    const connection = { id: 'conn-1' } as any;
    vi.mocked(Voice.getVoiceConnection).mockReturnValue(connection as any);

    const result = getGuildVoiceConnection('guild-1');

    expect(Voice.getVoiceConnection).toHaveBeenCalledWith('guild-1');
    expect(result).toBe(connection);
  });

  describe('validateVoiceChannelAccess', () => {
    it('returns error when not in a guild', () => {
      const result = validateVoiceChannelAccess({
        guild: null,
        channelId: 'channel',
        member: undefined,
      } as any);

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('This command can only be used in a server.');
    });

    it('returns error when member is missing', () => {
      const result = validateVoiceChannelAccess({
        guild: { id: 'guild-1' },
        channelId: 'channel',
      } as any);

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Could not find your server membership.');
    });

    it('returns error when member is not in a voice channel', () => {
      const interaction = {
        guild: { id: 'guild-1' },
        channelId: 'channel',
        member: { voice: { channel: null } },
      } as any;

      const result = validateVoiceChannelAccess(interaction);

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('You need to be in a voice channel to use this command.');
    });

    it('returns member and voice channel when validation passes', () => {
      const voiceChannel = { id: 'channel-1' } as any;
      const member = { voice: { channel: voiceChannel } } as any;
      const interaction = {
        guild: { id: 'guild-1' },
        channelId: 'channel-1',
        member,
      } as any;

      const result = validateVoiceChannelAccess(interaction);

      expect(result.isValid).toBe(true);
      expect(result.member).toBe(member);
      expect(result.voiceChannel).toBe(voiceChannel);
    });
  });

  describe('canJoinVoiceChannel', () => {
    it('returns true when permissions allow connecting and speaking', () => {
      const permissions = { has: vi.fn().mockReturnValue(true) };
      const channel = {
        permissionsFor: vi.fn().mockReturnValue(permissions),
      } as any;
      const botMember = {} as any;

      const result = canJoinVoiceChannel(channel, botMember);

      expect(result).toBe(true);
      expect(permissions.has).toHaveBeenCalledWith(['Connect', 'Speak']);
    });

    it('returns false when permissions are missing', () => {
      const permissions = { has: vi.fn().mockReturnValue(false) };
      const channel = {
        permissionsFor: vi.fn().mockReturnValue(permissions),
      } as any;
      const botMember = {} as any;

      const result = canJoinVoiceChannel(channel, botMember);

      expect(result).toBe(false);
    });

    it('returns false when permissionsFor returns null', () => {
      const channel = {
        permissionsFor: vi.fn().mockReturnValue(null),
      } as any;
      const botMember = {} as any;

      const result = canJoinVoiceChannel(channel, botMember);

      expect(result).toBe(false);
    });
  });
});
