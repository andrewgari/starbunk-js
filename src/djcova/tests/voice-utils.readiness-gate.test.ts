/**
 * Connection Readiness Gate Tests
 * Validates the waitForConnectionReady() function behavior:
 * - Successful ready transition
 * - Already ready connections
 * - Timeout scenarios
 * - Connection destroyed during wait
 * - Custom timeout values
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as Voice from '@discordjs/voice';

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

// Stub @discordjs/voice
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

import { waitForConnectionReady } from '../src/utils/voice-utils';
import { logger } from '../src/observability/logger';

describe('waitForConnectionReady - Connection Readiness Gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Successful Ready Transition', () => {
    it('should resolve when connection reaches Ready state', async () => {
      // Arrange: Mock connection that will reach Ready
      const mockConnection = {
        state: { status: 'connecting' },
      } as any;

      // Mock entersState to resolve successfully
      vi.mocked(Voice.entersState).mockResolvedValueOnce(undefined);

      // Act
      await expect(waitForConnectionReady(mockConnection, 5000)).resolves.toBeUndefined();

      // Assert
      expect(Voice.entersState).toHaveBeenCalledWith(
        mockConnection,
        Voice.VoiceConnectionStatus.Ready,
        5000,
      );
      expect(logger.info).toHaveBeenCalled();
      const infoCall = vi.mocked(logger.info).mock.calls[0];
      expect(infoCall[0]).toContain('Ready');
    });

    it('should log wait duration in milliseconds', async () => {
      const mockConnection = {
        state: { status: 'signalling' },
      } as any;

      vi.mocked(Voice.entersState).mockResolvedValueOnce(undefined);

      await waitForConnectionReady(mockConnection, 5000);

      expect(logger.withMetadata).toHaveBeenCalled();
      // Verify withMetadata was called with wait_duration_ms
      const calls = vi.mocked(logger.withMetadata).mock.calls;
      const hasWaitDuration = calls.some(call => {
        const metadata = call[0];
        return typeof metadata === 'object' && 'wait_duration_ms' in metadata;
      });
      expect(hasWaitDuration).toBe(true);
    });
  });

  describe('Already Ready Connection', () => {
    it('should return immediately if connection is already Ready', async () => {
      // Arrange: Connection already in Ready state
      const mockConnection = {
        state: { status: Voice.VoiceConnectionStatus.Ready },
      } as any;

      // Act
      await expect(waitForConnectionReady(mockConnection, 5000)).resolves.toBeUndefined();

      // Assert: entersState should NOT be called
      expect(Voice.entersState).not.toHaveBeenCalled();

      // Should still log success
      expect(logger.debug).toHaveBeenCalled();
      const debugCall = vi.mocked(logger.debug).mock.calls[0];
      expect(debugCall[0]).toContain('already');
    });

    it('should have zero wait duration for already-ready connection', async () => {
      const mockConnection = {
        state: { status: Voice.VoiceConnectionStatus.Ready },
      } as any;

      await waitForConnectionReady(mockConnection, 5000);

      expect(logger.withMetadata).toHaveBeenCalled();
      // Check that metadata includes wait_duration_ms close to 0
      const calls = vi.mocked(logger.withMetadata).mock.calls;
      const hasMetadata = calls.some(call => {
        const metadata = call[0];
        return (
          typeof metadata === 'object' &&
          'wait_duration_ms' in metadata &&
          (metadata as any).wait_duration_ms < 50 // Should be nearly instant
        );
      });
      expect(hasMetadata).toBe(true);
    });
  });

  describe('Timeout Scenario', () => {
    it('should reject with timeout error when connection does not reach Ready', async () => {
      const mockConnection = {
        state: { status: 'connecting' },
      } as any;

      // Mock entersState to reject with timeout error
      vi.mocked(Voice.entersState).mockRejectedValueOnce(new Error('timed out waiting for ready'));

      // Act & Assert
      await expect(waitForConnectionReady(mockConnection, 5000)).rejects.toThrow(
        /did not reach Ready state/i,
      );

      // Should log timeout
      expect(logger.warn).toHaveBeenCalled();
      const warnCall = vi.mocked(logger.warn).mock.calls[0];
      expect(warnCall[0]).toContain('5000ms');
    });

    it('should respect custom timeout values', async () => {
      const mockConnection = {
        state: { status: 'connecting' },
      } as any;

      vi.mocked(Voice.entersState).mockRejectedValueOnce(new Error('timed out waiting for ready'));

      // Act: Use custom timeout of 3000ms
      await expect(waitForConnectionReady(mockConnection, 3000)).rejects.toThrow();

      // Assert: entersState should be called with custom timeout
      expect(Voice.entersState).toHaveBeenCalledWith(
        mockConnection,
        Voice.VoiceConnectionStatus.Ready,
        3000,
      );
    });

    it('should log timeout with error metadata', async () => {
      const mockConnection = {
        state: { status: 'connecting' },
      } as any;

      vi.mocked(Voice.entersState).mockRejectedValueOnce(new Error('timed out waiting for ready'));

      await expect(waitForConnectionReady(mockConnection, 5000)).rejects.toThrow();

      expect(logger.withMetadata).toHaveBeenCalled();
      // Verify error_type is 'timeout'
      const calls = vi.mocked(logger.withMetadata).mock.calls;
      const hasTimeoutError = calls.some(call => {
        const metadata = call[0];
        return typeof metadata === 'object' && (metadata as any).error_type === 'timeout';
      });
      expect(hasTimeoutError).toBe(true);
    });

    it('should use 5 second default timeout', async () => {
      const mockConnection = {
        state: { status: 'connecting' },
      } as any;

      vi.mocked(Voice.entersState).mockResolvedValueOnce(undefined);

      // Call without specifying timeout (should default to 5000)
      await waitForConnectionReady(mockConnection);

      // Assert: Default should be 5000ms
      expect(Voice.entersState).toHaveBeenCalledWith(
        mockConnection,
        Voice.VoiceConnectionStatus.Ready,
        5000,
      );
    });
  });

  describe('Connection Destroyed During Wait', () => {
    it('should reject with destroyed error when connection is destroyed', async () => {
      const mockConnection = {
        state: { status: 'connecting' },
      } as any;

      // Mock entersState to reject with destroyed error
      vi.mocked(Voice.entersState).mockRejectedValueOnce(new Error('destroyed waiting for ready'));

      // Act & Assert
      await expect(waitForConnectionReady(mockConnection, 5000)).rejects.toThrow(/destroyed/i);

      // Should log destroyed
      expect(logger.warn).toHaveBeenCalled();
      const warnCall = vi.mocked(logger.warn).mock.calls[0];
      expect(warnCall[0]).toContain('destroyed');
    });

    it('should mark error type as destroyed in logging', async () => {
      const mockConnection = {
        state: { status: 'connecting' },
      } as any;

      vi.mocked(Voice.entersState).mockRejectedValueOnce(new Error('destroyed waiting for ready'));

      await expect(waitForConnectionReady(mockConnection, 5000)).rejects.toThrow();

      expect(logger.withMetadata).toHaveBeenCalled();
      // Verify error_type is 'destroyed'
      const calls = vi.mocked(logger.withMetadata).mock.calls;
      const hasDestroyedError = calls.some(call => {
        const metadata = call[0];
        return typeof metadata === 'object' && (metadata as any).error_type === 'destroyed';
      });
      expect(hasDestroyedError).toBe(true);
    });

    it('should log cleanup actions when destroyed', async () => {
      const mockConnection = {
        state: { status: 'connecting' },
      } as any;

      vi.mocked(Voice.entersState).mockRejectedValueOnce(new Error('destroyed waiting for ready'));

      await expect(waitForConnectionReady(mockConnection, 5000)).rejects.toThrow();

      // Should log the destruction
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('Custom Timeout Values', () => {
    it('should support very short timeout (100ms)', async () => {
      const mockConnection = {
        state: { status: 'connecting' },
      } as any;

      vi.mocked(Voice.entersState).mockResolvedValueOnce(undefined);

      await waitForConnectionReady(mockConnection, 100);

      expect(Voice.entersState).toHaveBeenCalledWith(
        mockConnection,
        Voice.VoiceConnectionStatus.Ready,
        100,
      );
    });

    it('should support longer timeout (30000ms)', async () => {
      const mockConnection = {
        state: { status: 'connecting' },
      } as any;

      vi.mocked(Voice.entersState).mockResolvedValueOnce(undefined);

      await waitForConnectionReady(mockConnection, 30000);

      expect(Voice.entersState).toHaveBeenCalledWith(
        mockConnection,
        Voice.VoiceConnectionStatus.Ready,
        30000,
      );
    });

    it('should pass timeout to entersState exactly', async () => {
      const mockConnection = {
        state: { status: 'connecting' },
      } as any;

      const customTimeout = 7500;
      vi.mocked(Voice.entersState).mockResolvedValueOnce(undefined);

      await waitForConnectionReady(mockConnection, customTimeout);

      expect(Voice.entersState).toHaveBeenCalledWith(
        mockConnection,
        Voice.VoiceConnectionStatus.Ready,
        customTimeout,
      );
    });
  });

  describe('OpenTelemetry Tracing', () => {
    it('should create trace span on success', async () => {
      const mockConnection = {
        state: { status: 'connecting' },
      } as any;

      vi.mocked(Voice.entersState).mockResolvedValueOnce(undefined);

      await waitForConnectionReady(mockConnection, 5000);

      // Verify trace span was created
      const { trace } = await import('@opentelemetry/api');
      const tracer = vi.mocked(trace.getTracer).mock.results[0].value;
      expect(tracer.startSpan).toHaveBeenCalledWith(
        'djcova.connection.wait_for_ready',
        expect.objectContaining({
          attributes: expect.objectContaining({
            'connection.timeout_ms': 5000,
          }),
        }),
      );
    });

    it('should include connection_id in trace attributes', async () => {
      const mockConnection = {
        state: { status: Voice.VoiceConnectionStatus.Ready },
      } as any;

      await waitForConnectionReady(mockConnection, 5000);

      const { trace } = await import('@opentelemetry/api');
      const tracer = vi.mocked(trace.getTracer).mock.results[0].value;
      const calls = vi.mocked(tracer.startSpan).mock.calls;

      const hasConnectionId = calls.some(call => {
        const attributes = call[1]?.attributes;
        return attributes && 'connection.id' in attributes;
      });

      expect(hasConnectionId).toBe(true);
    });

    it('should mark trace result as success on ready', async () => {
      const mockConnection = {
        state: { status: 'connecting' },
      } as any;

      const mockSpan = {
        setAttributes: vi.fn(),
        end: vi.fn(),
      };

      const mockTracer = {
        startSpan: vi.fn().mockReturnValue(mockSpan),
      };

      const { trace } = await import('@opentelemetry/api');
      vi.mocked(trace.getTracer).mockReturnValueOnce(mockTracer as any);
      vi.mocked(Voice.entersState).mockResolvedValueOnce(undefined);

      await waitForConnectionReady(mockConnection, 5000);

      expect(mockSpan.setAttributes).toHaveBeenCalledWith(
        expect.objectContaining({
          'connection.result': 'success',
        }),
      );
    });

    it('should mark trace result as timeout on timeout error', async () => {
      const mockConnection = {
        state: { status: 'connecting' },
      } as any;

      const mockSpan = {
        setAttributes: vi.fn(),
        end: vi.fn(),
      };

      const mockTracer = {
        startSpan: vi.fn().mockReturnValue(mockSpan),
      };

      const { trace } = await import('@opentelemetry/api');
      vi.mocked(trace.getTracer).mockReturnValueOnce(mockTracer as any);
      vi.mocked(Voice.entersState).mockRejectedValueOnce(new Error('timed out waiting for ready'));

      await expect(waitForConnectionReady(mockConnection, 5000)).rejects.toThrow();

      expect(mockSpan.setAttributes).toHaveBeenCalledWith(
        expect.objectContaining({
          'connection.result': 'timeout',
        }),
      );
    });
  });

  describe('Error Messages Clarity', () => {
    it('should provide clear error message for timeout', async () => {
      const mockConnection = {
        state: { status: 'connecting' },
      } as any;

      vi.mocked(Voice.entersState).mockRejectedValueOnce(new Error('timed out waiting for ready'));

      try {
        await waitForConnectionReady(mockConnection, 5000);
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toContain('did not reach Ready state');
        expect((error as Error).message).toContain('5000ms');
      }
    });

    it('should provide clear error message for destroyed connection', async () => {
      const mockConnection = {
        state: { status: 'connecting' },
      } as any;

      vi.mocked(Voice.entersState).mockRejectedValueOnce(new Error('destroyed waiting for ready'));

      try {
        await waitForConnectionReady(mockConnection, 5000);
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toContain('destroyed');
      }
    });

    it('should provide generic error message for other errors', async () => {
      const mockConnection = {
        state: { status: 'connecting' },
      } as any;

      vi.mocked(Voice.entersState).mockRejectedValueOnce(new Error('unknown voice error'));

      try {
        await waitForConnectionReady(mockConnection, 5000);
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toContain('Voice connection failed');
      }
    });
  });
});
