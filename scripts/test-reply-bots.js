#!/usr/bin/env node

/**
 * Test script for validating all reply bots work correctly with database-driven configuration
 * This script simulates Discord messages and tests bot responses
 */

const { Client, GatewayIntentBits } = require('discord.js');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Test configuration
const TEST_CONFIG = {
	// Test messages for different bots
	testMessages: [
		{
			botName: 'nice-bot',
			content: 'The number is 69',
			expectedResponse: 'Nice.',
			description: 'Nice bot should respond to 69'
		},
		{
			botName: 'nice-bot',
			content: 'sixty-nine is a number',
			expectedResponse: 'Nice.',
			description: 'Nice bot should respond to sixty-nine'
		},
		{
			botName: 'nice-bot',
			content: 'The number is 42',
			expectedResponse: null,
			description: 'Nice bot should NOT respond to 42'
		},
		{
			botName: 'blue-bot',
			content: 'blu?',
			expectedResponse: 'Did somebody say Blu?',
			description: 'Blue bot should respond to blu?'
		},
		{
			botName: 'hold-bot',
			content: 'Hold',
			expectedResponse: 'Hold.',
			description: 'Hold bot should respond to Hold'
		},
		{
			botName: 'attitude-bot',
			content: 'you can\'t do that',
			expectedResponse: 'Well, not with *THAT* attitude!!!',
			description: 'Attitude bot should respond to "can\'t" statements'
		},
		{
			botName: 'chaos-bot',
			content: 'chaos',
			expectedResponse: 'All I know is...I\'m here to kill Chaos',
			description: 'Chaos bot should respond to chaos'
		},
		{
			botName: 'pickle-bot',
			content: 'gremlin',
			expectedResponse: 'Could you repeat that? I don\'t speak *gremlin*',
			description: 'Pickle bot should respond to gremlin'
		},
		{
			botName: 'spider-bot',
			content: 'spiderman',
			expectedResponse: 'Spider-Man',
			description: 'Spider bot should correct hyphen in spiderman'
		},
		{
			botName: 'check-bot',
			content: 'check',
			expectedResponse: 'czech',
			description: 'Check bot should respond with czech'
		},
		{
			botName: 'banana-bot',
			content: 'banana',
			expectedResponse: 'banana',
			description: 'Banana bot should respond to banana'
		},
		{
			botName: 'baby-bot',
			content: 'baby',
			expectedResponse: 'https://media.tenor.com/NpnXNhWqKcwAAAAC/metroid-samus.gif',
			description: 'Baby bot should respond with metroid gif'
		},
		{
			botName: 'sheesh-bot',
			content: 'sheesh',
			expectedResponse: 'SHEEEESH',
			description: 'Sheesh bot should respond to sheesh'
		},
		{
			botName: 'ezio-bot',
			content: 'ezio',
			expectedResponse: 'Nothing is true; Everything is permitted',
			description: 'Ezio bot should respond with Assassin\'s Creed quote'
		},
		{
			botName: 'gundam-bot',
			content: 'gundam',
			expectedResponse: 'That\'s the famous Unicorn Robot, "Gandum". There, I said it.',
			description: 'Gundam bot should respond to gundam'
		},
		{
			botName: 'macaroni-bot',
			content: 'macaroni',
			expectedResponse: 'Correction: you mean Venn "Tyrone "The "Macaroni" Man" Johnson" Caelum',
			description: 'Macaroni bot should respond to macaroni'
		},
		{
			botName: 'music-correct-bot',
			content: '!play some music',
			expectedResponse: 'I see you\'re trying to activate the music bot',
			description: 'Music correct bot should respond to !play commands'
		},
		{
			botName: 'bot-bot',
			content: 'Hello from another bot',
			expectedResponse: 'Hello fellow bot!',
			description: 'Bot bot should respond to other bot messages (5% chance)',
			isFromBot: true
		},
		{
			botName: 'example-bot',
			content: 'example',
			expectedResponse: 'This is an example response from the simplified bot architecture!',
			description: 'Example bot should respond to example keyword'
		}
	],
	
	// Test timeout in milliseconds
	timeout: 5000,
	
	// Channel to use for testing (if specified)
	testChannelId: process.env.TESTING_CHANNEL_IDS?.split(',')[0],
	
	// Server to use for testing
	testServerId: process.env.TESTING_SERVER_IDS?.split(',')[0] || process.env.GUILD_ID,
};

class ReplyBotTester {
	constructor() {
		this.client = null;
		this.testResults = [];
		this.isReady = false;
	}

	async initialize() {
		console.log('🤖 Initializing Reply Bot Tester...');
		
		// Validate environment
		if (!process.env.STARBUNK_TOKEN && !process.env.BUNKBOT_TOKEN) {
			throw new Error('No Discord token found. Set STARBUNK_TOKEN or BUNKBOT_TOKEN.');
		}

		if (!TEST_CONFIG.testServerId) {
			throw new Error('No test server ID found. Set GUILD_ID or TESTING_SERVER_IDS.');
		}

		// Create Discord client for testing
		this.client = new Client({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.MessageContent,
			],
		});

		// Set up event handlers
		this.client.once('ready', () => {
			console.log(`✅ Test client ready as ${this.client.user.tag}`);
			this.isReady = true;
		});

		this.client.on('error', (error) => {
			console.error('❌ Discord client error:', error);
		});

		// Login with test token (use a different token if available)
		const token = process.env.BUNKBOT_TOKEN || process.env.STARBUNK_TOKEN;
		await this.client.login(token);

		// Wait for ready
		await this.waitForReady();
	}

	async waitForReady() {
		return new Promise((resolve) => {
			if (this.isReady) {
				resolve();
			} else {
				this.client.once('ready', resolve);
			}
		});
	}

	async runTests() {
		console.log('🧪 Starting reply bot tests...');
		console.log(`📊 Testing ${TEST_CONFIG.testMessages.length} scenarios`);
		console.log('');

		for (const testCase of TEST_CONFIG.testMessages) {
			await this.runSingleTest(testCase);
			// Wait between tests to avoid rate limiting
			await this.sleep(1000);
		}

		this.printResults();
	}

	async runSingleTest(testCase) {
		console.log(`🔍 Testing: ${testCase.description}`);
		console.log(`   Message: "${testCase.content}"`);
		console.log(`   Expected: ${testCase.expectedResponse || 'No response'}`);

		try {
			// Get test channel
			const channel = await this.getTestChannel();
			if (!channel) {
				this.recordResult(testCase, false, 'No test channel available');
				return;
			}

			// Send test message
			const sentMessage = await channel.send(testCase.content);
			console.log(`   📤 Sent test message: ${sentMessage.id}`);

			// Wait for potential response
			const response = await this.waitForResponse(channel, testCase.expectedResponse !== null);

			// Validate response
			const success = this.validateResponse(testCase, response);
			this.recordResult(testCase, success, response ? `Got: "${response.content}"` : 'No response received');

			// Clean up test message
			try {
				await sentMessage.delete();
				if (response) {
					await response.delete();
				}
			} catch (error) {
				console.log('   ⚠️  Could not clean up messages (missing permissions)');
			}

		} catch (error) {
			console.error(`   ❌ Test failed with error:`, error.message);
			this.recordResult(testCase, false, `Error: ${error.message}`);
		}

		console.log('');
	}

	async getTestChannel() {
		try {
			// Try to get specific test channel
			if (TEST_CONFIG.testChannelId) {
				const channel = await this.client.channels.fetch(TEST_CONFIG.testChannelId);
				if (channel) {
					return channel;
				}
			}

			// Fallback to first available channel in test server
			const guild = await this.client.guilds.fetch(TEST_CONFIG.testServerId);
			const channels = await guild.channels.fetch();
			
			// Find a text channel we can send messages to
			for (const [id, channel] of channels) {
				if (channel.type === 0 && channel.permissionsFor(this.client.user).has('SendMessages')) {
					console.log(`   📍 Using channel: #${channel.name} (${channel.id})`);
					return channel;
				}
			}

			return null;
		} catch (error) {
			console.error('   ❌ Failed to get test channel:', error.message);
			return null;
		}
	}

	async waitForResponse(channel, expectResponse) {
		return new Promise((resolve) => {
			const timeout = setTimeout(() => {
				resolve(null);
			}, TEST_CONFIG.timeout);

			if (!expectResponse) {
				// If we don't expect a response, wait a shorter time and return null
				setTimeout(() => {
					clearTimeout(timeout);
					resolve(null);
				}, 2000);
				return;
			}

			const messageHandler = (message) => {
				// Check if this is a bot response (not from our test client)
				if (message.author.bot && message.author.id !== this.client.user.id) {
					clearTimeout(timeout);
					this.client.off('messageCreate', messageHandler);
					resolve(message);
				}
			};

			this.client.on('messageCreate', messageHandler);
		});
	}

	validateResponse(testCase, response) {
		if (testCase.expectedResponse === null) {
			// We expect no response
			return response === null;
		} else {
			// We expect a specific response
			return response && response.content.includes(testCase.expectedResponse);
		}
	}

	recordResult(testCase, success, details) {
		this.testResults.push({
			botName: testCase.botName,
			description: testCase.description,
			success,
			details,
		});

		const status = success ? '✅ PASS' : '❌ FAIL';
		console.log(`   ${status}: ${details}`);
	}

	printResults() {
		console.log('📊 Test Results Summary');
		console.log('========================');

		const totalTests = this.testResults.length;
		const passedTests = this.testResults.filter(r => r.success).length;
		const failedTests = totalTests - passedTests;

		console.log(`Total Tests: ${totalTests}`);
		console.log(`Passed: ${passedTests}`);
		console.log(`Failed: ${failedTests}`);
		console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
		console.log('');

		if (failedTests > 0) {
			console.log('❌ Failed Tests:');
			this.testResults.filter(r => !r.success).forEach(result => {
				console.log(`   - ${result.botName}: ${result.description}`);
				console.log(`     ${result.details}`);
			});
		}

		console.log('');
		console.log(passedTests === totalTests ? '🎉 All tests passed!' : '⚠️  Some tests failed');
	}

	sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	async cleanup() {
		if (this.client) {
			await this.client.destroy();
		}
	}
}

// Main execution
async function main() {
	const tester = new ReplyBotTester();

	try {
		await tester.initialize();
		await tester.runTests();
	} catch (error) {
		console.error('❌ Test execution failed:', error);
		process.exit(1);
	} finally {
		await tester.cleanup();
	}
}

if (require.main === module) {
	main().catch(error => {
		console.error('Fatal error:', error);
		process.exit(1);
	});
}
