import { VoiceState } from 'discord.js';
import { VoiceStateHandler } from './types';

export class VoiceStateManager {
  private handlers: VoiceStateHandler[] = [];

  registerHandler(handler: VoiceStateHandler): void {
    this.handlers.push(handler);
  }

  async handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
    await Promise.all(
      this.handlers.map(handler => 
        handler.handleVoiceStateUpdate(oldState, newState)
      )
    );
  }
} 