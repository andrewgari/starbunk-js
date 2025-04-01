import { PromptRegistry, PromptType, formatPromptMessages, getPromptDefaultOptions } from '../promptManager';

describe('PromptManager', () => {
  // Sample prompt for testing
  const testPrompt = {
    systemContent: 'You are a test assistant',
    formatUserMessage: (message: string) => `Test: ${message}`,
    defaultTemperature: 0.7,
    defaultMaxTokens: 500
  };

  // Reset registry before each test
  beforeEach(() => {
    // Clear all registered prompts
    PromptRegistry['prompts'] = new Map();
  });

  describe('PromptRegistry', () => {
    test('should register and retrieve a prompt', () => {
      PromptRegistry.registerPrompt(PromptType.BLUE_DETECTOR, testPrompt);
      
      const retrieved = PromptRegistry.getPrompt(PromptType.BLUE_DETECTOR);
      expect(retrieved).toBe(testPrompt);
    });

    test('should check if a prompt is registered', () => {
      PromptRegistry.registerPrompt(PromptType.BLUE_DETECTOR, testPrompt);
      
      expect(PromptRegistry.hasPrompt(PromptType.BLUE_DETECTOR)).toBe(true);
      expect(PromptRegistry.hasPrompt(PromptType.BLUE_ACKNOWLEDGMENT)).toBe(false);
    });

    test('should get all registered prompt types', () => {
      PromptRegistry.registerPrompt(PromptType.BLUE_DETECTOR, testPrompt);
      PromptRegistry.registerPrompt(PromptType.CONDITION_CHECK, testPrompt);
      
      const types = PromptRegistry.getPromptTypes();
      expect(types).toHaveLength(2);
      expect(types).toContain(PromptType.BLUE_DETECTOR);
      expect(types).toContain(PromptType.CONDITION_CHECK);
    });

    test('should return undefined for unregistered prompt', () => {
      const retrieved = PromptRegistry.getPrompt(PromptType.COVA_EMULATOR);
      expect(retrieved).toBeUndefined();
    });

    test('should overwrite prompt when registering with same type', () => {
      const firstPrompt = {
        systemContent: 'First prompt',
        formatUserMessage: (message: string) => message
      };
      
      const secondPrompt = {
        systemContent: 'Second prompt',
        formatUserMessage: (message: string) => message
      };
      
      PromptRegistry.registerPrompt(PromptType.BLUE_DETECTOR, firstPrompt);
      PromptRegistry.registerPrompt(PromptType.BLUE_DETECTOR, secondPrompt);
      
      const retrieved = PromptRegistry.getPrompt(PromptType.BLUE_DETECTOR);
      expect(retrieved).toBe(secondPrompt);
    });
  });

  describe('formatPromptMessages', () => {
    test('should format prompt messages correctly', () => {
      PromptRegistry.registerPrompt(PromptType.BLUE_DETECTOR, testPrompt);
      
      const messages = formatPromptMessages(PromptType.BLUE_DETECTOR, 'Hello world');
      
      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual({
        role: 'system',
        content: 'You are a test assistant'
      });
      expect(messages[1]).toEqual({
        role: 'user',
        content: 'Test: Hello world'
      });
    });

    test('should throw error for unregistered prompt type', () => {
      expect(() => {
        formatPromptMessages(PromptType.COVA_EMULATOR, 'Hello world');
      }).toThrow('Prompt type covaEmulator not registered');
    });
  });

  describe('getPromptDefaultOptions', () => {
    test('should return default options for a prompt', () => {
      PromptRegistry.registerPrompt(PromptType.BLUE_DETECTOR, testPrompt);
      
      const options = getPromptDefaultOptions(PromptType.BLUE_DETECTOR);
      
      expect(options).toEqual({
        temperature: 0.7,
        maxTokens: 500
      });
    });

    test('should handle prompts without default options', () => {
      const promptWithoutDefaults = {
        systemContent: 'Basic prompt',
        formatUserMessage: (message: string) => message
      };
      
      PromptRegistry.registerPrompt(PromptType.CONDITION_CHECK, promptWithoutDefaults);
      
      const options = getPromptDefaultOptions(PromptType.CONDITION_CHECK);
      
      expect(options).toEqual({
        temperature: undefined,
        maxTokens: undefined
      });
    });

    test('should throw error for unregistered prompt type', () => {
      expect(() => {
        getPromptDefaultOptions(PromptType.COVA_EMULATOR);
      }).toThrow('Prompt type covaEmulator not registered');
    });
  });
});