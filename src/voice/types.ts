import { VoiceState } from 'discord.js';
import { AudioPlayer, VoiceConnection as DiscordVoiceConnection } from '@discordjs/voice';
import { Guild } from 'discord.js';

export interface VoiceStateHandler {
  handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void>;
}

export interface VoiceConnectionInfo {
  connection: DiscordVoiceConnection;
  player: AudioPlayer;
  channelId: string;
}

export interface VoiceConnectionManager {
  getConnection(guildId: string): VoiceConnectionInfo | undefined;
  createConnection(guildId: string, channelId: string, guild: Guild): Promise<VoiceConnectionInfo>;
  destroyConnection(guildId: string): void;
} 