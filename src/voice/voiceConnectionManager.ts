import { AudioPlayer, VoiceConnection, createAudioPlayer, joinVoiceChannel } from '@discordjs/voice';
import { VoiceConnectionInfo, VoiceConnectionManager } from './types';
import { Client, Guild } from 'discord.js';

interface ConnectionCache {
  [guildId: string]: VoiceConnectionInfo;
}

export class VoiceConnectionManagerImpl implements VoiceConnectionManager {
  private connections: ConnectionCache = {};

  getConnection(guildId: string): VoiceConnectionInfo | undefined {
    return this.connections[guildId];
  }

  async createConnection(guildId: string, channelId: string, guild: Guild): Promise<VoiceConnectionInfo> {
    this.destroyConnection(guildId);

    const connection = joinVoiceChannel({
      channelId,
      guildId,
      adapterCreator: guild.voiceAdapterCreator,
    });

    const player = createAudioPlayer();
    connection.subscribe(player);

    const connectionInfo: VoiceConnectionInfo = {
      connection,
      player,
      channelId
    };

    this.connections[guildId] = connectionInfo;
    return connectionInfo;
  }

  destroyConnection(guildId: string): void {
    const connection = this.connections[guildId];
    if (connection) {
      connection.connection.destroy();
      connection.player.stop();
      delete this.connections[guildId];
    }
  }
} 