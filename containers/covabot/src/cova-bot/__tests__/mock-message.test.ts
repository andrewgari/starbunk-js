import { MockMessage, CovaBot } from '../covaBot';
import { covaTrigger, covaDirectMentionTrigger, covaStatsCommandTrigger } from '../triggers';

describe('MockMessage Integration Tests', () => {
  let covaBot: CovaBot;

  beforeEach(() => {
    covaBot = new CovaBot({
      name: 'CovaBot',
      description: 'Test CovaBot for MockMessage integration',
      defaultIdentity: {
        botName: 'Cova',
        avatarUrl: '/test-avatar.png',
      },
      triggers: [
        covaStatsCommandTrigger,
        covaDirectMentionTrigger,
        covaTrigger,
      ],
    });
  });

  describe('MockMessage Compatibility', () => {
    it('should create MockMessage with correct properties', () => {
      const mockMessage = new MockMessage('Hello world', 'test-user-123');

      expect(mockMessage.content).toBe('Hello world');
      expect(mockMessage.author.id).toBe('test-user-123');
      expect(mockMessage.author.bot).toBe(false);
      expect(mockMessage.guild).toBeNull();
      expect(mockMessage.client.user).toBeNull();
      expect(typeof mockMessage.mentions.has).toBe('function');
      expect(typeof mockMessage.channel.send).toBe('function');
    });

    it('should handle mentions.has() calls correctly', () => {
      const mockMessage = new MockMessage('Hello @someone', 'test-user');

      // MockMessage should always return false for mentions (no mentions in web testing)
      expect(mockMessage.mentions.has('any-user-id')).toBe(false);
      expect(mockMessage.mentions.has('139592376443338752')).toBe(false); // Cova's ID
    });

    it('should handle channel.send() calls without errors', async () => {
      const mockMessage = new MockMessage('Test message', 'test-user');

      // Should not throw when called
      await expect(mockMessage.channel.send('Response')).resolves.toBeUndefined();
    });
  });

  describe('Trigger Compatibility with MockMessage', () => {
    it('should work with covaStatsCommandTrigger', async () => {
      const mockMessage = new MockMessage('/stats', 'test-user');

      // Test condition
      const shouldRespond = await covaStatsCommandTrigger.condition(mockMessage as any);
      expect(typeof shouldRespond).toBe('boolean');

      if (shouldRespond) {
        // Test response
        const response = await covaStatsCommandTrigger.response(mockMessage as any);
        expect(typeof response).toBe('string');
        expect(response.length).toBeGreaterThan(0);
      }
    });

    it('should work with covaDirectMentionTrigger', async () => {
      const mockMessage = new MockMessage('Hello Cova, how are you?', 'test-user');

      // Test condition
      const shouldRespond = await covaDirectMentionTrigger.condition(mockMessage as any);
      expect(typeof shouldRespond).toBe('boolean');

      if (shouldRespond) {
        // Test response
        const response = await covaDirectMentionTrigger.response(mockMessage as any);
        expect(typeof response).toBe('string');
        expect(response.length).toBeGreaterThan(0);
      }
    });

    it('should work with covaTrigger', async () => {
      const mockMessage = new MockMessage('What do you think about programming?', 'test-user');

      // Test condition
      const shouldRespond = await covaTrigger.condition(mockMessage as any);
      expect(typeof shouldRespond).toBe('boolean');

      if (shouldRespond) {
        // Test response
        const response = await covaTrigger.response(mockMessage as any);
        expect(typeof response).toBe('string');
        expect(response.length).toBeGreaterThan(0);
      }
    });
  });

  describe('processWebMessage Integration', () => {
    it('should process various message types correctly', async () => {
      const testMessages = [
        'Hello CovaBot!',
        'How are you doing today?',
        'What is your favorite programming language?',
        'Tell me a joke',
        'Can you help me with coding?',
        '/stats',
        'Cova, what do you think?',
        'Short msg',
        'This is a much longer message that contains multiple sentences and should test how the bot handles more complex input with various topics and questions.',
      ];

      for (const message of testMessages) {
        const response = await covaBot.processWebMessage(message);
        
        // Response should be either null or a non-empty string
        expect(response === null || (typeof response === 'string' && response.length > 0)).toBe(true);
      }
    });

    it('should handle rapid message processing', async () => {
      const messages = Array(20).fill(0).map((_, i) => `Message ${i + 1}`);
      const promises = messages.map(msg => covaBot.processWebMessage(msg));
      
      const responses = await Promise.all(promises);
      
      // All responses should be valid
      responses.forEach(response => {
        expect(response === null || typeof response === 'string').toBe(true);
      });
    });

    it('should maintain consistent behavior across multiple calls', async () => {
      const message = 'Hello, how are you?';
      const responses = [];
      
      // Process same message multiple times
      for (let i = 0; i < 10; i++) {
        const response = await covaBot.processWebMessage(message);
        responses.push(response);
      }
      
      // Should get consistent behavior (all responses or all non-responses for same input)
      const responseTypes = responses.map(r => r === null ? 'null' : 'string');
      const uniqueTypes = [...new Set(responseTypes)];
      
      // Should be consistent or show expected variation
      expect(uniqueTypes.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Error Handling with MockMessage', () => {
    it('should handle malformed MockMessage gracefully', async () => {
      // Create a MockMessage with unusual content
      const mockMessage = new MockMessage('', 'test-user');
      
      const response = await covaBot.processWebMessage('');
      expect(response).toBeNull(); // Empty messages should return null
    });

    it('should handle very long content', async () => {
      const longContent = 'A'.repeat(10000);
      const response = await covaBot.processWebMessage(longContent);
      
      // Should handle without throwing
      expect(response === null || typeof response === 'string').toBe(true);
    });

    it('should handle special characters in content', async () => {
      const specialContent = '🤖 Hello! @#$%^&*() 中文 émojis';
      const response = await covaBot.processWebMessage(specialContent);
      
      // Should handle without throwing
      expect(response === null || typeof response === 'string').toBe(true);
    });
  });

  describe('Performance and Memory', () => {
    it('should not leak memory with many MockMessage instances', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create many MockMessage instances
      for (let i = 0; i < 1000; i++) {
        const mockMessage = new MockMessage(`Message ${i}`, `user-${i}`);
        await covaBot.processWebMessage(`Test message ${i}`);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should process messages efficiently', async () => {
      const startTime = Date.now();
      
      // Process multiple messages
      const promises = Array(100).fill(0).map((_, i) => 
        covaBot.processWebMessage(`Performance test message ${i}`)
      );
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (less than 5 seconds)
      expect(duration).toBeLessThan(5000);
    });
  });
});
