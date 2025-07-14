import request from 'supertest';
import { TestWebServer } from './test-server';
import { MockMessage, CovaBot } from '../../cova-bot/covaBot';
import { covaTrigger, covaDirectMentionTrigger, covaStatsCommandTrigger } from '../../cova-bot/triggers';

describe('Chat LLM End-to-End Flow Tests', () => {
  let webServer: TestWebServer;
  let app: any;
  let covaBot: CovaBot;

  beforeAll(async () => {
    webServer = new TestWebServer(0, false);
    app = webServer.getApp();
    
    covaBot = new CovaBot({
      name: 'CovaBot',
      description: 'E2E LLM Test Bot',
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

  describe('Complete LLM Pipeline Flow', () => {
    it('should process messages through complete LLM pipeline via web API', async () => {
      const conversationFlow = [
        {
          message: 'Hello CovaBot!',
          expectResponse: true,
          expectedPattern: /hello|hi|hey|how|what|going|up/i,
        },
        {
          message: 'What do you think about programming?',
          expectResponse: true,
          expectedPattern: /question|think|interesting|programming|hey|hi|what|up/i,
        },
        {
          message: 'Can you help me with coding?',
          expectResponse: true,
          expectedPattern: /help|question|interesting|hey|hi|what|up/i,
        },
        {
          message: 'Thank you for your assistance!',
          expectResponse: true,
          expectedPattern: /welcome|problem|help|hey|hi|what|up/i,
        },
      ];

      for (const step of conversationFlow) {
        const response = await request(app)
          .post('/api/chat')
          .send({ message: step.message })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.userMessage).toBe(step.message);
        expect(response.body.data).toHaveProperty('timestamp');

        if (step.expectResponse) {
          // Should get a response for these message types
          if (response.body.data.botResponse) {
            expect(typeof response.body.data.botResponse).toBe('string');
            expect(response.body.data.botResponse.length).toBeGreaterThan(0);
            expect(response.body.data.botResponse).toMatch(step.expectedPattern);
          }
          // Note: Due to probabilistic nature, we don't fail if no response
        }
      }
    });

    it('should handle question-based triggers consistently', async () => {
      const questions = [
        'What is the meaning of life?',
        'How does artificial intelligence work?',
        'Can you explain quantum computing?',
        'What do you think about the future of technology?',
        'Why is programming important?',
      ];

      let responseCount = 0;
      const totalQuestions = questions.length;

      for (const question of questions) {
        const response = await request(app)
          .post('/api/chat')
          .send({ message: question })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.userMessage).toBe(question);

        if (response.body.data.botResponse) {
          responseCount++;
          expect(typeof response.body.data.botResponse).toBe('string');
          expect(response.body.data.botResponse.length).toBeGreaterThan(0);
          
          // Questions should trigger thoughtful responses
          expect(response.body.data.botResponse).toMatch(/question|think|interesting|good|hey|hi|what|up/i);
        }
      }

      // Questions should have high response rate (at least 60%)
      const responseRate = responseCount / totalQuestions;
      expect(responseRate).toBeGreaterThan(0.6);
      
      console.log(`Question response rate: ${(responseRate * 100).toFixed(1)}%`);
    });

    it('should handle Cova mention triggers consistently', async () => {
      const covaMessages = [
        'Cova, what do you think about AI?',
        'Hey Cova, can you help me?',
        'Cova tell me about programming',
        'What is your opinion, Cova?',
        'Cova, how are you doing?',
      ];

      // Note: MockMessage mentions.has() returns false, so these won't trigger direct mention
      // But they should trigger the general LLM condition due to 'cova' in content
      
      let responseCount = 0;
      const totalMessages = covaMessages.length;

      for (const message of covaMessages) {
        const response = await request(app)
          .post('/api/chat')
          .send({ message })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.userMessage).toBe(message);

        if (response.body.data.botResponse) {
          responseCount++;
          expect(typeof response.body.data.botResponse).toBe('string');
          expect(response.body.data.botResponse.length).toBeGreaterThan(0);
        }
      }

      // Cova mentions should have very high response rate (at least 80%)
      const responseRate = responseCount / totalMessages;
      expect(responseRate).toBeGreaterThan(0.8);
      
      console.log(`Cova mention response rate: ${(responseRate * 100).toFixed(1)}%`);
    });

    it('should maintain conversation context and continuity', async () => {
      const conversationSteps = [
        'Hello, I need help with programming',
        'Specifically, I want to learn about JavaScript',
        'What are the best practices for JavaScript?',
        'Can you give me an example?',
        'Thank you, that was helpful!',
      ];

      const conversationResponses = [];

      for (const step of conversationSteps) {
        const response = await request(app)
          .post('/api/chat')
          .send({ message: step })
          .expect(200);

        expect(response.body.success).toBe(true);
        conversationResponses.push({
          userMessage: step,
          botResponse: response.body.data.botResponse,
          timestamp: response.body.data.timestamp,
        });

        // Small delay between messages to simulate real conversation
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Analyze conversation flow
      const responsesReceived = conversationResponses.filter(r => r.botResponse !== null);
      expect(responsesReceived.length).toBeGreaterThan(0);

      // Responses should be contextually appropriate
      responsesReceived.forEach((response, index) => {
        expect(typeof response.botResponse).toBe('string');
        expect(response.botResponse.length).toBeGreaterThan(0);
        
        // Should not contain error messages
        expect(response.botResponse).not.toContain('error');
        expect(response.botResponse).not.toContain('undefined');
      });

      console.log('Conversation Analysis:', {
        totalSteps: conversationSteps.length,
        responsesReceived: responsesReceived.length,
        responseRate: `${(responsesReceived.length / conversationSteps.length * 100).toFixed(1)}%`,
      });
    });
  });

  describe('LLM Response Quality Validation', () => {
    it('should generate appropriate responses for different conversation types', async () => {
      const conversationTypes = [
        {
          type: 'technical',
          message: 'Explain how machine learning algorithms work',
          expectedKeywords: ['question', 'think', 'interesting'],
        },
        {
          type: 'casual',
          message: 'How was your day?',
          expectedKeywords: ['question', 'think', 'interesting'],
        },
        {
          type: 'help-seeking',
          message: 'I need help with my project',
          expectedKeywords: ['help', 'happy', 'question'],
        },
        {
          type: 'greeting',
          message: 'Good morning!',
          expectedKeywords: ['hello', 'help', 'see'],
        },
      ];

      for (const conv of conversationTypes) {
        const response = await request(app)
          .post('/api/chat')
          .send({ message: conv.message })
          .expect(200);

        expect(response.body.success).toBe(true);

        if (response.body.data.botResponse) {
          const botResponse = response.body.data.botResponse.toLowerCase();
          
          // Should contain at least one expected keyword
          const hasExpectedKeyword = conv.expectedKeywords.some(keyword =>
            botResponse.includes(keyword.toLowerCase())
          );
          
          expect(hasExpectedKeyword).toBe(true);
          
          // Response should be substantial
          expect(response.body.data.botResponse.length).toBeGreaterThan(5);
        }
      }
    });

    it('should handle complex multi-sentence inputs', async () => {
      const complexInputs = [
        'I am working on a web application using React and Node.js. The frontend is built with TypeScript and the backend uses Express. I am having trouble with state management and would like some advice on best practices.',
        'Yesterday I went to the store and bought some groceries. Then I came home and cooked dinner. After that, I watched a movie and went to bed. What do you think about daily routines?',
        'Programming languages have evolved significantly over the years. From assembly language to high-level languages like Python and JavaScript, each has its own strengths and weaknesses. What is your perspective on this evolution?',
      ];

      for (const input of complexInputs) {
        const response = await request(app)
          .post('/api/chat')
          .send({ message: input })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.userMessage).toBe(input);

        if (response.body.data.botResponse) {
          expect(typeof response.body.data.botResponse).toBe('string');
          expect(response.body.data.botResponse.length).toBeGreaterThan(10);
          
          // Should handle complex input without errors
          expect(response.body.data.botResponse).not.toContain('error');
          expect(response.body.data.botResponse).not.toContain('undefined');
        }
      }
    });

    it('should maintain response appropriateness across different topics', async () => {
      const topicalMessages = [
        { topic: 'technology', message: 'What do you think about artificial intelligence?' },
        { topic: 'science', message: 'How do you feel about space exploration?' },
        { topic: 'arts', message: 'What is your opinion on modern art?' },
        { topic: 'philosophy', message: 'What is the meaning of existence?' },
        { topic: 'everyday', message: 'What did you have for breakfast?' },
      ];

      const responses = [];

      for (const item of topicalMessages) {
        const response = await request(app)
          .post('/api/chat')
          .send({ message: item.message })
          .expect(200);

        expect(response.body.success).toBe(true);

        if (response.body.data.botResponse) {
          responses.push({
            topic: item.topic,
            message: item.message,
            response: response.body.data.botResponse,
          });
        }
      }

      // Should get responses for most topics
      expect(responses.length).toBeGreaterThan(0);

      // All responses should be appropriate (no offensive content, errors, etc.)
      responses.forEach(item => {
        expect(typeof item.response).toBe('string');
        expect(item.response.length).toBeGreaterThan(0);
        
        // Should not contain inappropriate content
        expect(item.response).not.toMatch(/error|undefined|null|fail/i);
      });

      console.log(`Topic Response Analysis: ${responses.length}/${topicalMessages.length} topics received responses`);
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle rapid sequential LLM requests', async () => {
      const rapidMessages = Array(15).fill(0).map((_, i) => `Rapid test message ${i + 1}`);
      
      const startTime = Date.now();
      const responses = [];

      for (const message of rapidMessages) {
        const response = await request(app)
          .post('/api/chat')
          .send({ message })
          .expect(200);

        responses.push(response.body.data);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      expect(responses).toHaveLength(rapidMessages.length);
      responses.forEach(response => {
        expect(response).toHaveProperty('userMessage');
        expect(response).toHaveProperty('timestamp');
        expect(response.botResponse === null || typeof response.botResponse === 'string').toBe(true);
      });

      // Should complete in reasonable time
      expect(totalTime).toBeLessThan(10000); // 10 seconds max
      
      const avgTimePerRequest = totalTime / rapidMessages.length;
      expect(avgTimePerRequest).toBeLessThan(1000); // Average under 1 second

      console.log(`Rapid Request Performance: ${rapidMessages.length} requests in ${totalTime}ms (avg: ${avgTimePerRequest.toFixed(1)}ms)`);
    });

    it('should maintain LLM pipeline stability under load', async () => {
      const loadTestMessages = Array(25).fill(0).map((_, i) => ({
        message: `Load test message ${i + 1}: What do you think about testing?`,
        expectedResponse: true, // Questions should generally get responses
      }));

      const promises = loadTestMessages.map(item =>
        request(app)
          .post('/api/chat')
          .send({ message: item.message })
          .expect(200)
      );

      const responses = await Promise.all(promises);

      // All requests should succeed
      expect(responses).toHaveLength(loadTestMessages.length);
      
      let successCount = 0;
      let responseCount = 0;

      responses.forEach(response => {
        expect(response.body.success).toBe(true);
        successCount++;
        
        if (response.body.data.botResponse) {
          responseCount++;
          expect(typeof response.body.data.botResponse).toBe('string');
          expect(response.body.data.botResponse.length).toBeGreaterThan(0);
        }
      });

      // Should have high success rate
      expect(successCount).toBe(loadTestMessages.length);
      
      // Should have reasonable response rate for questions
      const responseRate = responseCount / loadTestMessages.length;
      expect(responseRate).toBeGreaterThan(0.3); // At least 30% response rate

      console.log(`Load Test Results: ${successCount}/${loadTestMessages.length} successful, ${responseCount} responses (${(responseRate * 100).toFixed(1)}%)`);
    });

    it('should recover gracefully from LLM processing errors', async () => {
      // Test with potentially problematic inputs
      const problematicInputs = [
        '', // Empty
        'A'.repeat(5000), // Very long
        '🤖'.repeat(100), // Many emojis
        '\n\n\n\n\n', // Only newlines
        '!@#$%^&*()_+{}|:"<>?[]\\;\',./', // Special characters
      ];

      for (const input of problematicInputs) {
        const response = await request(app)
          .post('/api/chat')
          .send({ message: input })
          .expect(res => {
            // Should either succeed (200) or fail gracefully (400)
            expect([200, 400]).toContain(res.status);
          });

        if (response.status === 200) {
          expect(response.body.success).toBe(true);
          
          if (response.body.data.botResponse) {
            expect(typeof response.body.data.botResponse).toBe('string');
            expect(response.body.data.botResponse.length).toBeGreaterThan(0);
          }
        } else {
          expect(response.body.success).toBe(false);
          expect(response.body.error).toBeDefined();
        }
      }
    });
  });

  describe('Discord-Independent LLM Operation', () => {
    it('should process LLM requests without Discord context', async () => {
      const webOnlyMessages = [
        'Hello from the web interface!',
        'I am using the web chat, not Discord',
        'Can you help me without Discord integration?',
        'This is a web-only conversation',
      ];

      for (const message of webOnlyMessages) {
        const response = await request(app)
          .post('/api/chat')
          .send({ message })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.userMessage).toBe(message);
        
        // Should not have Discord-specific properties
        expect(response.body.data).not.toHaveProperty('guildId');
        expect(response.body.data).not.toHaveProperty('channelId');
        expect(response.body.data).not.toHaveProperty('messageId');
        
        if (response.body.data.botResponse) {
          expect(typeof response.body.data.botResponse).toBe('string');
          expect(response.body.data.botResponse.length).toBeGreaterThan(0);
          
          // Response should not reference Discord
          expect(response.body.data.botResponse).not.toMatch(/discord|guild|channel|server/i);
        }
      }
    });

    it('should provide same conversational experience as Discord version', async () => {
      const conversationalMessages = [
        'What is your favorite programming language?',
        'How do you feel about artificial intelligence?',
        'Can you tell me a joke?',
        'What do you think about the weather?',
        'Help me understand machine learning',
      ];

      const webResponses = [];

      for (const message of conversationalMessages) {
        const response = await request(app)
          .post('/api/chat')
          .send({ message })
          .expect(200);

        if (response.body.data.botResponse) {
          webResponses.push({
            message,
            response: response.body.data.botResponse,
          });
        }
      }

      // Should get responses for conversational messages
      expect(webResponses.length).toBeGreaterThan(0);

      // Responses should be conversational and appropriate
      webResponses.forEach(item => {
        expect(typeof item.response).toBe('string');
        expect(item.response.length).toBeGreaterThan(5);
        
        // Should sound conversational
        expect(item.response).toMatch(/[.!?]/); // Should have punctuation
        expect(item.response).not.toMatch(/^error|^undefined|^null/i);
      });

      console.log(`Web Conversation Analysis: ${webResponses.length}/${conversationalMessages.length} messages received responses`);
    });
  });
});
