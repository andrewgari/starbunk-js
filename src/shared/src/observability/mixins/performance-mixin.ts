import type { LogLayer, LogLayerMixin, LogLayerMixinRegistration, MockLogLayer, LogLayerPlugin } from 'loglayer';
import { LogLayerMixinAugmentType } from 'loglayer';
import type { PluginBeforeDataOutParams } from 'loglayer';

/**
 * Performance timing context
 */
export interface PerformanceContext {
  operation?: string;
  duration_ms?: number;
  start_time?: number;
}

/**
 * Mixin interface for performance tracking
 */
export interface IPerformanceMixin<T> {
  /**
   * Start tracking performance for an operation
   * @param operationName - Name of the operation being tracked
   * @returns Logger instance for chaining
   */
  startTiming(operationName: string): T;

  /**
   * End tracking and log the duration
   * @param operationName - Name of the operation (must match startTiming call)
   * @returns Logger instance for chaining
   */
  endTiming(operationName: string): T;

  /**
   * Log with a specific duration
   * @param operationName - Name of the operation
   * @param durationMs - Duration in milliseconds
   * @returns Logger instance for chaining
   */
  withDuration(operationName: string, durationMs: number): T;
}

// Augment the loglayer module
declare module 'loglayer' {
  interface LogLayer extends IPerformanceMixin<LogLayer> {}
  interface MockLogLayer extends IPerformanceMixin<MockLogLayer> {}
  interface ILogLayer<This> extends IPerformanceMixin<This> {}
}

// Symbol for storing timing data on LogLayer instances
const TIMING_DATA_KEY = Symbol('performanceTimingData');

interface TimingData {
  [operationName: string]: number; // start time in ms
}

/**
 * Performance tracking mixin implementation
 */
const performanceMixinImpl: LogLayerMixin = {
  augmentationType: LogLayerMixinAugmentType.LogLayer,

  onConstruct: (instance: LogLayer) => {
    // Initialize timing storage on each instance
    (instance as any)[TIMING_DATA_KEY] = {} as TimingData;
  },

  augment: (prototype) => {
    prototype.startTiming = function (this: LogLayer, operationName: string): LogLayer {
      const timingData = (this as any)[TIMING_DATA_KEY] as TimingData;
      timingData[operationName] = Date.now();
      return this;
    };

    prototype.endTiming = function (this: LogLayer, operationName: string): LogLayer {
      const timingData = (this as any)[TIMING_DATA_KEY] as TimingData;
      const startTime = timingData[operationName];

      if (startTime) {
        const duration = Date.now() - startTime;
        delete timingData[operationName]; // Clean up
        return this.withContext({
          operation: operationName,
          duration_ms: duration,
        });
      }

      return this;
    };

    prototype.withDuration = function (this: LogLayer, operationName: string, durationMs: number): LogLayer {
      return this.withContext({
        operation: operationName,
        duration_ms: durationMs,
      });
    };
  },

  augmentMock: (prototype) => {
    prototype.startTiming = function (this: MockLogLayer, _operationName: string): MockLogLayer {
      return this;
    };

    prototype.endTiming = function (this: MockLogLayer, _operationName: string): MockLogLayer {
      return this;
    };

    prototype.withDuration = function (this: MockLogLayer, _operationName: string, _durationMs: number): MockLogLayer {
      return this;
    };
  },
};

/**
 * Register the performance tracking mixin
 */
export function performanceMixin(): LogLayerMixinRegistration {
  return {
    mixinsToAdd: [performanceMixinImpl],
  };
}

