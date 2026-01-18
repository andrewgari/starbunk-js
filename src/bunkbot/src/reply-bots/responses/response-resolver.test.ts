import { describe, it, expect } from 'vitest';
import { ResponseResolver } from './response-resolver';
import { Message } from 'discord.js';

// Helper to create a mock message
function createMockMessage(content: string): Partial<Message> {
  return {
    content,
    author: {
      id: '123456789',
    } as any,
  } as Partial<Message>;
}

describe('ResponseResolver', () => {
  describe('{start} placeholder', () => {
    it('should replace {start} with first 3 words', async () => {
      const message = createMockMessage('Hello world this is a test');
      const template = '{start} Oh, sorry... go ahead';

      const result = await ResponseResolver.resolve(template, message as Message);

      expect(result).toContain('***Hello world thi...***');
      expect(result).toContain('Oh, sorry... go ahead');
    });

    it('should limit {start} to 15 characters', async () => {
      const message = createMockMessage('Supercalifragilisticexpialidocious word');
      const template = '{start} interrupted!';

      const result = await ResponseResolver.resolve(template, message as Message);

      // Should be truncated to 15 chars
      expect(result).toContain('***Supercalifragil...***');
    });

    it('should handle short messages', async () => {
      const message = createMockMessage('Hi');
      const template = '{start} wait...';

      const result = await ResponseResolver.resolve(template, message as Message);

      expect(result).toContain('***Hi...***');
    });
  });

  describe('{random:min-max:char} placeholder', () => {
    it('should replace {random:2-20:e} with random e\'s', async () => {
      const message = createMockMessage('test');
      const template = 'sh{random:2-20:e}sh 😤';

      const result = await ResponseResolver.resolve(template, message as Message);

      // Should start with 'sh' and end with 'sh 😤'
      expect(result).toMatch(/^sh[e]+sh 😤$/);

      // Count the e's - should be between 2 and 20
      const eCount = (result.match(/e/g) || []).length;
      expect(eCount).toBeGreaterThanOrEqual(2);
      expect(eCount).toBeLessThanOrEqual(20);
    });

    it('should handle multiple random placeholders', async () => {
      const message = createMockMessage('test');
      const template = 'a{random:1-3:h}h b{random:2-4:o}o';

      const result = await ResponseResolver.resolve(template, message as Message);

      // Should match pattern with variable h's and o's
      expect(result).toMatch(/^a[h]+h b[o]+o$/);
    });

    it('should work with multi-character strings', async () => {
      const message = createMockMessage('test');
      const template = 'ha{random:2-5:ha}!';

      const result = await ResponseResolver.resolve(template, message as Message);

      // Should repeat 'ha' 2-5 times after the initial 'ha'
      expect(result).toMatch(/^ha(ha)+!$/);

      // Count occurrences of 'ha' (should be 3-6 total: 1 initial + 2-5 repeated)
      const haCount = (result.match(/ha/g) || []).length;
      expect(haCount).toBeGreaterThanOrEqual(3);
      expect(haCount).toBeLessThanOrEqual(6);
    });

    it('should handle min === max', async () => {
      const message = createMockMessage('test');
      const template = 'w{random:5-5:o}w';

      const result = await ResponseResolver.resolve(template, message as Message);

      // Should always be exactly 5 o's
      expect(result).toBe('wooooow');
    });
  });

  describe('Combined placeholders', () => {
    it('should handle both {start} and {random} in same template', async () => {
      const message = createMockMessage('Hey what is up');
      const template = '{start} sh{random:2-10:e}sh!';

      const result = await ResponseResolver.resolve(template, message as Message);

      expect(result).toContain('***Hey what is...***');
      expect(result).toMatch(/sh[e]+sh!$/);
    });
  });

  describe('No placeholders', () => {
    it('should return template unchanged if no placeholders', async () => {
      const message = createMockMessage('test');
      const template = 'Just a regular response';

      const result = await ResponseResolver.resolve(template, message as Message);

      expect(result).toBe('Just a regular response');
    });
  });
});

