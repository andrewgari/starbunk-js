import request from 'supertest';
import { TestWebServer } from './test-server';

describe('Chat End-to-End Integration Tests', () => {
  let webServer: TestWebServer;
  let app: any;

  beforeAll(async () => {
    webServer = new TestWebServer(0, false); // Use port 0 for testing, no database
    app = webServer.getApp();
  });

  describe('Complete Conversation Flows', () => {
    it('should handle a complete conversation sequence', async () => {
      const conversationFlow = [
        'Hello CovaBot!',
        'How are you doing today?',
        'What is your favorite programming language?',
        'Can you help me with a coding problem?',
        'Thank you for your help!',
        'Goodbye!'
      ];

      const responses = [];
      
      for (const message of conversationFlow) {
        const response = await request(app)
          .post('/api/chat')
          .send({ message })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.userMessage).toBe(message);
        responses.push(response.body.data);
      }

      // Verify conversation continuity
      expect(responses).toHaveLength(conversationFlow.length);
      responses.forEach((response, index) => {
        expect(response.userMessage).toBe(conversationFlow[index]);
        expect(response).toHaveProperty('timestamp');
      });
    });

    it('should handle mixed message types in conversation', async () => {
      const mixedMessages = [
        '/stats',                                    // Command
        'Hello Cova, how are you?',                 // Direct mention
        'What do you think about AI?',              // General question
        '🤖 Testing with emojis! 😊',              // Special characters
        'This is a very long message that contains multiple sentences and should test how the bot handles more complex input with various topics, questions, and statements all combined together.',
        '',                                         // Empty (should fail)
        'Final message'                             // Normal message
      ];

      for (let i = 0; i < mixedMessages.length; i++) {
        const message = mixedMessages[i];
        
        if (message === '') {
          // Empty message should return 400
          await request(app)
            .post('/api/chat')
            .send({ message })
            .expect(400);
        } else {
          const response = await request(app)
            .post('/api/chat')
            .send({ message })
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.data.userMessage).toBe(message);
        }
      }
    });

    it('should maintain response consistency for similar messages', async () => {
      const similarMessages = [
        'Hello',
        'Hi',
        'Hey',
        'Greetings',
        'Good morning'
      ];

      const responses = [];
      
      for (const message of similarMessages) {
        const response = await request(app)
          .post('/api/chat')
          .send({ message })
          .expect(200);

        responses.push(response.body.data);
      }

      // Check that similar messages get handled consistently
      const responseTypes = responses.map(r => r.botResponse === null ? 'no-response' : 'response');
      const uniqueTypes = [...new Set(responseTypes)];
      
      // Should show some consistency in handling similar greeting messages
      expect(uniqueTypes.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple simultaneous requests', async () => {
      const concurrentMessages = Array(10).fill(0).map((_, i) => `Concurrent message ${i + 1}`);
      
      const promises = concurrentMessages.map(message =>
        request(app)
          .post('/api/chat')
          .send({ message })
          .expect(200)
      );

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach((response, index) => {
        expect(response.body.success).toBe(true);
        expect(response.body.data.userMessage).toBe(concurrentMessages[index]);
      });
    });

    it('should handle rapid sequential requests', async () => {
      const rapidMessages = Array(20).fill(0).map((_, i) => `Rapid message ${i + 1}`);
      
      const startTime = Date.now();
      
      for (const message of rapidMessages) {
        await request(app)
          .post('/api/chat')
          .send({ message })
          .expect(200);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(10000); // 10 seconds
    });

    it('should handle mixed valid and invalid requests', async () => {
      const mixedRequests = [
        { message: 'Valid message 1' },
        { message: '' },                    // Invalid
        { message: 'Valid message 2' },
        { notMessage: 'Invalid field' },    // Invalid
        { message: 'Valid message 3' },
        { message: null },                  // Invalid
        { message: 'Valid message 4' }
      ];

      for (const request_body of mixedRequests) {
        if (request_body.message === '' || request_body.message === null || !request_body.message) {
          await request(app)
            .post('/api/chat')
            .send(request_body)
            .expect(400);
        } else {
          const response = await request(app)
            .post('/api/chat')
            .send(request_body)
            .expect(200);

          expect(response.body.success).toBe(true);
        }
      }
    });
  });

  describe('Error Recovery and Graceful Degradation', () => {
    it('should recover from malformed requests', async () => {
      // Send malformed request
      await request(app)
        .post('/api/chat')
        .send('invalid json')
        .expect(400);

      // Should still handle valid request after malformed one
      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'Recovery test' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle requests with missing content-type', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'Test without explicit content-type' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle oversized payloads gracefully', async () => {
      const oversizedMessage = 'X'.repeat(100000); // 100KB message
      
      const response = await request(app)
        .post('/api/chat')
        .send({ message: oversizedMessage })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userMessage).toBe(oversizedMessage);
    });
  });

  describe('Response Time and Performance', () => {
    it('should respond within acceptable time limits', async () => {
      const testMessages = [
        'Quick response test',
        'How are you?',
        'What is the meaning of life?',
        'Tell me about programming',
        'Can you help me?'
      ];

      for (const message of testMessages) {
        const startTime = Date.now();
        
        const response = await request(app)
          .post('/api/chat')
          .send({ message })
          .expect(200);

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // Should respond within 5 seconds
        expect(responseTime).toBeLessThan(5000);
        expect(response.body.success).toBe(true);
      }
    });

    it('should maintain performance under load', async () => {
      const loadTestMessages = Array(50).fill(0).map((_, i) => `Load test message ${i + 1}`);
      
      const startTime = Date.now();
      
      const promises = loadTestMessages.map(message =>
        request(app)
          .post('/api/chat')
          .send({ message })
          .expect(200)
      );

      const responses = await Promise.all(promises);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / loadTestMessages.length;

      // Average response time should be reasonable
      expect(averageTime).toBeLessThan(1000); // 1 second average
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Integration with CovaBot Features', () => {
    it('should properly integrate with trigger system', async () => {
      const triggerTestMessages = [
        '/stats',                           // Should trigger stats command
        'Cova, what do you think?',        // Should trigger direct mention
        'What is your opinion on AI?',     // Should trigger general conversation
        'Random unrelated message',        // May or may not trigger
      ];

      for (const message of triggerTestMessages) {
        const response = await request(app)
          .post('/api/chat')
          .send({ message })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.userMessage).toBe(message);
        
        // Response should be either null or a meaningful string
        if (response.body.data.botResponse !== null) {
          expect(typeof response.body.data.botResponse).toBe('string');
          expect(response.body.data.botResponse.length).toBeGreaterThan(0);
        }
      }
    });

    it('should handle web-specific behavior correctly', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'Test web-specific behavior' })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Should not attempt Discord-specific operations
      expect(response.body.data).not.toHaveProperty('webhookUsed');
      expect(response.body.data).not.toHaveProperty('discordMessageId');
    });
  });
});
