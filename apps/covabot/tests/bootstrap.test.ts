// Basic test for CovaBot container bootstrap
describe('CovaBot Container', () => {
	it('should have minimal bootstrap functionality', () => {
		// Test that the container can be imported without errors
		expect(() => {
			require('../src/index');
		}).not.toThrow();
	});

	it('should handle optional LLM services', () => {
		// Should work with or without LLM API keys
		const originalOpenAI = process.env.OPENAI_API_KEY;
		const originalOllama = process.env.OLLAMA_API_URL;

		delete process.env.OPENAI_API_KEY;
		delete process.env.OLLAMA_API_URL;

		expect(() => {
			const { validateEnvironment } = require('@starbunk/shared');
			validateEnvironment({
				required: ['COVABOT_TOKEN'],
				optional: ['DATABASE_URL', 'OPENAI_API_KEY', 'OLLAMA_API_URL'],
			});
		}).not.toThrow();

		// Restore environment
		if (originalOpenAI) process.env.OPENAI_API_KEY = originalOpenAI;
		if (originalOllama) process.env.OLLAMA_API_URL = originalOllama;
	});
});

describe('CovaBot Message Handling - No Hardcoded Values', () => {
	const fs = require('fs');
	const path = require('path');

	// Read the source file for static analysis
	const sourceFilePath = path.join(__dirname, '../src/index.ts');
	const sourceCode = fs.readFileSync(sourceFilePath, 'utf-8');

	it('should NOT contain hardcoded response arrays in handleMessage', () => {
		// The old code had responses like "I'm learning from every conversation! 🧠"
		const hardcodedResponses = [
			"I'm learning from every conversation",
			"That's an interesting perspective",
			'I love chatting with humans',
			'Tell me more about that',
			"Fascinating! I'm always curious",
		];

		hardcodedResponses.forEach((response) => {
			expect(sourceCode).not.toContain(response);
		});
	});

	it('should NOT contain hardcoded avatar URL in handleMessage', () => {
		// The old code had: avatarURL: 'https://cdn.discordapp.com/embed/avatars/1.png'
		expect(sourceCode).not.toContain('cdn.discordapp.com/embed/avatars/');
	});

	it('should NOT use any default Discord avatar URLs', () => {
		// Discord provides default avatars at /embed/avatars/0.png through /embed/avatars/5.png
		// These should NEVER be used - bots should always use dynamic identity from Discord
		const defaultAvatarPattern = /cdn\.discordapp\.com\/embed\/avatars\/\d+\.png/g;
		const matches = sourceCode.match(defaultAvatarPattern);
		expect(matches).toBeNull();
	});

	it('should NOT have hardcoded username "Cova" with static avatar', () => {
		// Check that 'username: \'Cova\'' or "username: 'Cova'" is not directly assigned
		// This pattern was the old hardcoded approach
		const hardcodedUsernamePattern = /username:\s*['"]Cova['"],?\s*\n\s*avatarURL:\s*['"]https:\/\/cdn\.discordapp\.com\/embed/;
		expect(sourceCode).not.toMatch(hardcodedUsernamePattern);
	});

	it('should use LLM service for response generation', () => {
		// Verify that the code imports and uses LLMService
		expect(sourceCode).toContain("import { createLLMService, LLMService } from './services/llm-service'");
		expect(sourceCode).toContain('this.llmService.generateResponse');
		expect(sourceCode).toContain('this.llmService.shouldRespond');
	});

	it('should use dynamic identity service', () => {
		// Verify that the code imports and uses getCovaIdentity
		expect(sourceCode).toContain("import { getCovaIdentity } from './services/identity'");
		expect(sourceCode).toContain('getCovaIdentity(message)');
	});

	it('should use identity for username and avatar', () => {
		// Verify that username and avatarURL come from identity object
		expect(sourceCode).toContain('username: identity.botName');
		expect(sourceCode).toContain('avatarURL: identity.avatarUrl');
	});

	it('should use channel.send for posting responses', () => {
		// Verify that channel-based sending is used for posting
		expect(sourceCode).toContain('textChannel.send(response)');
	});
});
