import { VoiceState } from 'discord.js';
import { VoiceStateHandler } from './types';
import { VoiceConnectionManagerImpl } from './voiceConnectionManager';

export abstract class BaseVoiceBot implements VoiceStateHandler {
  protected readonly connectionManager = new VoiceConnectionManagerImpl();
  
  abstract getBotName(): string;
  
  abstract handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void>;

  protected async joinChannel(state: VoiceState): Promise<void> {
    if (!state.channel) return;

    try {
      await this.connectionManager.createConnection(
        state.guild.id,
        state.channel.id,
        state.guild
      );
    } catch (error) {
      console.error(`Failed to join channel for ${this.getBotName()}:`, error);
      throw error;
    }
  }

  protected leaveChannel(guildId: string): void {
    try {
      this.connectionManager.destroyConnection(guildId);
    } catch (error) {
      console.error(`Failed to leave channel for ${this.getBotName()}:`, error);
    }
  }
} 