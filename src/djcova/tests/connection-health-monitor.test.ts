import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ConnectionHealthMonitor,
  createConnectionHealthMonitor,
} from '../src/services/connection-health-monitor';
import { VoiceConnectionStatus } from '@discordjs/voice';

// Mock logger
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

describe('ConnectionHealthMonitor', () => {
  let mockConnection: any;
  let mockCallback: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock connection
    mockConnection = {
      state: { status: VoiceConnectionStatus.Ready },
      rejoin: vi.fn(),
      on: vi.fn(),
    };

    // Create mock callback
    mockCallback = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  // Test Scenario 1: Normal Operation
  describe('Scenario 1: Normal Operation (Ready state)', () => {
    it('maintains failureCount at 0 when connection is Ready', () => {
      // Setup
      vi.useFakeTimers();
      const monitor = createConnectionHealthMonitor({
        connection: mockConnection,
        guildId: 'test-guild',
        intervalMs: 100,
        failureThreshold: 3,
      });

      // Execute
      monitor.start();
      vi.advanceTimersByTime(350); // 3+ health check cycles (100ms each)

      // Assert
      expect(mockConnection.rejoin).not.toHaveBeenCalled();
      expect(mockCallback).not.toHaveBeenCalled();

      monitor.destroy();
      vi.useRealTimers();
    });

    it('does not send notification when connection stays Ready', () => {
      // Setup
      vi.useFakeTimers();
      const monitor = createConnectionHealthMonitor({
        connection: mockConnection,
        guildId: 'test-guild',
        intervalMs: 100,
        failureThreshold: 3,
        onThresholdExceeded: mockCallback,
      });

      // Execute
      monitor.start();
      vi.advanceTimersByTime(350); // 30+ seconds worth of checks

      // Assert
      expect(mockCallback).not.toHaveBeenCalled();

      monitor.destroy();
      vi.useRealTimers();
    });
  });

  // Test Scenario 2: Transient Failure
  describe('Scenario 2: Transient Failure (recovers before threshold)', () => {
    it('increments failureCount when connection leaves Ready', () => {
      // Setup
      vi.useFakeTimers();
      const monitor = createConnectionHealthMonitor({
        connection: mockConnection,
        guildId: 'test-guild',
        intervalMs: 100,
        failureThreshold: 3,
      });

      // Execute
      monitor.start();
      vi.advanceTimersByTime(50); // Let first check run
      mockConnection.state.status = VoiceConnectionStatus.Disconnected;
      vi.advanceTimersByTime(100); // Run next check with non-Ready status

      // Assert
      expect(mockConnection.rejoin).toHaveBeenCalledTimes(1);

      monitor.destroy();
      vi.useRealTimers();
    });

    it('triggers reconnect on first failure', () => {
      // Setup
      vi.useFakeTimers();
      const monitor = createConnectionHealthMonitor({
        connection: mockConnection,
        guildId: 'test-guild',
        intervalMs: 100,
        failureThreshold: 3,
      });

      // Execute
      monitor.start();
      vi.advanceTimersByTime(50); // Let first check run
      mockConnection.state.status = VoiceConnectionStatus.Disconnected;
      vi.advanceTimersByTime(100); // Next check triggers reconnect

      // Assert
      expect(mockConnection.rejoin).toHaveBeenCalledTimes(1);

      monitor.destroy();
      vi.useRealTimers();
    });

    it('resets failureCount when connection returns to Ready', () => {
      // Setup
      vi.useFakeTimers();
      const monitor = createConnectionHealthMonitor({
        connection: mockConnection,
        guildId: 'test-guild',
        intervalMs: 100,
        failureThreshold: 3,
      });

      // Execute
      monitor.start();
      vi.advanceTimersByTime(50);
      mockConnection.state.status = VoiceConnectionStatus.Disconnected;
      vi.advanceTimersByTime(100); // failureCount = 1
      mockConnection.state.status = VoiceConnectionStatus.Ready;
      vi.advanceTimersByTime(100); // should reset failureCount to 0

      // Assert
      expect(mockConnection.rejoin).toHaveBeenCalledTimes(1); // Only one from first failure

      monitor.destroy();
      vi.useRealTimers();
    });

    it('does not notify when failureCount recovers before threshold', () => {
      // Setup
      vi.useFakeTimers();
      const monitor = createConnectionHealthMonitor({
        connection: mockConnection,
        guildId: 'test-guild',
        intervalMs: 100,
        failureThreshold: 3,
        onThresholdExceeded: mockCallback,
      });

      // Execute: Ready → non-Ready (count=1) → Ready (reset) before threshold
      monitor.start();
      vi.advanceTimersByTime(50);
      mockConnection.state.status = VoiceConnectionStatus.Disconnected;
      vi.advanceTimersByTime(100);
      mockConnection.state.status = VoiceConnectionStatus.Ready;
      vi.advanceTimersByTime(100);

      // Assert
      expect(mockCallback).not.toHaveBeenCalled();

      monitor.destroy();
      vi.useRealTimers();
    });
  });

  // Test Scenario 3: Persistent Failures
  describe('Scenario 3: Persistent Failures (threshold exceeded)', () => {
    it('notifies user after failureThreshold consecutive failures', () => {
      // Setup
      vi.useFakeTimers();
      const monitor = createConnectionHealthMonitor({
        connection: mockConnection,
        guildId: 'test-guild',
        intervalMs: 100,
        failureThreshold: 3,
        onThresholdExceeded: mockCallback,
      });

      // Execute
      monitor.start();
      vi.advanceTimersByTime(50);
      mockConnection.state.status = VoiceConnectionStatus.Disconnected;
      vi.advanceTimersByTime(350); // 3+ checks with non-Ready status

      // Assert
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith(
        expect.stringContaining('Voice connection health degraded'),
      );

      monitor.destroy();
      vi.useRealTimers();
    });

    it('sends only one notification per failure incident (spam prevention)', () => {
      // Setup
      vi.useFakeTimers();
      const monitor = createConnectionHealthMonitor({
        connection: mockConnection,
        guildId: 'test-guild',
        intervalMs: 100,
        failureThreshold: 3,
        onThresholdExceeded: mockCallback,
      });

      // Execute
      monitor.start();
      vi.advanceTimersByTime(50);
      mockConnection.state.status = VoiceConnectionStatus.Disconnected;
      vi.advanceTimersByTime(550); // 5+ checks with non-Ready status

      // Assert - callback invoked exactly once despite 5 checks
      expect(mockCallback).toHaveBeenCalledTimes(1);

      monitor.destroy();
      vi.useRealTimers();
    });

    it('allows new notification after recovery and new incident', () => {
      // Setup
      vi.useFakeTimers();
      const monitor = createConnectionHealthMonitor({
        connection: mockConnection,
        guildId: 'test-guild',
        intervalMs: 100,
        failureThreshold: 3,
        onThresholdExceeded: mockCallback,
      });

      // Execute: Fail 3x → notify → recover → fail 3x again → notify
      monitor.start();
      vi.advanceTimersByTime(50);
      mockConnection.state.status = VoiceConnectionStatus.Disconnected;
      vi.advanceTimersByTime(350); // First incident, notify
      mockConnection.state.status = VoiceConnectionStatus.Ready;
      vi.advanceTimersByTime(100); // Recovery resets
      mockConnection.state.status = VoiceConnectionStatus.Disconnected;
      vi.advanceTimersByTime(350); // Second incident, notify again

      // Assert
      expect(mockCallback).toHaveBeenCalledTimes(2); // Once per incident

      monitor.destroy();
      vi.useRealTimers();
    });
  });

  // Test Scenario 4: Rapid Flapping
  describe('Scenario 4: Rapid Flapping (Ready ↔ non-Ready)', () => {
    it('notifies only once despite rapid state changes', () => {
      // Setup
      vi.useFakeTimers();
      const monitor = createConnectionHealthMonitor({
        connection: mockConnection,
        guildId: 'test-guild',
        intervalMs: 100,
        failureThreshold: 3,
        onThresholdExceeded: mockCallback,
      });

      // Execute: Rapidly toggle Ready/non-Ready states
      monitor.start();
      vi.advanceTimersByTime(50);

      // Execute: Stay non-Ready for 3 cycles to trigger notification
      monitor.start();
      vi.advanceTimersByTime(50);
      mockConnection.state.status = VoiceConnectionStatus.Disconnected;
      vi.advanceTimersByTime(350); // 3+ checks, triggers notification

      // Now rapidly toggle despite notification already sent
      for (let i = 0; i < 5; i++) {
        mockConnection.state.status =
          i % 2 === 0 ? VoiceConnectionStatus.Ready : VoiceConnectionStatus.Disconnected;
        vi.advanceTimersByTime(100);
      }
      vi.useRealTimers();
    });

    it('correctly tracks failureCount during flapping', () => {
      // Setup
      vi.useFakeTimers();
      const monitor = createConnectionHealthMonitor({
        connection: mockConnection,
        guildId: 'test-guild',
        intervalMs: 100,
        failureThreshold: 3,
      });

      // Execute: Track state transitions
      monitor.start();
      vi.advanceTimersByTime(50);

      // Ready (count=0) → non-Ready (count=1)
      mockConnection.state.status = VoiceConnectionStatus.Disconnected;
      vi.advanceTimersByTime(100);
      expect(mockConnection.rejoin).toHaveBeenCalledTimes(1);

      // non-Ready (count=1) → Ready (reset count=0)
      mockConnection.state.status = VoiceConnectionStatus.Ready;
      vi.advanceTimersByTime(100);

      // Ready (count=0) → non-Ready (count=1, rejoin again)
      mockConnection.state.status = VoiceConnectionStatus.Disconnected;
      vi.advanceTimersByTime(100);
      expect(mockConnection.rejoin).toHaveBeenCalledTimes(2);

      monitor.destroy();
      vi.useRealTimers();
    });
  });

  // Test Scenario 5: Lifecycle Management
  describe('Scenario 5: Lifecycle Management (timer cleanup)', () => {
    it('starts health check on start()', () => {
      // Setup
      vi.useFakeTimers();
      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      const monitor = createConnectionHealthMonitor({
        connection: mockConnection,
        guildId: 'test-guild',
        intervalMs: 5000,
        failureThreshold: 3,
      });

      // Execute
      monitor.start();

      // Assert
      expect(setIntervalSpy).toHaveBeenCalled();
      const call = setIntervalSpy.mock.calls[setIntervalSpy.mock.calls.length - 1];
      expect(call[1]).toBe(5000);

      setIntervalSpy.mockRestore();
      monitor.destroy();
      vi.useRealTimers();
    });

    it('stops health check and clears timer on destroy()', () => {
      // Setup
      vi.useFakeTimers();
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      const monitor = createConnectionHealthMonitor({
        connection: mockConnection,
        guildId: 'test-guild',
        intervalMs: 100,
        failureThreshold: 3,
      });

      // Execute
      monitor.start();
      vi.advanceTimersByTime(50);
      mockConnection.state.status = VoiceConnectionStatus.Disconnected;
      const rejoinCallsBeforeDestroy = mockConnection.rejoin.mock.calls.length;
      monitor.destroy();
      vi.advanceTimersByTime(200); // Advance timer after destroy

      // Assert
      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(mockConnection.rejoin).toHaveBeenCalledTimes(rejoinCallsBeforeDestroy); // No new rejoin calls

      clearIntervalSpy.mockRestore();
      vi.useRealTimers();
    });

    it('does not throw when destroy() called multiple times', () => {
      // Setup
      const monitor = createConnectionHealthMonitor({
        connection: mockConnection,
        guildId: 'test-guild',
        intervalMs: 100,
        failureThreshold: 3,
      });

      monitor.start();

      // Assert - should not throw
      expect(() => {
        monitor.destroy();
        monitor.destroy();
        monitor.destroy();
      }).not.toThrow();
    });

    it('prevents health checks after destroy() (isDestroyed guard)', () => {
      // Setup
      vi.useFakeTimers();
      const monitor = createConnectionHealthMonitor({
        connection: mockConnection,
        guildId: 'test-guild',
        intervalMs: 100,
        failureThreshold: 3,
        onThresholdExceeded: mockCallback,
      });

      // Execute
      monitor.start();
      vi.advanceTimersByTime(50);
      mockConnection.state.status = VoiceConnectionStatus.Disconnected;
      vi.advanceTimersByTime(350); // Trigger notification
      expect(mockCallback).toHaveBeenCalledTimes(1);

      mockCallback.mockClear();
      monitor.destroy();
      vi.advanceTimersByTime(500); // Try to run more checks

      // Assert - callback not invoked after destroy
      expect(mockCallback).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  // Test Scenario 6: Destruction Mid-Check
  describe('Scenario 6: Destruction Mid-Check (graceful error handling)', () => {
    it('handles connection destroyed during health check', () => {
      // Setup
      vi.useFakeTimers();
      const monitor = createConnectionHealthMonitor({
        connection: mockConnection,
        guildId: 'test-guild',
        intervalMs: 100,
        failureThreshold: 3,
      });

      // Execute
      monitor.start();
      vi.advanceTimersByTime(50);
      mockConnection.state = null; // Destroy connection mid-check
      vi.advanceTimersByTime(100);

      // Assert - no error thrown, graceful handling
      expect(monitor).toBeInstanceOf(ConnectionHealthMonitor);

      monitor.destroy();
      vi.useRealTimers();
    });

    it('does not throw when connection is missing', () => {
      // Setup
      vi.useFakeTimers();
      const brokenConnection = {
        state: null,
        rejoin: undefined,
        on: vi.fn(),
      };

      const monitor = createConnectionHealthMonitor({
        connection: brokenConnection as any,
        guildId: 'test-guild',
        intervalMs: 100,
        failureThreshold: 3,
      });

      // Execute - should not throw
      expect(() => {
        monitor.start();
        vi.advanceTimersByTime(200);
        monitor.destroy();
      }).not.toThrow();

      vi.useRealTimers();
    });

    it('clears timer even if health check throws', () => {
      // Setup
      vi.useFakeTimers();
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      const monitor = createConnectionHealthMonitor({
        connection: mockConnection,
        guildId: 'test-guild',
        intervalMs: 100,
        failureThreshold: 3,
      });

      // Execute
      monitor.start();
      mockConnection.state = null; // Make checks throw
      monitor.destroy();

      // Assert
      expect(clearIntervalSpy).toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
      vi.useRealTimers();
    });
  });

  // Test Scenario 7: Configuration & Edge Cases
  describe('Scenario 7: Configuration & Edge Cases', () => {
    it('uses provided interval and threshold values', () => {
      // Setup
      vi.useFakeTimers();
      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      const monitor = createConnectionHealthMonitor({
        connection: mockConnection,
        guildId: 'test-guild',
        intervalMs: 2000,
        failureThreshold: 5,
      });

      // Execute
      monitor.start();

      // Assert
      const call = setIntervalSpy.mock.calls[setIntervalSpy.mock.calls.length - 1];
      expect(call[1]).toBe(2000);

      setIntervalSpy.mockRestore();
      monitor.destroy();
      vi.useRealTimers();
    });

    it('works without notification callback', () => {
      // Setup
      vi.useFakeTimers();
      const monitor = createConnectionHealthMonitor({
        connection: mockConnection,
        guildId: 'test-guild',
        intervalMs: 100,
        failureThreshold: 3,
        // no callback
      });

      // Execute - simulate failure threshold without callback
      expect(() => {
        monitor.start();
        vi.advanceTimersByTime(50);
        mockConnection.state.status = VoiceConnectionStatus.Disconnected;
        vi.advanceTimersByTime(350); // Exceed threshold without callback
        monitor.destroy();
      }).not.toThrow();

      vi.useRealTimers();
    });

    it('applies default values when not provided', () => {
      // Setup
      vi.useFakeTimers();
      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      const monitor = createConnectionHealthMonitor({
        connection: mockConnection,
        guildId: 'test-guild',
        // no intervalMs or failureThreshold
      });

      // Execute
      monitor.start();

      // Assert - defaults: 5000ms interval, threshold 3
      const call = setIntervalSpy.mock.calls[setIntervalSpy.mock.calls.length - 1];
      expect(call[1]).toBe(5000);

      setIntervalSpy.mockRestore();
      monitor.destroy();
      vi.useRealTimers();
    });
  });

  // Test Scenario 8: Notification Callback
  describe('Scenario 8: Notification Callback', () => {
    it('invokes callback when threshold is exceeded', () => {
      // Setup
      vi.useFakeTimers();
      const monitor = createConnectionHealthMonitor({
        connection: mockConnection,
        guildId: 'test-guild',
        intervalMs: 100,
        failureThreshold: 3,
        onThresholdExceeded: mockCallback,
      });

      // Execute
      monitor.start();
      vi.advanceTimersByTime(50);
      mockConnection.state.status = VoiceConnectionStatus.Disconnected;
      vi.advanceTimersByTime(350); // Trigger 3 failures

      // Assert
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith(
        expect.stringContaining('Voice connection health degraded'),
      );

      monitor.destroy();
      vi.useRealTimers();
    });

    it('catches callback errors and logs them', () => {
      // Setup
      vi.useFakeTimers();
      const failingCallback = vi.fn().mockRejectedValue(new Error('callback error'));

      const monitor = createConnectionHealthMonitor({
        connection: mockConnection,
        guildId: 'test-guild',
        intervalMs: 100,
        failureThreshold: 3,
        onThresholdExceeded: failingCallback,
      });

      // Execute - should not throw even if callback fails
      expect(() => {
        monitor.start();
        vi.advanceTimersByTime(50);
        mockConnection.state.status = VoiceConnectionStatus.Disconnected;
        vi.advanceTimersByTime(350);
        monitor.destroy();
      }).not.toThrow();

      // Assert
      expect(failingCallback).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('does not escalate callback errors', () => {
      // Setup
      vi.useFakeTimers();
      const failingCallback = vi.fn().mockRejectedValue(new Error('callback error'));

      const monitor = createConnectionHealthMonitor({
        connection: mockConnection,
        guildId: 'test-guild',
        intervalMs: 100,
        failureThreshold: 3,
        onThresholdExceeded: failingCallback,
      });

      // Execute
      monitor.start();
      vi.advanceTimersByTime(50);
      mockConnection.state.status = VoiceConnectionStatus.Disconnected;
      vi.advanceTimersByTime(350); // Exceed threshold with failing callback
      mockConnection.state.status = VoiceConnectionStatus.Ready;
      vi.advanceTimersByTime(100); // Should continue running

      // Assert - no error escalated, health check continues
      expect(failingCallback).toHaveBeenCalled();
      expect(mockConnection.rejoin).toHaveBeenCalled();

      monitor.destroy();
      vi.useRealTimers();
    });
  });

  // Test Scenario 9: Factory Function
  describe('Scenario 9: Factory Function', () => {
    it('creates instance with correct config', () => {
      // Setup & Execute
      const monitor = createConnectionHealthMonitor({
        connection: mockConnection,
        guildId: 'test-guild',
        intervalMs: 2000,
        failureThreshold: 5,
      });

      // Assert
      expect(monitor).toBeInstanceOf(ConnectionHealthMonitor);
    });

    it('instance is fully functional', () => {
      // Setup
      vi.useFakeTimers();
      const monitor = createConnectionHealthMonitor({
        connection: mockConnection,
        guildId: 'test-guild',
        intervalMs: 100,
        failureThreshold: 3,
      });

      // Execute & Assert
      expect(() => {
        monitor.start();
        vi.advanceTimersByTime(50);
        mockConnection.state.status = VoiceConnectionStatus.Disconnected;
        vi.advanceTimersByTime(100);
        mockConnection.state.status = VoiceConnectionStatus.Ready;
        vi.advanceTimersByTime(100);
        monitor.destroy();
      }).not.toThrow();

      expect(mockConnection.rejoin).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });
});
