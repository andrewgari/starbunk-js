import { vi } from 'vitest';
import { Client, Message, TextChannel } from 'discord.js';
import { BlueBot } from '../../src/blue-bot';
import { createMockMessage } from './mock-message';
import { BlueBotDiscordService } from '../../src/discord/discord-service';

/**
 * Simple test harness for e2e testing of BlueBot
 * Simulates the full Discord message flow: message received → bot processes → bot responds
 */
export class BlueBotTestHarness {
  private bluebot: BlueBot;
  private mockClient: Client;
  private messageHandler?: (message: Message) => Promise<void>;
  private lastSendSpy?: ReturnType<typeof vi.fn>;

  constructor() {
    // Create a mock client that can register and emit events
    this.mockClient = {
      on: vi.fn((event: string, handler: any) => {
        if (event === 'messageCreate') {
          this.messageHandler = handler;
        }
      }),
    } as unknown as Client;

    // Create the bot
    this.bluebot = new BlueBot(this.mockClient);
  }

  /**
   * Initialize the bot (must be called before sending messages)
   */
  async start(): Promise<void> {
    await this.bluebot.start();
  }

  /**
   * Send a message to the bot and get the response
   * @param content The message content
   * @param authorId The author's user ID (optional)
   * @returns The bot's response, or null if no response
   */
  async sendMessage(content: string, authorId?: string): Promise<string | null> {
    if (!this.messageHandler) {
      throw new Error('Bot not started. Call start() first.');
    }

    // Create a fake Discord message
    const message = createMockMessage({ content, authorId });

    // Set up the BlueBotDiscordService with the mock client from the message
    // This ensures the service can fetch guild and member information
    const discordService = BlueBotDiscordService.getInstance();
    discordService.setClient(message.client as Client);

    // Set up a spy to capture the bot's response
    this.lastSendSpy = vi.fn();
    (message.channel as TextChannel).send = this.lastSendSpy;

    // Trigger the bot's message handler (simulates Discord event)
    await this.messageHandler(message as Message);

    // Return the response if the bot sent one
    if (this.lastSendSpy.mock.calls.length > 0) {
      return this.lastSendSpy.mock.calls[0][0];
    }

    return null;
  }

  /**
   * Get the spy for the last send call (for advanced assertions)
   */
  getLastSendSpy(): ReturnType<typeof vi.fn> | undefined {
    return this.lastSendSpy;
  }
}

