/**
 * DiscordE2EClient — the test harness that connects to Discord as the CI sender
 * bot, sends messages to test channels, and collects bot responses.
 *
 * Two clients are managed here:
 *   - sender:  the primary CI bot, sends all test messages
 *   - enemy:   a second bot account, used for BlueBot "enemy user" scenarios
 *
 * Both are driven via this class so tests don't need to manage Discord.js
 * lifecycle directly.
 */

import { Client, Events, GatewayIntentBits, Message, TextChannel, ChannelType } from 'discord.js';
import {
  joinVoiceChannel,
  VoiceConnection,
  EndBehaviorType,
  VoiceConnectionStatus,
  entersState,
  getVoiceConnection,
} from '@discordjs/voice';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WaitForResponseOptions {
  /** Maximum ms to wait before timing out (default: 8000) */
  timeout?: number;
  /** Return true if this message is the one we want */
  filter: (message: Message) => boolean;
}

export interface WaitForWebhookOptions {
  /** Webhook username must exactly match this string */
  webhookUsername?: string;
  /** At least one of these strings must appear in message.content */
  contentIncludes?: string[];
  /** message.content must match this regex */
  contentPattern?: RegExp;
  timeout?: number;
}

export interface WaitForBotMessageOptions {
  /** The bot's Discord user ID */
  botId: string;
  contentIncludes?: string[];
  contentPattern?: RegExp;
  timeout?: number;
}

// ─── Client ──────────────────────────────────────────────────────────────────

export class DiscordE2EClient {
  private senderClient: Client;
  private enemyClient: Client;
  private senderReady = false;
  private enemyReady = false;

  constructor(
    private readonly senderToken: string,
    private readonly enemyToken: string,
    private readonly senderBotId: string,
  ) {
    const intents = [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildVoiceStates,
    ];
    this.senderClient = new Client({ intents });
    this.enemyClient = new Client({ intents });
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  async connect(): Promise<void> {
    await Promise.all([
      this._loginClient(this.senderClient, this.senderToken).then(() => {
        this.senderReady = true;
      }),
      this._loginClient(this.enemyClient, this.enemyToken).then(() => {
        this.enemyReady = true;
      }),
    ]);
  }

  async disconnect(): Promise<void> {
    // Destroy any lingering voice connections
    const senderGuilds = this.senderClient.guilds.cache;
    for (const guild of senderGuilds.values()) {
      const conn = getVoiceConnection(guild.id);
      conn?.destroy();
    }
    this.senderClient.destroy();
    this.enemyClient.destroy();
    this.senderReady = false;
    this.enemyReady = false;
  }

  private _loginClient(client: Client, token: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Discord login timed out after 30s')),
        30_000,
      );
      client.once(Events.ClientReady, () => {
        clearTimeout(timer);
        resolve();
      });
      client.login(token).catch(err => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  // ─── Sending ───────────────────────────────────────────────────────────────

  private async _fetchTextChannel(client: Client, channelId: string): Promise<TextChannel> {
    const channel = await client.channels.fetch(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} was not found`);
    }
    if (channel.type !== ChannelType.GuildText) {
      throw new Error(
        `Channel ${channelId} is not a guild text channel (received type ${channel.type})`,
      );
    }
    return channel as TextChannel;
  }

  /** Send a message as the CI sender bot */
  async send(channelId: string, content: string): Promise<Message> {
    const channel = await this._fetchTextChannel(this.senderClient, channelId);
    return channel.send(content);
  }

  /** Send a message as the enemy bot */
  async sendAsEnemy(channelId: string, content: string): Promise<Message> {
    const channel = await this._fetchTextChannel(this.enemyClient, channelId);
    return channel.send(content);
  }

  // ─── Receiving ─────────────────────────────────────────────────────────────

  /**
   * Wait for any message in the channel matching `filter`, ignoring our own
   * sender messages. Rejects with a descriptive error on timeout.
   */
  waitForResponse(
    channelId: string,
    { timeout = 8_000, filter }: WaitForResponseOptions,
  ): Promise<Message> {
    return new Promise<Message>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.senderClient.removeListener(Events.MessageCreate, handler);
        reject(new Error(`Timed out after ${timeout}ms waiting for response in ${channelId}`));
      }, timeout);

      const handler = (msg: Message) => {
        if (msg.channelId !== channelId) return;
        if (msg.author.id === this.senderBotId) return; // ignore own messages
        if (!filter(msg)) return;
        clearTimeout(timer);
        this.senderClient.removeListener(Events.MessageCreate, handler);
        resolve(msg);
      };

      this.senderClient.on(Events.MessageCreate, handler);
    });
  }

  /**
   * Wait for a webhook response (BunkBot / CovaBot).
   * Matches on webhookId presence + optional username and content checks.
   */
  waitForWebhookResponse(channelId: string, opts: WaitForWebhookOptions): Promise<Message> {
    return this.waitForResponse(channelId, {
      timeout: opts.timeout,
      filter: msg => {
        if (!msg.webhookId) return false;
        if (opts.webhookUsername && msg.author.username !== opts.webhookUsername) return false;
        if (opts.contentIncludes && !opts.contentIncludes.some(s => msg.content.includes(s)))
          return false;
        if (opts.contentPattern && !opts.contentPattern.test(msg.content)) return false;
        return true;
      },
    });
  }

  /**
   * Wait for a direct bot message (BlueBot style — message.channel.send).
   * Matches on author ID rather than webhookId.
   */
  waitForBotMessage(channelId: string, opts: WaitForBotMessageOptions): Promise<Message> {
    return this.waitForResponse(channelId, {
      timeout: opts.timeout,
      filter: msg => {
        if (msg.author.id !== opts.botId) return false;
        if (opts.contentIncludes && !opts.contentIncludes.some(s => msg.content.includes(s)))
          return false;
        if (opts.contentPattern && !opts.contentPattern.test(msg.content)) return false;
        return true;
      },
    });
  }

  /**
   * Assert that NO response matching `filter` arrives within `timeout` ms.
   * Resolves (passes) if nothing arrives; rejects if something does.
   */
  assertNoResponse(
    channelId: string,
    { timeout = 3_000, filter }: { timeout?: number; filter?: (m: Message) => boolean },
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.senderClient.removeListener(Events.MessageCreate, handler);
        resolve();
      }, timeout);

      const handler = (msg: Message) => {
        if (msg.channelId !== channelId) return;
        if (msg.author.id === this.senderBotId) return;
        if (filter && !filter(msg)) return;
        clearTimeout(timer);
        this.senderClient.removeListener(Events.MessageCreate, handler);
        reject(new Error(`Unexpected response received: "${msg.content.substring(0, 100)}"`));
      };

      this.senderClient.on(Events.MessageCreate, handler);
    });
  }

  // ─── Voice ─────────────────────────────────────────────────────────────────

  /** Join a voice channel as the CI sender bot */
  async joinVoice(voiceChannelId: string, guildId: string): Promise<VoiceConnection> {
    const guild = await this.senderClient.guilds.fetch(guildId);
    const channel = await guild.channels.fetch(voiceChannelId);
    if (!channel || channel.type !== ChannelType.GuildVoice) {
      throw new Error(`${voiceChannelId} is not a voice channel`);
    }

    const connection = joinVoiceChannel({
      channelId: voiceChannelId,
      guildId,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: false, // must be undeafened to receive audio packets
      selfMute: true,
    });

    await entersState(connection, VoiceConnectionStatus.Ready, 10_000);
    return connection;
  }

  /** Leave voice channel */
  leaveVoice(guildId: string): void {
    const conn = getVoiceConnection(guildId);
    conn?.destroy();
  }

  /**
   * Wait until DJCova's bot account appears in a voice channel.
   * Polls voiceStates on the guild.
   */
  async waitForBotInVoice(
    guildId: string,
    botId: string,
    voiceChannelId: string,
    timeout = 15_000,
  ): Promise<void> {
    const deadline = Date.now() + timeout;
    const guild = await this.senderClient.guilds.fetch(guildId);

    while (Date.now() < deadline) {
      const member = await guild.members.fetch(botId).catch(() => null);
      if (member?.voice.channelId === voiceChannelId) return;
      await new Promise(r => setTimeout(r, 500));
    }
    throw new Error(
      `Bot ${botId} did not join voice channel ${voiceChannelId} within ${timeout}ms`,
    );
  }

  /**
   * Wait for audio packets from `sourceBotId` on an active VoiceConnection.
   * The CI sender must be in the same channel and undeafened.
   */
  waitForAudioPackets(
    connection: VoiceConnection,
    sourceBotId: string,
    timeout = 20_000,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const receiver = connection.receiver;
      const stream = receiver.subscribe(sourceBotId, {
        end: { behavior: EndBehaviorType.Manual },
      });

      const cleanup = () => {
        clearTimeout(timer);
        stream.removeListener('data', onData);
        stream.removeListener('error', onError);
        if (!stream.destroyed) {
          stream.destroy();
        }
      };

      const onData = () => {
        cleanup();
        resolve();
      };

      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`No audio packets from ${sourceBotId} within ${timeout}ms`));
      }, timeout);

      stream.once('data', onData);
      stream.once('error', onError);
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /** Check whether a bot account is a member of the guild */
  async isBotInGuild(guildId: string, botId: string): Promise<boolean> {
    try {
      const guild = await this.senderClient.guilds.fetch(guildId);
      const member = await guild.members.fetch(botId);
      return !!member;
    } catch {
      return false;
    }
  }

  get sender(): Client {
    return this.senderClient;
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────────

let _client: DiscordE2EClient | null = null;

export function getE2EClient(): DiscordE2EClient {
  if (!_client) throw new Error('E2E client not initialized — call initE2EClient() first');
  return _client;
}

export function initE2EClient(
  senderToken: string,
  enemyToken: string,
  senderBotId: string,
): DiscordE2EClient {
  _client = new DiscordE2EClient(senderToken, enemyToken, senderBotId);
  return _client;
}
