import request from 'supertest';
import { WebServer } from '../server';

describe('Chat API - Comprehensive Testing', () => {
  let webServer: WebServer;
  let app: any;

  beforeAll(async () => {
    webServer = new WebServer(0, false); // Use port 0 for testing, no database
    app = webServer.getApp();
  });

  describe('POST /api/chat - Basic Functionality', () => {
    it('should accept a message and return a response', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'Hello CovaBot!' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('userMessage', 'Hello CovaBot!');
      expect(response.body.data).toHaveProperty('timestamp');

      // Bot response can be null (if bot chooses not to respond) or a string
      expect(response.body.data.botResponse === null || typeof response.body.data.botResponse === 'string').toBe(true);
    });

    it('should reject empty messages', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ message: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Message is required');
    });

    it('should reject missing message field', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Message is required');
    });

    it('should handle whitespace-only messages', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ message: '   \n\t   ' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Message is required');
    });

    it('should handle long messages', async () => {
      const longMessage = 'A'.repeat(1000);
      const response = await request(app)
        .post('/api/chat')
        .send({ message: longMessage })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userMessage).toBe(longMessage);
    });

    it('should return proper response structure when bot responds', async () => {
      // Try a message that's likely to get a response
      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'Hello, how are you?' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('userMessage');
      expect(response.body.data).toHaveProperty('timestamp');
      
      if (response.body.data.botResponse) {
        expect(typeof response.body.data.botResponse).toBe('string');
        expect(response.body.data.botResponse.length).toBeGreaterThan(0);
      } else {
        expect(response.body.data.botResponse).toBeNull();
        expect(response.body.data).toHaveProperty('reason');
      }
    });
  });

  describe('Chat Integration', () => {
    it('should process messages through CovaBot triggers', async () => {
      // Test multiple messages to see trigger behavior
      const messages = [
        'Hello!',
        'How are you?',
        'What is your name?',
        'Tell me a joke',
        'Goodbye'
      ];

      for (const message of messages) {
        const response = await request(app)
          .post('/api/chat')
          .send({ message })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.userMessage).toBe(message);
        
        // Each response should have the proper structure
        expect(response.body.data).toHaveProperty('timestamp');
        expect(new Date(response.body.data.timestamp)).toBeInstanceOf(Date);
      }
    });
  });

  describe('POST /api/chat - Input Validation & Edge Cases', () => {
    it('should handle special characters and Unicode', async () => {
      const specialMessages = [
        'Hello! 🤖 How are you?',
        'Testing émojis and àccénts',
        'Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?',
        '中文测试 Japanese: こんにちは',
        'Math symbols: ∑∆∇∂∫∞≠≤≥±×÷',
        'Quotes: "Hello" \'World\' `Code`'
      ];

      for (const message of specialMessages) {
        const response = await request(app)
          .post('/api/chat')
          .send({ message })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.userMessage).toBe(message);
      }
    });

    it('should handle very long messages', async () => {
      const longMessage = 'A'.repeat(5000);
      const response = await request(app)
        .post('/api/chat')
        .send({ message: longMessage })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userMessage).toBe(longMessage);
    });

    it('should handle extremely long messages gracefully', async () => {
      const extremelyLongMessage = 'X'.repeat(50000);
      const response = await request(app)
        .post('/api/chat')
        .send({ message: extremelyLongMessage })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userMessage).toBe(extremelyLongMessage);
    });

    it('should handle multiline messages', async () => {
      const multilineMessage = `Line 1
Line 2
Line 3
With tabs	and spaces`;

      const response = await request(app)
        .post('/api/chat')
        .send({ message: multilineMessage })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userMessage).toBe(multilineMessage);
    });

    it('should handle messages with only whitespace characters', async () => {
      const whitespaceMessages = [
        '   ',
        '\t\t\t',
        '\n\n\n',
        ' \t \n \r ',
        '　　　' // Full-width spaces
      ];

      for (const message of whitespaceMessages) {
        const response = await request(app)
          .post('/api/chat')
          .send({ message })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Message is required');
      }
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Content-Type', 'application/json')
        .send('{"message": "incomplete json"')
        .expect(500); // Express returns 500 for malformed JSON, not 400
    });

    it('should handle non-string message types', async () => {
      const invalidMessages = [
        { message: 123 },
        { message: true },
        { message: [] },
        { message: {} },
        { message: null }
      ];

      for (const payload of invalidMessages) {
        const response = await request(app)
          .post('/api/chat')
          .send(payload)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Message is required');
      }
    });
  });

  describe('POST /api/chat - Response Format Validation', () => {
    it('should always return consistent response structure', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'Test message' })
        .expect(200);

      // Validate response structure
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('userMessage');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('botResponse');

      // Validate timestamp format
      expect(new Date(response.body.data.timestamp)).toBeInstanceOf(Date);
      expect(response.body.data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should include reason when bot chooses not to respond', async () => {
      // Send multiple messages to potentially trigger a non-response
      const messages = Array(10).fill('test').map((_, i) => `test message ${i}`);

      for (const message of messages) {
        const response = await request(app)
          .post('/api/chat')
          .send({ message })
          .expect(200);

        if (response.body.data.botResponse === null) {
          expect(response.body.data).toHaveProperty('reason');
          expect(typeof response.body.data.reason).toBe('string');
          break;
        }
      }
    });

    it('should handle content-type variations', async () => {
      // Test with explicit content-type
      const response1 = await request(app)
        .post('/api/chat')
        .set('Content-Type', 'application/json')
        .send({ message: 'Hello' })
        .expect(200);

      expect(response1.body.success).toBe(true);

      // Test with charset
      const response2 = await request(app)
        .post('/api/chat')
        .set('Content-Type', 'application/json; charset=utf-8')
        .send({ message: 'Hello' })
        .expect(200);

      expect(response2.body.success).toBe(true);
    });
  });
});
