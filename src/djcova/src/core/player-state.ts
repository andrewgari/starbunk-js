import { EventEmitter } from 'events';

export type PlayerStateValue = 'idle' | 'connecting' | 'playing' | 'stopping';

export class InvalidStateTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidStateTransitionError';
    Object.setPrototypeOf(this, InvalidStateTransitionError.prototype);
  }
}

export class PlayerState {
  private currentState: PlayerStateValue = 'idle';
  private eventEmitter = new EventEmitter();

  getState(): PlayerStateValue {
    return this.currentState;
  }

  transitionToConnecting(): void {
    if (this.currentState !== 'idle') {
      throw new InvalidStateTransitionError(
        `Cannot transition to 'connecting' from '${this.currentState}'. Expected state: 'idle'.`,
      );
    }
    this.currentState = 'connecting';
    this.eventEmitter.emit('state-changed', 'connecting');
  }

  transitionToPlaying(): void {
    if (this.currentState !== 'connecting') {
      throw new InvalidStateTransitionError(
        `Cannot transition to 'playing' from '${this.currentState}'. Expected state: 'connecting'.`,
      );
    }
    this.currentState = 'playing';
    this.eventEmitter.emit('state-changed', 'playing');
  }

  transitionToStopping(): void {
    if (!['playing', 'connecting'].includes(this.currentState)) {
      throw new InvalidStateTransitionError(
        `Cannot transition to 'stopping' from '${this.currentState}'. Expected state: 'playing' or 'connecting'.`,
      );
    }
    this.currentState = 'stopping';
    this.eventEmitter.emit('state-changed', 'stopping');
  }

  transitionToIdle(): void {
    if (this.currentState !== 'stopping') {
      throw new InvalidStateTransitionError(
        `Cannot transition to 'idle' from '${this.currentState}'. Expected state: 'stopping'.`,
      );
    }
    this.currentState = 'idle';
    this.eventEmitter.emit('state-changed', 'idle');
  }

  on(event: 'state-changed', listener: (state: PlayerStateValue) => void): void {
    this.eventEmitter.on(event, listener);
  }

  reset(): void {
    this.currentState = 'idle';
  }
}
