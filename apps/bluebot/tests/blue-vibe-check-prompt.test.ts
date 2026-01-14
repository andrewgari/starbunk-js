import { describe, test, expect } from 'vitest';
import { createBlueVibeCheckPrompt, blueVibeCheckPrompt } from '../src/llm/prompts/blue-vibe-check';

describe('Blue Vibe Check Prompt Generation', () => {
	describe('createBlueVibeCheckPrompt', () => {
		test('creates prompt with friendly personality for non-enemy users', () => {
			const prompt = createBlueVibeCheckPrompt(false);
			
			expect(prompt).toBeDefined();
			expect(prompt.systemContent).toBeDefined();
			expect(prompt.formatUserMessage).toBeDefined();
			expect(prompt.defaultTemperature).toBe(0.3);
			expect(prompt.defaultMaxTokens).toBe(150);
		});

		test('creates prompt with enemy personality for enemy users', () => {
			const prompt = createBlueVibeCheckPrompt(true);
			
			expect(prompt).toBeDefined();
			expect(prompt.systemContent).toBeDefined();
			expect(prompt.formatUserMessage).toBeDefined();
			expect(prompt.defaultTemperature).toBe(0.3);
			expect(prompt.defaultMaxTokens).toBe(150);
		});

		test('friendly prompt contains positive personality traits', () => {
			const prompt = createBlueVibeCheckPrompt(false);
			const content = prompt.systemContent.toLowerCase();
			
			// Check for friendly personality indicators
			expect(content).toContain('nice');
			expect(content).toContain('friendly');
			expect(content).toContain('excited');
			expect(content).toContain('warm');
			expect(content).toContain('enthusiastic');
		});

		test('enemy prompt contains negative personality traits', () => {
			const prompt = createBlueVibeCheckPrompt(true);
			const content = prompt.systemContent.toLowerCase();
			
			// Check for enemy personality indicators
			expect(content).toContain('naughty list');
			expect(content).toContain('cold');
			expect(content).toContain('contemptuous');
			expect(content).toContain('dismissive');
			expect(content).toContain('sarcastic');
			expect(content).toContain('disdain');
		});

		test('friendly prompt has enthusiastic response examples', () => {
			const prompt = createBlueVibeCheckPrompt(false);
			const content = prompt.systemContent;
			
			// Check for friendly response examples
			expect(content).toContain('Did somebody say BLUE?!');
			expect(content).toContain('💙');
			expect(content).toContain('blue is the BEST');
		});

		test('enemy prompt has contemptuous response examples', () => {
			const prompt = createBlueVibeCheckPrompt(true);
			const content = prompt.systemContent;
			
			// Check for enemy response examples
			expect(content).toContain('Oh, YOU again');
			expect(content).toContain('🙄');
			expect(content).toContain('Blue is too good for');
			expect(content).toContain('As if');
		});

		test('both prompts contain core vibe categories', () => {
			const friendlyPrompt = createBlueVibeCheckPrompt(false);
			const enemyPrompt = createBlueVibeCheckPrompt(true);
			
			const vibeCategories = ['blueGeneral', 'blueSneaky', 'blueMention', 'blueRequest', 'notBlue'];
			
			vibeCategories.forEach(category => {
				expect(friendlyPrompt.systemContent).toContain(category);
				expect(enemyPrompt.systemContent).toContain(category);
			});
		});

		test('both prompts have the same structure for JSON response', () => {
			const friendlyPrompt = createBlueVibeCheckPrompt(false);
			const enemyPrompt = createBlueVibeCheckPrompt(true);
			
			const jsonFormat = '{"vibe": "vibeName", "intensity": N, "response": "your response here"}';
			
			expect(friendlyPrompt.systemContent).toContain(jsonFormat);
			expect(enemyPrompt.systemContent).toContain(jsonFormat);
		});

		test('formatUserMessage works the same for both prompt types', () => {
			const friendlyPrompt = createBlueVibeCheckPrompt(false);
			const enemyPrompt = createBlueVibeCheckPrompt(true);
			
			const testMessage = 'I love the color blue!';
			const friendlyFormatted = friendlyPrompt.formatUserMessage(testMessage);
			const enemyFormatted = enemyPrompt.formatUserMessage(testMessage);
			
			// Both should format the message the same way
			expect(friendlyFormatted).toContain(testMessage);
			expect(enemyFormatted).toContain(testMessage);
			expect(friendlyFormatted).toBe(enemyFormatted);
		});

		test('prompts have different response strategies for blueGeneral', () => {
			const friendlyPrompt = createBlueVibeCheckPrompt(false);
			const enemyPrompt = createBlueVibeCheckPrompt(true);
			
			// Friendly should have enthusiastic strategy
			expect(friendlyPrompt.systemContent).toContain('Enthusiastic and excited');
			
			// Enemy should have contemptuous strategy
			expect(enemyPrompt.systemContent).toContain('Cold and contemptuous');
		});

		test('prompts have different response strategies for blueRequest', () => {
			const friendlyPrompt = createBlueVibeCheckPrompt(false);
			const enemyPrompt = createBlueVibeCheckPrompt(true);
			
			// Friendly should fulfill requests
			expect(friendlyPrompt.systemContent).toContain('Fulfill the request');
			
			// Enemy should refuse requests
			expect(enemyPrompt.systemContent).toContain('Refuse with contempt');
		});
	});

	describe('blueVibeCheckPrompt (default export)', () => {
		test('default prompt is friendly (non-enemy)', () => {
			const content = blueVibeCheckPrompt.systemContent.toLowerCase();
			
			// Should have friendly traits
			expect(content).toContain('nice');
			expect(content).toContain('friendly');
			expect(content).toContain('excited');
			
			// Should NOT have enemy traits
			expect(content).not.toContain('naughty list');
			expect(content).not.toContain('contemptuous');
		});

		test('default prompt matches createBlueVibeCheckPrompt(false)', () => {
			const manualFriendly = createBlueVibeCheckPrompt(false);
			
			expect(blueVibeCheckPrompt.systemContent).toBe(manualFriendly.systemContent);
			expect(blueVibeCheckPrompt.defaultTemperature).toBe(manualFriendly.defaultTemperature);
			expect(blueVibeCheckPrompt.defaultMaxTokens).toBe(manualFriendly.defaultMaxTokens);
		});
	});
});

