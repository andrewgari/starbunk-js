import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LlmService } from '../../src/services/llm-service';
import type { CovaProfile, LlmContext } from '../../src/models/memory-types';

// Capture last call from fake provider manager
let lastMessages: any[] | null = null;
let lastOptions: any | null = null;

// Mock @starbunk/shared exports used by LlmService
vi.mock('@starbunk/shared', () => {
  class FakeLlmProviderManager {
    _config: any;
    constructor(config?: any) {
      this._config = config;
    }
    async generateCompletion(messages: any[], options: any) {
      lastMessages = messages;
      lastOptions = options;
      return {
        content: 'This Is A TEST RESPONSE',
        tokensUsed: 42,
        model: options.model || 'fake-model',
        provider: 'fake-provider',
      };
    }
    hasAvailableProvider() {
      return true;
    }
  }
  return {
    LlmProviderManager: FakeLlmProviderManager,
  };
});

const baseProfile: CovaProfile = {
  id: 'p1',
  displayName: 'Bot',
  identity: { type: 'static', botName: 'Bot' },
  personality: {
    systemPrompt: 'You are helpful.',
    traits: ['friendly'],
    interests: ['testing', 'typescript'],
    speechPatterns: { lowercase: true, sarcasmLevel: 0.5, technicalBias: 0.5 },
  },
  triggers: [],
  socialBattery: { maxMessages: 3, windowMinutes: 10, cooldownSeconds: 5 },
  llmConfig: { model: 'test-model', temperature: 0.3, max_tokens: 128 },
  ignoreBots: true,
};

const baseContext: LlmContext = {
  systemPrompt: baseProfile.personality.systemPrompt,
  conversationHistory: 'Alice: hi\nBot: hello',
  userFacts: "Alice's interests: hobby: coding",
  traitModifiers: 'Be concise.',
};

describe('LlmService', () => {
  beforeEach(() => {
    lastMessages = null;
    lastOptions = null;
  });

  it('builds messages, calls provider and applies speech patterns', async () => {
    const svc = new LlmService();
    const res = await svc.generateResponse(baseProfile, baseContext, 'Can you help?', 'Alice');

    // Lowercase transformation should be applied
    expect(res.content).toBe('this is a test response');
    expect(res.shouldIgnore).toBe(false);
    expect(res.tokensUsed).toBe(42);
    expect(res.model).toBe('test-model');
    expect(res.provider).toBe('fake-provider');

    // Verify messages shape
    expect(lastMessages).toBeTruthy();
    expect(lastMessages![0]).toEqual(expect.objectContaining({ role: 'system' }));
    const sys = String(lastMessages![0].content);
    // System should include style line and modifiers
    expect(sys).toContain('Style:');
    expect(sys).toContain('respond in lowercase');
    expect(sys).toContain('include occasional sarcasm');
    expect(sys).toContain('balance technical and casual language');
    expect(sys).toContain('Be concise.');

    // Conversation and facts included as system prompts
    expect(
      lastMessages!.some(
        m => m.role === 'system' && String(m.content).includes('Recent conversation'),
      ),
    ).toBe(true);
    expect(
      lastMessages!.some(
        m => m.role === 'system' && String(m.content).includes('What you know about Alice'),
      ),
    ).toBe(true);

    // Options mapping
    expect(lastOptions).toEqual(
      expect.objectContaining({
        model: 'test-model',
        temperature: 0.3,
        maxTokens: 128,
      }),
    );
  });

  it('marks shouldIgnore when marker is present and strips it', async () => {
    // Override mock to return ignore marker
    const { LlmProviderManager } = await import('@starbunk/shared');
    vi.spyOn(LlmProviderManager.prototype as any, 'generateCompletion').mockResolvedValue({
      content: 'hello <IGNORE_CONVERSATION> later',
      tokensUsed: 1,
      model: 'm',
      provider: 'p',
    });

    const svc = new LlmService();
    const res = await svc.generateResponse(baseProfile, baseContext, 'Ping?', 'Bob');
    expect(res.shouldIgnore).toBe(true);
    // When shouldIgnore is true, service returns empty content
    expect(res.content).toBe('');
  });

  it('exposes provider manager and isConfigured', () => {
    const svc = new LlmService();
    expect(svc.isConfigured()).toBe(true);
    expect(svc.getProviderManager()).toBeDefined();
  });

  it('rethrows on provider failure', async () => {
    const { LlmProviderManager } = await import('@starbunk/shared');
    vi.spyOn(LlmProviderManager.prototype as any, 'generateCompletion').mockRejectedValue(
      new Error('boom'),
    );

    const svc = new LlmService();
    await expect(svc.generateResponse(baseProfile, baseContext, 'x', 'y')).rejects.toThrow('boom');
  });
});
