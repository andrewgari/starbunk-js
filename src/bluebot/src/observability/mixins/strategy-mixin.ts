import type { LogLayer, LogLayerMixin, LogLayerMixinRegistration, MockLogLayer } from 'loglayer';
import { LogLayerMixinAugmentType } from 'loglayer';

/**
 * BlueBot strategy context for structured logging
 */
export interface StrategyContext {
  strategy_name?: string;
  trigger_name?: string;
  trigger_type?: string;
}

/**
 * Mixin interface for BlueBot strategy logging
 */
export interface IStrategyMixin<T> {
  /**
   * Add strategy information to the log
   * @param strategyName - Name of the strategy
   * @returns Logger instance for chaining
   */
  withStrategy(strategyName: string): T;

  /**
   * Add trigger information to the log
   * @param triggerName - Name of the trigger
   * @param triggerType - Type of trigger (optional)
   * @returns Logger instance for chaining
   */
  withTrigger(triggerName: string, triggerType?: string): T;
}

// Augment the loglayer module
declare module 'loglayer' {
  export interface LogLayer {
    withStrategy(strategyName: string): LogLayer;
    withTrigger(triggerName: string, triggerType?: string): LogLayer;
  }
  export interface MockLogLayer {
    withStrategy(strategyName: string): MockLogLayer;
    withTrigger(triggerName: string, triggerType?: string): MockLogLayer;
  }
  export interface ILogLayer<This> {
    withStrategy(strategyName: string): This;
    withTrigger(triggerName: string, triggerType?: string): This;
  }
}

/**
 * BlueBot strategy mixin implementation
 */
const strategyMixinImpl: LogLayerMixin = {
  augmentationType: LogLayerMixinAugmentType.LogLayer,

  augment: (prototype) => {
    prototype.withStrategy = function (this: LogLayer, strategyName: string): LogLayer {
      return this.withContext({ strategy_name: strategyName });
    };

    prototype.withTrigger = function (this: LogLayer, triggerName: string, triggerType?: string): LogLayer {
      const metadata: StrategyContext = { trigger_name: triggerName };
      if (triggerType) {
        metadata.trigger_type = triggerType;
      }
      return this.withContext(metadata);
    };
  },

  augmentMock: (prototype) => {
    prototype.withStrategy = function (this: MockLogLayer, _strategyName: string): MockLogLayer {
      return this;
    };

    prototype.withTrigger = function (this: MockLogLayer, _triggerName: string, _triggerType?: string): MockLogLayer {
      return this;
    };
  },
};

/**
 * Register the BlueBot strategy mixin
 */
export function strategyMixin(): LogLayerMixinRegistration {
  return {
    mixinsToAdd: [strategyMixinImpl],
  };
}

