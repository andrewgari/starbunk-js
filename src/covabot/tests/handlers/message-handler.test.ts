import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Message, User, Guild } from 'discord.js';
import { MessageHandler } from '../../src/handlers/message-handler';
import type { CovaProfile } from '../../src/models/memory-types';

// Mock DiscordService singleton used inside the handler
const mockSendMessageWithBotIdentity = vi.fn();
const mockGetBotIdentityFromDiscord: any = vi.fn(async (..._args: any[]) => ({
  botName: 'Mimic',
  avatarUrl: 'x',
}));
let getClientImpl: any = () => ({ user: { id: 'bot-123' } });

vi.mock('@starbunk/shared/discord/discord-service', () => ({
  DiscordService: class {
    static _instance: any;
    static getInstance() {
      if (!this._instance) this._instance = new this();
      return this._instance;
    }
    getClient() {
      return getClientImpl();
    }
    sendMessageWithBotIdentity(message: any, identity: any, content: any) {
      return mockSendMessageWithBotIdentity(message, identity, content);
    }
    getBotIdentityFromDiscord(guildId: string, memberId: string) {
      return mockGetBotIdentityFromDiscord(guildId, memberId);
    }
  },
}));

// Minimal fake Message generator
function createMessage(
  overrides?: Partial<{
    id: string;
    content: string;
    authorId: string;
    authorUsername: string;
    channelId: string;
    guildId?: string;
  }>,
): Message {
  const cfg = {
    id: 'm1',
    content: 'hello there',
    authorId: 'u1',
    authorUsername: 'Alice',
    channelId: 'c1',
    guildId: 'g1',
    ...overrides,
  };
  return {
    id: cfg.id,
    content: cfg.content!,
    channelId: cfg.channelId!,
    author: { id: cfg.authorId!, username: cfg.authorUsername!, bot: false } as User,
    guild: cfg.guildId ? ({ id: cfg.guildId } as Guild) : null,
  } as unknown as Message;
}

describe('MessageHandler', () => {
  let profile: CovaProfile;
  let profiles: Map<string, CovaProfile>;

  // Service mocks
  const memoryService = {
    getChannelContext: vi.fn(async () => ({ messages: [] })),
    formatContextForLlm: vi.fn(() => ''),
    getUserFacts: vi.fn(async () => []),
    formatFactsForLlm: vi.fn(() => ''),
    storeConversation: vi.fn(async () => 1),
  } as any;

  const decisionService = {
    shouldRespond: vi.fn(),
  } as any;

  const llmService = {
    generateResponse: vi.fn(),
  } as any;

  const personalityService = {
    getTraitModifiersForLlm: vi.fn(() => 'be nice'),
    analyzeForEvolution: vi.fn(),
  } as any;

  const socialBatteryService = {
    recordMessage: vi.fn(async () => undefined),
  } as any;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockSendMessageWithBotIdentity.mockClear();
    mockGetBotIdentityFromDiscord.mockClear();
    getClientImpl = () => ({ user: { id: 'bot-123' } });

    profile = {
      id: 'p1',
      displayName: 'Test',
      identity: { type: 'static', botName: 'Test' },
      personality: {
        systemPrompt: 'You are Test.',
        traits: [],
        interests: [],
        speechPatterns: { lowercase: true, sarcasmLevel: 0.1, technicalBias: 0.1 },
      },
      triggers: [],
      socialBattery: { maxMessages: 5, windowMinutes: 10, cooldownSeconds: 30 },
      llmConfig: { model: 'fake', temperature: 0.2, max_tokens: 64 },
      ignoreBots: true,
    };
    profiles = new Map([[profile.id, profile]]);
  });

  it('sends pattern response and records memory + battery', async () => {
    decisionService.shouldRespond.mockResolvedValue({
      shouldRespond: true,
      reason: 'pattern_trigger',
      useLlm: false,
      patternResponse: 'Hi there!',
      triggerName: 'greeting',
    });

    const handler = new MessageHandler(
      profiles,
      memoryService,
      decisionService,
      llmService,
      personalityService,
      socialBatteryService,
    );

    const msg = createMessage({ content: 'hello there' });
    await handler.handleMessage(msg);

    expect(mockSendMessageWithBotIdentity).toHaveBeenCalled();
    expect(memoryService.storeConversation).toHaveBeenCalledWith(
      profile.id,
      msg.channelId,
      msg.author.id,
      msg.author.username,
      msg.content,
      'Hi there!',
    );
    expect(socialBatteryService.recordMessage).toHaveBeenCalled();
    expect(personalityService.analyzeForEvolution).toHaveBeenCalled();
  });

  it('uses LLM when required and records memory', async () => {
    decisionService.shouldRespond.mockResolvedValue({
      shouldRespond: true,
      reason: 'pattern_trigger',
      useLlm: true,
    });
    llmService.generateResponse.mockResolvedValue({
      content: 'sure, how can i help?',
      shouldIgnore: false,
      tokensUsed: 10,
      model: 'm',
      provider: 'p',
    });

    const handler = new MessageHandler(
      profiles,
      memoryService,
      decisionService,
      llmService,
      personalityService,
      socialBatteryService,
    );

    const msg = createMessage({ content: 'help me' });
    await handler.handleMessage(msg);

    expect(llmService.generateResponse).toHaveBeenCalled();
    expect(mockSendMessageWithBotIdentity).toHaveBeenCalled();
    const call = memoryService.storeConversation.mock.calls.at(-1);
    expect(call[5]).toBe('sure, how can i help?');
  });

  it('skips sending when LLM says to ignore', async () => {
    // Ensure previous calls do not leak into this test
    mockSendMessageWithBotIdentity.mockReset();
    memoryService.storeConversation.mockReset();
    socialBatteryService.recordMessage.mockReset();
    decisionService.shouldRespond.mockResolvedValueOnce({
      shouldRespond: true,
      reason: 'llm_response',
      useLlm: true,
    });
    llmService.generateResponse.mockResolvedValueOnce({
      content: '',
      shouldIgnore: true,
      tokensUsed: 0,
      model: 'm',
      provider: 'p',
    });

    const handler = new MessageHandler(
      profiles,
      memoryService,
      decisionService,
      llmService,
      personalityService,
      socialBatteryService,
    );

    const msg = createMessage({ content: 'ping' });
    await handler.handleMessage(msg);

    expect(mockSendMessageWithBotIdentity).not.toHaveBeenCalled();
    expect(memoryService.storeConversation).not.toHaveBeenCalled();
    expect(socialBatteryService.recordMessage).not.toHaveBeenCalled();
  });

  it('returns early if bot user id is unavailable', async () => {
    getClientImpl = () => ({ user: undefined });
    decisionService.shouldRespond.mockReset();
    const handler = new MessageHandler(
      profiles,
      memoryService,
      decisionService,
      llmService,
      personalityService,
      socialBatteryService,
    );
    const msg = createMessage({ content: 'hello' });
    await handler.handleMessage(msg);
    expect(decisionService.shouldRespond).not.toHaveBeenCalled();
  });
});
