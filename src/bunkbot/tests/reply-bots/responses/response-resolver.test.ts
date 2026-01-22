import { describe, it, expect } from 'vitest';
import { ResponseResolver } from '@/reply-bots/resolvers/response-resolver';
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

    it('should handle inverted range (min > max) by swapping', async () => {
      const message = createMockMessage('test');
      const template = 'a{random:10-5:h}a';

      const result = await ResponseResolver.resolve(template, message as Message);

      // Should swap to 5-10 range
      expect(result).toMatch(/^a[h]+a$/);
      const hCount = (result.match(/h/g) || []).length;
      expect(hCount).toBeGreaterThanOrEqual(5);
      expect(hCount).toBeLessThanOrEqual(10);
    });

    it('should handle zero minimum', async () => {
      const message = createMockMessage('test');
      const template = 'x{random:0-3:y}x';

      const result = await ResponseResolver.resolve(template, message as Message);

      // Should allow 0-3 y's (could be empty)
      expect(result).toMatch(/^x[y]{0,3}x$/);
    });

    it('should cap extremely large ranges at MAX_RANDOM_REPEAT', async () => {
      const message = createMockMessage('test');
      const template = 'a{random:1-999999:b}c';

      const result = await ResponseResolver.resolve(template, message as Message);

      // Should be capped at 1000 (MAX_RANDOM_REPEAT)
      const bCount = (result.match(/b/g) || []).length;
      expect(bCount).toBeGreaterThanOrEqual(1);
      expect(bCount).toBeLessThanOrEqual(1000);
    });

    it('should handle invalid placeholder with non-numeric values gracefully', async () => {
      const message = createMockMessage('test');
      // This won't match the pattern due to \d+ requirement, so it stays unchanged
      const template = 'test {random:abc-def:x} test';

      const result = await ResponseResolver.resolve(template, message as Message);

      // Should leave invalid placeholder unchanged
      expect(result).toBe('test {random:abc-def:x} test');
    });

    it('should limit character string to 32 characters', async () => {
      const message = createMockMessage('test');
      // This should match because it's within 32 chars
      const template = 'a{random:2-3:verylongstring}b';

      const result = await ResponseResolver.resolve(template, message as Message);

      // Should repeat the string 2-3 times
      expect(result).toMatch(/^a(verylongstring){2,3}b$/);
    });

    it('should not match placeholder with char segment containing }', async () => {
      const message = createMockMessage('test');
      // The regex won't match because char can't contain }
      const template = 'test {random:1-5:a}b} test';

      const result = await ResponseResolver.resolve(template, message as Message);

      // Should only match up to the first }
      expect(result).toMatch(/^test [a]+b\} test$/);
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

  describe('{swap_message:word1:word2} placeholder', () => {
    it('should swap check with czech', async () => {
      const message = createMockMessage('Let me check the fridge');
      const template = 'I think you meant: {swap_message:check:czech}';

      const result = await ResponseResolver.resolve(template, message as Message);

      expect(result).toBe('I think you meant: Let me czech the fridge');
    });

    it('should swap czech with check', async () => {
      const message = createMockMessage('I am from the Czech Republic');
      const template = 'I think you meant: {swap_message:check:czech}';

      const result = await ResponseResolver.resolve(template, message as Message);

      expect(result).toBe('I think you meant: I am from the Check Republic');
    });

    it('should swap both directions in the same message', async () => {
      const message = createMockMessage('Czech your check');
      const template = 'I think you meant: {swap_message:check:czech}';

      const result = await ResponseResolver.resolve(template, message as Message);

      expect(result).toBe('I think you meant: Check your czech');
    });

    it('should preserve uppercase case', async () => {
      const message = createMockMessage('CHECK the CZECH');
      const template = '{swap_message:check:czech}';

      const result = await ResponseResolver.resolve(template, message as Message);

      expect(result).toBe('CZECH the CHECK');
    });

    it('should preserve lowercase case', async () => {
      const message = createMockMessage('check the czech');
      const template = '{swap_message:check:czech}';

      const result = await ResponseResolver.resolve(template, message as Message);

      expect(result).toBe('czech the check');
    });

    it('should preserve title case', async () => {
      const message = createMockMessage('Check the Czech');
      const template = '{swap_message:check:czech}';

      const result = await ResponseResolver.resolve(template, message as Message);

      expect(result).toBe('Czech the Check');
    });

    it('should handle multiple occurrences of the same word', async () => {
      const message = createMockMessage('check check check');
      const template = '{swap_message:check:czech}';

      const result = await ResponseResolver.resolve(template, message as Message);

      expect(result).toBe('czech czech czech');
    });

    it('should only match whole words (word boundaries)', async () => {
      const message = createMockMessage('checking and rechecked');
      const template = '{swap_message:check:czech}';

      const result = await ResponseResolver.resolve(template, message as Message);

      // Should not change "checking" or "rechecked" - only whole word "check"
      expect(result).toBe('checking and rechecked');
    });

    it('should handle message with no matches', async () => {
      const message = createMockMessage('Hello world');
      const template = 'I think you meant: {swap_message:check:czech}';

      const result = await ResponseResolver.resolve(template, message as Message);

      expect(result).toBe('I think you meant: Hello world');
    });

    it('should leave invalid placeholder unchanged', async () => {
      const message = createMockMessage('test');
      const template = 'test {swap_message:} test';

      const result = await ResponseResolver.resolve(template, message as Message);

      // Invalid placeholder (empty word1) - the regex won't match
      expect(result).toBe('test {swap_message:} test');
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

