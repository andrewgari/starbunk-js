import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PlayerState,
  PlayerStateValue,
  InvalidStateTransitionError,
} from '../../src/core/player-state';

describe('PlayerState - State Machine Transitions', () => {
  let stateMachine: PlayerState;

  beforeEach(() => {
    stateMachine = new PlayerState();
  });

  // ============================================================================
  // IDLE STATE TESTS
  // ============================================================================

  describe('idle state', () => {
    describe('initialization', () => {
      it('should start in idle state', () => {
        // Arrange & Act
        // stateMachine already initialized in beforeEach

        // Assert
        expect(stateMachine.getState()).toBe('idle');
      });
    });

    describe('valid transitions from idle', () => {
      it('should transition to connecting', () => {
        // Arrange
        expect(stateMachine.getState()).toBe('idle');

        // Act
        stateMachine.transitionToConnecting();

        // Assert
        expect(stateMachine.getState()).toBe('connecting');
      });

      it('should emit state-changed event on idle→connecting transition', () => {
        // Arrange
        const listener = vi.fn<(state: PlayerStateValue) => void>();
        stateMachine.on('state-changed', listener);

        // Act
        stateMachine.transitionToConnecting();

        // Assert
        expect(listener).toHaveBeenCalledWith('connecting');
      });
    });

    describe('invalid transitions from idle', () => {
      it('should throw InvalidStateTransitionError when attempting idle→playing', () => {
        // Arrange
        expect(stateMachine.getState()).toBe('idle');

        // Act & Assert
        expect(() => {
          stateMachine.transitionToPlaying();
        }).toThrow(InvalidStateTransitionError);
      });

      it('should throw InvalidStateTransitionError when attempting idle→stopping', () => {
        // Arrange
        expect(stateMachine.getState()).toBe('idle');

        // Act & Assert
        expect(() => {
          stateMachine.transitionToStopping();
        }).toThrow(InvalidStateTransitionError);
      });

      it('should throw InvalidStateTransitionError when attempting idle→idle', () => {
        // Arrange
        expect(stateMachine.getState()).toBe('idle');

        // Act & Assert
        expect(() => {
          stateMachine.transitionToIdle();
        }).toThrow(InvalidStateTransitionError);
      });
    });

    describe('error messages from idle', () => {
      it('should include current state in error message', () => {
        // Act & Assert
        expect(() => {
          stateMachine.transitionToPlaying();
        }).toThrow(/idle/);
      });

      it('should include expected state in error message', () => {
        // Act & Assert
        expect(() => {
          stateMachine.transitionToPlaying();
        }).toThrow(/connecting/);
      });
    });
  });

  // ============================================================================
  // CONNECTING STATE TESTS
  // ============================================================================

  describe('connecting state', () => {
    beforeEach(() => {
      stateMachine.transitionToConnecting();
    });

    describe('state verification', () => {
      it('should report connecting as current state', () => {
        // Assert
        expect(stateMachine.getState()).toBe('connecting');
      });
    });

    describe('valid transitions from connecting', () => {
      it('should transition to playing', () => {
        // Arrange
        expect(stateMachine.getState()).toBe('connecting');

        // Act
        stateMachine.transitionToPlaying();

        // Assert
        expect(stateMachine.getState()).toBe('playing');
      });

      it('should transition to stopping', () => {
        // Arrange
        expect(stateMachine.getState()).toBe('connecting');

        // Act
        stateMachine.transitionToStopping();

        // Assert
        expect(stateMachine.getState()).toBe('stopping');
      });

      it('should emit state-changed event on connecting→playing transition', () => {
        // Arrange
        const listener = vi.fn<(state: PlayerStateValue) => void>();
        stateMachine.on('state-changed', listener);

        // Act
        stateMachine.transitionToPlaying();

        // Assert
        expect(listener).toHaveBeenCalledWith('playing');
      });

      it('should emit state-changed event on connecting→stopping transition', () => {
        // Arrange
        const listener = vi.fn<(state: PlayerStateValue) => void>();
        stateMachine.on('state-changed', listener);

        // Act
        stateMachine.transitionToStopping();

        // Assert
        expect(listener).toHaveBeenCalledWith('stopping');
      });
    });

    describe('invalid transitions from connecting', () => {
      it('should throw InvalidStateTransitionError when attempting connecting→idle', () => {
        // Act & Assert
        expect(() => {
          stateMachine.transitionToIdle();
        }).toThrow(InvalidStateTransitionError);
      });

      it('should throw InvalidStateTransitionError when attempting connecting→connecting', () => {
        // Act & Assert
        expect(() => {
          stateMachine.transitionToConnecting();
        }).toThrow(InvalidStateTransitionError);
      });
    });

    describe('error messages from connecting', () => {
      it('should include current state in error message for connecting→idle', () => {
        // Act & Assert
        expect(() => {
          stateMachine.transitionToIdle();
        }).toThrow(/connecting/);
      });

      it('should include expected state in error message for connecting→idle', () => {
        // Act & Assert
        expect(() => {
          stateMachine.transitionToIdle();
        }).toThrow(/stopping/);
      });
    });
  });

  // ============================================================================
  // PLAYING STATE TESTS
  // ============================================================================

  describe('playing state', () => {
    beforeEach(() => {
      stateMachine.transitionToConnecting();
      stateMachine.transitionToPlaying();
    });

    describe('state verification', () => {
      it('should report playing as current state', () => {
        // Assert
        expect(stateMachine.getState()).toBe('playing');
      });
    });

    describe('valid transitions from playing', () => {
      it('should transition to stopping', () => {
        // Arrange
        expect(stateMachine.getState()).toBe('playing');

        // Act
        stateMachine.transitionToStopping();

        // Assert
        expect(stateMachine.getState()).toBe('stopping');
      });

      it('should emit state-changed event on playing→stopping transition', () => {
        // Arrange
        const listener = vi.fn<(state: PlayerStateValue) => void>();
        stateMachine.on('state-changed', listener);

        // Act
        stateMachine.transitionToStopping();

        // Assert
        expect(listener).toHaveBeenCalledWith('stopping');
      });
    });

    describe('invalid transitions from playing', () => {
      it('should throw InvalidStateTransitionError when attempting playing→connecting', () => {
        // Act & Assert
        expect(() => {
          stateMachine.transitionToConnecting();
        }).toThrow(InvalidStateTransitionError);
      });

      it('should throw InvalidStateTransitionError when attempting playing→playing', () => {
        // Act & Assert
        expect(() => {
          stateMachine.transitionToPlaying();
        }).toThrow(InvalidStateTransitionError);
      });

      it('should throw InvalidStateTransitionError when attempting playing→idle', () => {
        // Act & Assert
        expect(() => {
          stateMachine.transitionToIdle();
        }).toThrow(InvalidStateTransitionError);
      });
    });

    describe('error messages from playing', () => {
      it('should include current state in error message', () => {
        // Act & Assert
        expect(() => {
          stateMachine.transitionToIdle();
        }).toThrow(/playing/);
      });

      it('should include expected state in error message', () => {
        // Act & Assert
        expect(() => {
          stateMachine.transitionToIdle();
        }).toThrow(/stopping/);
      });
    });
  });

  // ============================================================================
  // STOPPING STATE TESTS
  // ============================================================================

  describe('stopping state', () => {
    beforeEach(() => {
      stateMachine.transitionToConnecting();
      stateMachine.transitionToStopping();
    });

    describe('state verification', () => {
      it('should report stopping as current state', () => {
        // Assert
        expect(stateMachine.getState()).toBe('stopping');
      });
    });

    describe('valid transitions from stopping', () => {
      it('should transition to idle', () => {
        // Arrange
        expect(stateMachine.getState()).toBe('stopping');

        // Act
        stateMachine.transitionToIdle();

        // Assert
        expect(stateMachine.getState()).toBe('idle');
      });

      it('should emit state-changed event on stopping→idle transition', () => {
        // Arrange
        const listener = vi.fn<(state: PlayerStateValue) => void>();
        stateMachine.on('state-changed', listener);

        // Act
        stateMachine.transitionToIdle();

        // Assert
        expect(listener).toHaveBeenCalledWith('idle');
      });
    });

    describe('invalid transitions from stopping', () => {
      it('should throw InvalidStateTransitionError when attempting stopping→connecting', () => {
        // Act & Assert
        expect(() => {
          stateMachine.transitionToConnecting();
        }).toThrow(InvalidStateTransitionError);
      });

      it('should throw InvalidStateTransitionError when attempting stopping→playing', () => {
        // Act & Assert
        expect(() => {
          stateMachine.transitionToPlaying();
        }).toThrow(InvalidStateTransitionError);
      });

      it('should throw InvalidStateTransitionError when attempting stopping→stopping', () => {
        // Act & Assert
        expect(() => {
          stateMachine.transitionToStopping();
        }).toThrow(InvalidStateTransitionError);
      });
    });

    describe('error messages from stopping', () => {
      it('should include current state in error message', () => {
        // Act & Assert
        expect(() => {
          stateMachine.transitionToConnecting();
        }).toThrow(/stopping/);
      });

      it('should include expected state in error message', () => {
        // Act & Assert
        expect(() => {
          stateMachine.transitionToConnecting();
        }).toThrow(/idle/);
      });
    });
  });

  // ============================================================================
  // EDGE CASES & SPECIAL BEHAVIORS
  // ============================================================================

  describe('edge cases', () => {
    describe('reset functionality', () => {
      it('should reset to idle from any state', () => {
        // Arrange - test from different states
        stateMachine.transitionToConnecting();
        expect(stateMachine.getState()).toBe('connecting');

        // Act
        stateMachine.reset();

        // Assert
        expect(stateMachine.getState()).toBe('idle');
      });

      it('should allow valid transitions after reset', () => {
        // Arrange
        stateMachine.transitionToConnecting();
        stateMachine.reset();
        expect(stateMachine.getState()).toBe('idle');

        // Act
        stateMachine.transitionToConnecting();

        // Assert
        expect(stateMachine.getState()).toBe('connecting');
      });

      it('should allow event listeners to continue working after reset', () => {
        // Arrange
        let callCount = 0;
        const listener = (_state: PlayerStateValue) => {
          callCount++;
        };
        stateMachine.on('state-changed', listener);
        stateMachine.transitionToConnecting();
        expect(callCount).toBe(1);

        // Act
        stateMachine.reset();
        // Note: reset() currently doesn't clear listeners; they remain subscribed.
        // This test documents and verifies that behavior.
        stateMachine.transitionToConnecting();

        // Assert
        expect(callCount).toBe(2); // Listener still fires after reset
      });
    });

    describe('sequential transitions', () => {
      it('should handle full lifecycle sequence: idle→connecting→playing→stopping→idle', () => {
        // Arrange
        expect(stateMachine.getState()).toBe('idle');

        // Act & Assert - step through full sequence
        stateMachine.transitionToConnecting();
        expect(stateMachine.getState()).toBe('connecting');

        stateMachine.transitionToPlaying();
        expect(stateMachine.getState()).toBe('playing');

        stateMachine.transitionToStopping();
        expect(stateMachine.getState()).toBe('stopping');

        stateMachine.transitionToIdle();
        expect(stateMachine.getState()).toBe('idle');
      });

      it('should handle alternate lifecycle: idle→connecting→stopping→idle', () => {
        // Arrange
        expect(stateMachine.getState()).toBe('idle');

        // Act & Assert - stop before playing
        stateMachine.transitionToConnecting();
        expect(stateMachine.getState()).toBe('connecting');

        stateMachine.transitionToStopping();
        expect(stateMachine.getState()).toBe('stopping');

        stateMachine.transitionToIdle();
        expect(stateMachine.getState()).toBe('idle');
      });
    });

    describe('event listener behavior', () => {
      it('should support multiple listeners for state-changed event', () => {
        // Arrange
        let listener1Called = false;
        let listener2Called = false;

        stateMachine.on('state-changed', (_state: PlayerStateValue) => {
          listener1Called = true;
        });
        stateMachine.on('state-changed', (_state: PlayerStateValue) => {
          listener2Called = true;
        });

        // Act
        stateMachine.transitionToConnecting();

        // Assert
        expect(listener1Called).toBe(true);
        expect(listener2Called).toBe(true);
      });

      it('should pass correct state value to event listener', () => {
        // Arrange
        const listener = vi.fn<(state: PlayerStateValue) => void>();
        stateMachine.on('state-changed', listener);

        // Act
        stateMachine.transitionToConnecting();

        // Assert
        expect(listener).toHaveBeenCalledWith('connecting');
      });
    });

    describe('error handling specifics', () => {
      it('should throw InvalidStateTransitionError (not generic Error)', () => {
        // Act & Assert
        const error = (() => {
          try {
            stateMachine.transitionToPlaying();
          } catch (e) {
            return e;
          }
        })();

        expect(error).toBeInstanceOf(InvalidStateTransitionError);
      });

      it('should provide error message with transition details', () => {
        // Act & Assert
        expect(() => {
          stateMachine.transitionToPlaying();
        }).toThrow(/Cannot transition/);
      });
    });
  });
});
