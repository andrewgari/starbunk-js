import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock personality parser to avoid filesystem access
vi.mock('../../src/serialization/personality-parser', () => {
  return {
    loadPersonalitiesFromDirectory: vi.fn(() => [
      {
        id: 'p1',
        displayName: 'Test Persona',
        avatarUrl: 'https://example.com/a.png',
        identity: { type: 'static', botName: 'Test Persona' },
        personality: {
          systemPrompt: 'You are helpful.',
          traits: ['helpful'],
          interests: ['testing'],
          speechPatterns: { lowercase: true, sarcasmLevel: 0.2, technicalBias: 0.3 },
        },
        triggers: [],
        socialBattery: { maxMessages: 3, windowMinutes: 10, cooldownSeconds: 5 },
        llmConfig: { model: 'fake', temperature: 0.2, max_tokens: 128 },
        ignoreBots: true,
      },
    ]),
    getDefaultPersonalitiesPath: vi.fn(() => '/tmp/fake-personalities-path'),
  };
});

// Mock repositories and services that require a real DB
vi.mock('../../src/repositories/conversation-repository', () => ({
  ConversationRepository: class {
    constructor(_: any) {}
  },
}));
vi.mock('../../src/repositories/user-fact-repository', () => ({
  UserFactRepository: class {
    constructor(_: any) {}
  },
}));
vi.mock('../../src/repositories/interest-repository', () => ({
  InterestRepository: class {
    constructor(_: any) {}
  },
}));
vi.mock('../../src/repositories/social-battery-repository', () => ({
  SocialBatteryRepository: class {
    constructor(_: any) {}
  },
}));

vi.mock('../../src/services/memory-service', () => ({
  MemoryService: class {
    constructor(..._args: any[]) {}
  },
}));
vi.mock('../../src/services/interest-service', () => ({
  InterestService: class {
    constructor(..._args: any[]) {}
    async initializeFromProfile(_profile: any) {
      return;
    }
  },
}));
vi.mock('../../src/services/social-battery-service', () => ({
  SocialBatteryService: class {
    constructor(..._args: any[]) {}
  },
}));
vi.mock('../../src/services/response-decision-service', () => ({
  ResponseDecisionService: class {
    constructor(..._args: any[]) {}
  },
}));
vi.mock('../../src/services/llm-service', () => ({
  LlmService: class {
    constructor(..._args: any[]) {}
    isConfigured() {
      return true;
    }
  },
}));
vi.mock('../../src/services/personality-service', () => ({
  PersonalityService: class {
    constructor(..._args: any[]) {}
  },
}));
vi.mock('../../src/services/llm', () => ({
  EmbeddingManager: class {
    constructor(..._args: any[]) {}
    startScheduledUpdates(_models?: string[]) {
      return;
    }
    stopScheduledUpdates() {
      return;
    }
  },
}));

// Mock shared DatabaseService to avoid real sqlite
vi.mock('@starbunk/shared/database', () => ({
  DatabaseService: {
    getInstance: vi.fn(() => ({
      initialize: vi.fn().mockResolvedValue(undefined),
      getDb: vi.fn(() => ({}) as never),
      close: vi.fn(),
    })),
  },
}));

// Stub discord.js Client to avoid network
vi.mock('discord.js', () => {
  class MockClient {
    user: { id?: string; tag?: string } | null = { id: 'bot-1', tag: 'bot#0001' };
    constructor(_: any) {}
    once = vi.fn();
    on = vi.fn();
    login = vi.fn().mockResolvedValue(undefined);
    destroy = vi.fn();
  }
  return {
    Client: MockClient,
    Events: { ClientReady: 'ready', MessageCreate: 'messageCreate' },
    GatewayIntentBits: { Guilds: 1, GuildMessages: 2, MessageContent: 4 },
    Message: class {},
  };
});

// Mock DiscordService.setClient to be a no-op that accepts our mock client
vi.mock('@starbunk/shared/discord/discord-service', () => {
  return {
    DiscordService: class {
      static _instance: any;
      static getInstance() {
        if (!this._instance) this._instance = new this();
        return this._instance;
      }
      setClient = vi.fn();
    },
  };
});

import { CovaBot } from '../../src/cova-bot';

describe('CovaBot Orchestrator', () => {
  afterEach(async () => {
    await CovaBot.resetInstance();
    vi.restoreAllMocks();
  });

  it('throws when first initialization lacks config', () => {
    expect(() => CovaBot.getInstance()).toThrow();
  });

  it('initializes, starts and stops cleanly', async () => {
    const bot = CovaBot.getInstance({ discordToken: 'x', databasePath: ':memory:' });
    await bot.start();

    // Profiles loaded from mocked parser
    const profiles = bot.getAllProfiles();
    expect(profiles).toHaveLength(1);
    expect(profiles[0].id).toBe('p1');

    // Services should be present
    const services = bot.getServices();
    expect(services.memory).toBeDefined();
    expect(services.llm).toBeDefined();
    expect(services.embedding).toBeDefined();

    // Stop should cleanly teardown
    await bot.stop();
    // If no exception thrown, teardown path executed (client.destroy mocked inside)
  });

  it('resetInstance disposes singleton allowing fresh init', async () => {
    const first = CovaBot.getInstance({ discordToken: 'a' });
    await first.start();
    await CovaBot.resetInstance();
    const second = CovaBot.getInstance({ discordToken: 'b' });
    expect(second).toBeDefined();
  });
});
