import request from 'supertest';
import { WebServer } from '../server';

describe('Chat API', () => {
  let webServer: WebServer;
  let app: any;

  beforeAll(async () => {
    webServer = new WebServer(0, false); // Use port 0 for testing, no database
    app = webServer.getApp();
  });

  describe('POST /api/chat', () => {
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
});
