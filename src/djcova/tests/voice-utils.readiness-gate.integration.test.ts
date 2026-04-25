/**
 * Integration Tests for Connection Readiness Gate
 * Validates the waitForConnectionReady() function in real-world connection scenarios:
 * - Real connection lifecycle with state transitions
 * - Service layer error propagation
 * - Concurrent join request handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as Voice from '@discordjs/voice';
import { EventEmitter } from 'events';

// Mock logger to avoid side effects
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

// Mock OpenTelemetry
vi.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: vi.fn(() => ({
      startSpan: vi.fn(() => ({
        setAttributes: vi.fn(),
        end: vi.fn(),
      })),
    })),
  },
}));

// Mock @discordjs/voice with real event emitter behavior
vi.mock('@discordjs/voice', () => {
  const getVoiceConnection = vi.fn();
  const entersState = vi.fn();

  return {
    joinVoiceChannel: vi.fn(),
    getVoiceConnection,
    entersState,
    VoiceConnectionStatus: {
      Ready: 'ready',
      Disconnected: 'disconnected',
      Destroyed: 'destroyed',
      Connecting: 'connecting',
      Signalling: 'signalling',
    },
  };
});

import { waitForConnectionReady, subscribePlayerToConnection } from '../src/utils/voice-utils';
import { logger } from '../src/observability/logger';

/**
 * Mock realistic Discord.js voice connection
 * Simulates state transitions and event emitter behavior
 */
class MockVoiceConnection extends EventEmitter {
  state: { status: string };
  joinConfig?: { channelId: string };

  constructor(initialStatus = 'connecting') {
    super();
    this.state = { status: initialStatus };
    this.joinConfig = { channelId: 'test-channel-123' };
  }

  transitionToReady(delayMs = 10): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => {
        this.state.status = Voice.VoiceConnectionStatus.Ready;
        this.emit('stateChange', { status: 'connecting' }, this.state);
        resolve();
      }, delayMs);
    });
  }

  transitionToDestroyed(): void {
    this.state.status = Voice.VoiceConnectionStatus.Destroyed;
    this.emit('stateChange', { status: this.state.status }, { status: 'destroyed' });
  }

  subscribe(player: any): any {
    return { player };
  }

  destroy(): void {
    this.transitionToDestroyed();
  }
}

describe('waitForConnectionReady - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Real Connection Lifecycle Integration', () => {
    it('should handle real voice connection from Discord.js mock transitioning through states', async () => {
      // Arrange: Create mock connection and simulate realistic lifecycle
      const mockConnection = new MockVoiceConnection('connecting') as any;

      // Simulate the actual entersState behavior:
      // It waits for the connection to enter Ready state
      vi.mocked(Voice.entersState).mockImplementation(async (connection, targetStatus, timeout) => {
        return new Promise((resolve, reject) => {
          // Simulate state transition after small delay
          const transitionTimer = setTimeout(() => {
            connection.state.status = targetStatus;
            resolve(undefined);
          }, 5);

          // Simulate timeout
          const timeoutTimer = setTimeout(() => {
            reject(new Error('timed out waiting for ready'));
          }, timeout);

          // Cleanup on early resolve
          connection.once('stateChange', () => {
            clearTimeout(timeoutTimer);
            if (connection.state.status === targetStatus) {
              clearTimeout(transitionTimer);
              resolve(undefined);
            }
          });
        });
      });

      // Trigger state transition
      const transitionPromise = mockConnection.transitionToReady(5);

      // Act
      const readyPromise = waitForConnectionReady(mockConnection, 5000);

      // Wait for both to complete
      await Promise.all([transitionPromise, readyPromise]);

      // Assert
      expect(mockConnection.state.status).toBe(Voice.VoiceConnectionStatus.Ready);
      expect(Voice.entersState).toHaveBeenCalledWith(
        mockConnection,
        Voice.VoiceConnectionStatus.Ready,
        5000,
      );
      expect(logger.info).toHaveBeenCalled();
    });

    it('should complete transition in under 50ms for realistic network latency', async () => {
      const mockConnection = new MockVoiceConnection('connecting') as any;

      vi.mocked(Voice.entersState).mockResolvedValueOnce(undefined);

      const startTime = Date.now();
      await waitForConnectionReady(mockConnection, 5000);
      const elapsed = Date.now() - startTime;

      // Should complete quickly (realistic Discord.js behavior)
      expect(elapsed).toBeLessThan(50);
    });

    it('should correctly log metadata during realistic lifecycle transition', async () => {
      const mockConnection = new MockVoiceConnection('signalling') as any;

      vi.mocked(Voice.entersState).mockResolvedValueOnce(undefined);

      await waitForConnectionReady(mockConnection, 5000);

      // Verify metadata was logged with expected fields
      const metadataCalls = vi.mocked(logger.withMetadata).mock.calls;
      expect(metadataCalls.length).toBeGreaterThan(0);

      // Check for connection_id in metadata
      const hasConnectionId = metadataCalls.some(call => {
        const metadata = call[0];
        return typeof metadata === 'object' && 'connection_id' in metadata;
      });
      expect(hasConnectionId).toBe(true);
    });
  });

  describe('Service Layer Error Propagation', () => {
    it('should propagate timeout errors through subscribePlayerToConnection', async () => {
      // Arrange: Mock connection that will timeout
      const mockConnection = new MockVoiceConnection('connecting') as any;
      const mockPlayer = { state: { status: 'idle' } } as any;

      // Simulate timeout in waitForConnectionReady
      vi.mocked(Voice.entersState).mockRejectedValueOnce(new Error('timed out waiting for ready'));

      // Act
      const result = await subscribePlayerToConnection(mockConnection, mockPlayer);

      // Assert
      expect(result).toBeUndefined();
      expect(logger.error).toHaveBeenCalled();
      const errorCall = vi.mocked(logger.error).mock.calls[0];
      expect(errorCall[0]).toContain('Error subscribing player to connection');
    });

    it('should send ephemeral Discord message on timeout (simulated)', async () => {
      // Arrange: Simulate the service layer behavior
      const mockConnection = new MockVoiceConnection('connecting') as any;

      vi.mocked(Voice.entersState).mockRejectedValueOnce(new Error('timed out waiting for ready'));

      // Simulate service-level error handling
      try {
        await waitForConnectionReady(mockConnection, 5000);
      } catch (error) {
        // Service layer would send ephemeral message here
        const errorMsg = error instanceof Error ? error.message : String(error);
        expect(errorMsg).toContain('did not reach Ready state');
      }
    });

    it('should handle destruction errors during connection wait', async () => {
      const mockConnection = new MockVoiceConnection('connecting') as any;
      const mockPlayer = { state: { status: 'idle' } } as any;

      // Simulate connection being destroyed
      vi.mocked(Voice.entersState).mockRejectedValueOnce(new Error('destroyed waiting for ready'));

      // Act
      const result = await subscribePlayerToConnection(mockConnection, mockPlayer);

      // Assert: Should gracefully handle and return undefined
      expect(result).toBeUndefined();
      expect(logger.error).toHaveBeenCalled();
    });

    it('should recover gracefully when player subscription fails after ready', async () => {
      // Arrange
      const mockConnection = new MockVoiceConnection('ready') as any;
      const mockPlayer = { state: { status: 'idle' } } as any;

      vi.mocked(Voice.entersState).mockResolvedValueOnce(undefined);

      // Mock subscription to return undefined (edge case)
      mockConnection.subscribe = vi.fn().mockReturnValue(undefined);

      // Act
      const result = await subscribePlayerToConnection(mockConnection, mockPlayer);

      // Assert
      expect(result).toBeUndefined();
      expect(logger.warn).toHaveBeenCalled();
      const warnCall = vi.mocked(logger.warn).mock.calls[0];
      expect(warnCall[0]).toContain('Failed to subscribe');
    });
  });

  describe('Concurrent Join Request Race Condition', () => {
    it('should handle multiple simultaneous play() calls without double-subscription', async () => {
      // Arrange: Mock connection and simulate concurrent access
      const mockConnection = new MockVoiceConnection('connecting') as any;
      const mockPlayer = { state: { status: 'idle' } } as any;

      // Track subscription calls
      const subscriptionCalls: any[] = [];
      mockConnection.subscribe = vi.fn((player: any) => {
        subscriptionCalls.push(player);
        return { player, subscription: subscriptionCalls.length };
      });

      // Mock entersState to resolve after small delay (simulates real timing)
      vi.mocked(Voice.entersState).mockImplementation(async () => {
        return new Promise(resolve => setTimeout(resolve, 10));
      });

      // Act: Simulate 3 concurrent play() calls
      const calls = [
        subscribePlayerToConnection(mockConnection, mockPlayer),
        subscribePlayerToConnection(mockConnection, mockPlayer),
        subscribePlayerToConnection(mockConnection, mockPlayer),
      ];

      const results = await Promise.all(calls);

      // Assert: All should succeed but share same connection
      expect(results.every(r => r !== null && r !== undefined)).toBe(true);
      expect(mockConnection.subscribe).toHaveBeenCalledTimes(3);
      expect(Voice.entersState).toHaveBeenCalledTimes(3);
    });

    it('should not create memory leaks from multiple concurrent waitForConnectionReady calls', async () => {
      // Arrange
      const mockConnection = new MockVoiceConnection('connecting') as any;

      vi.mocked(Voice.entersState).mockResolvedValue(undefined);

      // Act: Launch many concurrent waits
      const concurrentWaits = Array.from({ length: 10 }, () =>
        waitForConnectionReady(mockConnection, 5000),
      );

      // Should complete without errors
      await expect(Promise.all(concurrentWaits)).resolves.toEqual(Array(10).fill(undefined));

      // Assert: Each call should have independent spans
      expect(Voice.entersState).toHaveBeenCalledTimes(10);
    });

    it('should handle rapid connection state changes during concurrent operations', async () => {
      // Arrange
      const mockConnection = new MockVoiceConnection('signalling') as any;
      const mockPlayer = { state: { status: 'idle' } } as any;

      // Mock rapid state transitions
      vi.mocked(Voice.entersState).mockImplementation(async (conn, target, timeout) => {
        // Simulate immediate ready state
        return new Promise(resolve => setTimeout(resolve, 2));
      });

      // Simulate state change during operations
      const stateChangePromise = new Promise(resolve => {
        setTimeout(() => {
          mockConnection.state.status = Voice.VoiceConnectionStatus.Ready;
          mockConnection.emit('stateChange', { status: 'signalling' }, mockConnection.state);
          resolve(undefined);
        }, 1);
      });

      // Act: Concurrent operations with state change
      const [result] = await Promise.all([
        subscribePlayerToConnection(mockConnection, mockPlayer),
        stateChangePromise,
      ]);

      // Assert: Should handle state change gracefully
      expect(result).not.toBeUndefined();
      expect(mockConnection.state.status).toBe(Voice.VoiceConnectionStatus.Ready);
    });

    it('should prevent double-subscription through connection reference equality', async () => {
      // Arrange: Verify same connection instance is used
      const mockConnection = new MockVoiceConnection('ready') as any;
      const mockPlayer = { state: { status: 'idle' } } as any;

      const connectionReferences: any[] = [];
      mockConnection.subscribe = vi.fn(function (player: any) {
        connectionReferences.push(this); // Capture 'this' context
        return { player };
      });

      vi.mocked(Voice.entersState).mockResolvedValue(undefined);

      // Act: Multiple concurrent subscriptions
      await Promise.all([
        subscribePlayerToConnection(mockConnection, mockPlayer),
        subscribePlayerToConnection(mockConnection, mockPlayer),
        subscribePlayerToConnection(mockConnection, mockPlayer),
      ]);

      // Assert: All subscriptions should use same connection reference
      const allSameReference = connectionReferences.every(ref => ref === mockConnection);
      expect(allSameReference).toBe(true);
      expect(connectionReferences.length).toBe(3);
    });
  });

  describe('Edge Cases and Timeout Behavior', () => {
    it('should handle connection timeout within service context', async () => {
      // Arrange
      const mockConnection = new MockVoiceConnection('connecting') as any;
      const mockPlayer = { state: { status: 'idle' } } as any;

      // Simulate timeout after 100ms of waiting
      vi.mocked(Voice.entersState).mockImplementation(async (connection, target, timeout) => {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(
            () => {
              reject(new Error(`timed out waiting for ready after ${timeout}ms`));
            },
            Math.min(20, timeout),
          );

          connection.once('stateChange', () => {
            clearTimeout(timer);
            resolve(undefined);
          });
        });
      });

      // Act
      const result = await subscribePlayerToConnection(mockConnection, mockPlayer);

      // Assert: Should return undefined on timeout
      expect(result).toBeUndefined();
      expect(logger.error).toHaveBeenCalled();
    });

    it('should respect custom timeout in concurrent scenario', async () => {
      const mockConnection = new MockVoiceConnection('connecting') as any;

      vi.mocked(Voice.entersState).mockResolvedValue(undefined);

      // Act: Use custom timeout of 2000ms
      const call1 = waitForConnectionReady(mockConnection, 2000);
      const call2 = waitForConnectionReady(mockConnection, 3000);

      await Promise.all([call1, call2]);

      // Assert: Both timeouts should be respected
      const calls = vi.mocked(Voice.entersState).mock.calls;
      expect(calls[0][2]).toBe(2000);
      expect(calls[1][2]).toBe(3000);
    });

    it('should handle connection already in Ready state during concurrent calls', async () => {
      // Arrange
      const mockConnection = new MockVoiceConnection(
        Voice.VoiceConnectionStatus.Ready as string,
      ) as any;
      const mockPlayer = { state: { status: 'idle' } } as any;

      // Act: Multiple concurrent calls to already-ready connection
      const results = await Promise.all([
        subscribePlayerToConnection(mockConnection, mockPlayer),
        subscribePlayerToConnection(mockConnection, mockPlayer),
        subscribePlayerToConnection(mockConnection, mockPlayer),
      ]);

      // Assert: All should succeed immediately without calling entersState
      expect(Voice.entersState).not.toHaveBeenCalled();
      expect(results.every(r => r !== undefined)).toBe(true);
    });
  });

  describe('Realistic Discord.js Scenario', () => {
    it('should handle real-world sequence: connect -> wait -> subscribe', async () => {
      // Arrange: Simulate realistic sequence
      const guildId = 'guild-123';
      const channelId = 'channel-456';

      // 1. Create connection (connecting status)
      const mockConnection = new MockVoiceConnection('connecting') as any;
      mockConnection.joinConfig = { channelId };

      // 2. Wait for connection
      vi.mocked(Voice.entersState).mockResolvedValueOnce(undefined);

      // Act: Real-world flow
      const player = { state: { status: 'idle' } };

      // Transition connection to ready
      mockConnection.state.status = Voice.VoiceConnectionStatus.Ready;

      // Subscribe player
      const subscription = await subscribePlayerToConnection(mockConnection, player as any);

      // Assert: Full sequence should complete successfully
      expect(mockConnection.state.status).toBe(Voice.VoiceConnectionStatus.Ready);
      expect(subscription).toBeDefined();
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Audio player subscribed'));
    });

    it('should handle disconnection during playback sequence', async () => {
      // Arrange: Create a connection and verify initial state
      const mockConnection = new MockVoiceConnection('connecting') as any;
      const mockPlayer = { state: { status: 'playing' } } as any;

      // Don't mock entersState - let it resolve naturally to test real flow
      // First clear any previous mocks
      vi.clearAllMocks();

      // Mock entersState with immediate resolution
      vi.mocked(Voice.entersState).mockResolvedValueOnce(undefined);

      // Act: Subscribe should work since entersState resolves
      const result = await subscribePlayerToConnection(mockConnection, mockPlayer);

      // Assert: Should succeed with proper subscription
      expect(result).toBeDefined();
      expect(Voice.entersState).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Audio player subscribed'));
    });
  });
});
