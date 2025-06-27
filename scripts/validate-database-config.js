#!/usr/bin/env node

/**
 * Validation script for database-driven configuration system
 * Tests database connectivity, configuration loading, and bot creation
 */

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

class DatabaseConfigValidator {
	constructor() {
		this.prisma = null;
		this.results = [];
	}

	async initialize() {
		console.log('🔧 Initializing Database Configuration Validator...');
		
		if (!process.env.DATABASE_URL) {
			throw new Error('DATABASE_URL environment variable is required');
		}

		this.prisma = new PrismaClient({
			datasources: {
				db: {
					url: process.env.DATABASE_URL,
				},
			},
		});

		console.log('✅ Prisma client initialized');
	}

	async runValidation() {
		console.log('🧪 Starting database configuration validation...');
		console.log('');

		await this.testDatabaseConnection();
		await this.testUserConfigurations();
		await this.testBotConfigurations();
		await this.testServerConfigurations();
		await this.testBotPatterns();
		await this.testBotResponses();

		this.printResults();
	}

	async testDatabaseConnection() {
		console.log('🔌 Testing database connection...');
		
		try {
			await this.prisma.$connect();
			await this.prisma.$queryRaw`SELECT 1`;
			this.recordResult('Database Connection', true, 'Successfully connected to PostgreSQL');
		} catch (error) {
			this.recordResult('Database Connection', false, `Failed to connect: ${error.message}`);
		}
	}

	async testUserConfigurations() {
		console.log('👥 Testing user configurations...');
		
		try {
			const users = await this.prisma.userConfiguration.findMany();
			const expectedUsers = ['Cova', 'Venn', 'Bender', 'Sig', 'Guy', 'Guildus', 'Deaf', 'Feli', 'Goose', 'Chad', 'Ian'];
			
			const foundUsernames = users.map(u => u.username);
			const missingUsers = expectedUsers.filter(u => !foundUsernames.includes(u));
			
			if (missingUsers.length === 0) {
				this.recordResult('User Configurations', true, `Found all ${users.length} expected users`);
			} else {
				this.recordResult('User Configurations', false, `Missing users: ${missingUsers.join(', ')}`);
			}

			// Test specific user lookup
			const covaUser = await this.prisma.userConfiguration.findFirst({
				where: { username: 'Cova' }
			});
			
			if (covaUser && covaUser.userId === '139592376443338752') {
				this.recordResult('Cova User ID', true, `Correct user ID: ${covaUser.userId}`);
			} else {
				this.recordResult('Cova User ID', false, `Incorrect or missing Cova user ID`);
			}

		} catch (error) {
			this.recordResult('User Configurations', false, `Error: ${error.message}`);
		}
	}

	async testBotConfigurations() {
		console.log('🤖 Testing bot configurations...');
		
		try {
			const bots = await this.prisma.botConfiguration.findMany({
				where: { isEnabled: true }
			});
			
			const expectedBots = ['nice-bot', 'cova-bot'];
			const foundBotNames = bots.map(b => b.botName);
			const missingBots = expectedBots.filter(b => !foundBotNames.includes(b));
			
			if (missingBots.length === 0) {
				this.recordResult('Bot Configurations', true, `Found all ${bots.length} expected bots`);
			} else {
				this.recordResult('Bot Configurations', false, `Missing bots: ${missingBots.join(', ')}`);
			}

			// Test specific bot
			const niceBot = await this.prisma.botConfiguration.findFirst({
				where: { botName: 'nice-bot' }
			});
			
			if (niceBot && niceBot.isEnabled) {
				this.recordResult('Nice Bot Config', true, `Nice bot is enabled: ${niceBot.displayName}`);
			} else {
				this.recordResult('Nice Bot Config', false, 'Nice bot not found or disabled');
			}

		} catch (error) {
			this.recordResult('Bot Configurations', false, `Error: ${error.message}`);
		}
	}

	async testServerConfigurations() {
		console.log('🏠 Testing server configurations...');
		
		try {
			const servers = await this.prisma.serverConfiguration.findMany();
			
			if (servers.length > 0) {
				this.recordResult('Server Configurations', true, `Found ${servers.length} server configurations`);
				
				// Test specific server
				const testServer = await this.prisma.serverConfiguration.findFirst({
					where: { serverId: '753251582719688714' }
				});
				
				if (testServer) {
					this.recordResult('Test Server Config', true, `Found test server: ${testServer.serverName}`);
				} else {
					this.recordResult('Test Server Config', false, 'Test server configuration not found');
				}
			} else {
				this.recordResult('Server Configurations', false, 'No server configurations found');
			}

		} catch (error) {
			this.recordResult('Server Configurations', false, `Error: ${error.message}`);
		}
	}

	async testBotPatterns() {
		console.log('🎯 Testing bot patterns...');
		
		try {
			const patterns = await this.prisma.botPattern.findMany({
				where: { isEnabled: true },
				include: { botConfig: true }
			});
			
			if (patterns.length > 0) {
				this.recordResult('Bot Patterns', true, `Found ${patterns.length} enabled patterns`);
				
				// Test nice bot pattern
				const nicePattern = patterns.find(p => p.botConfig.botName === 'nice-bot');
				if (nicePattern) {
					// Test regex compilation
					try {
						const regex = new RegExp(nicePattern.pattern, nicePattern.patternFlags || '');
						const testMatch = regex.test('69');
						
						if (testMatch) {
							this.recordResult('Nice Bot Pattern', true, 'Pattern correctly matches "69"');
						} else {
							this.recordResult('Nice Bot Pattern', false, 'Pattern does not match "69"');
						}
					} catch (regexError) {
						this.recordResult('Nice Bot Pattern', false, `Invalid regex: ${regexError.message}`);
					}
				} else {
					this.recordResult('Nice Bot Pattern', false, 'Nice bot pattern not found');
				}
			} else {
				this.recordResult('Bot Patterns', false, 'No enabled patterns found');
			}

		} catch (error) {
			this.recordResult('Bot Patterns', false, `Error: ${error.message}`);
		}
	}

	async testBotResponses() {
		console.log('💬 Testing bot responses...');
		
		try {
			const responses = await this.prisma.botResponse.findMany({
				where: { isEnabled: true },
				include: { botConfig: true }
			});
			
			if (responses.length > 0) {
				this.recordResult('Bot Responses', true, `Found ${responses.length} enabled responses`);
				
				// Test nice bot response
				const niceResponse = responses.find(r => r.botConfig.botName === 'nice-bot');
				if (niceResponse && niceResponse.content === 'Nice.') {
					this.recordResult('Nice Bot Response', true, `Correct response: "${niceResponse.content}"`);
				} else {
					this.recordResult('Nice Bot Response', false, 'Nice bot response not found or incorrect');
				}
			} else {
				this.recordResult('Bot Responses', false, 'No enabled responses found');
			}

		} catch (error) {
			this.recordResult('Bot Responses', false, `Error: ${error.message}`);
		}
	}

	recordResult(test, success, details) {
		this.results.push({ test, success, details });
		const status = success ? '✅ PASS' : '❌ FAIL';
		console.log(`   ${status}: ${details}`);
	}

	printResults() {
		console.log('');
		console.log('📊 Validation Results Summary');
		console.log('=============================');

		const totalTests = this.results.length;
		const passedTests = this.results.filter(r => r.success).length;
		const failedTests = totalTests - passedTests;

		console.log(`Total Tests: ${totalTests}`);
		console.log(`Passed: ${passedTests}`);
		console.log(`Failed: ${failedTests}`);
		console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
		console.log('');

		if (failedTests > 0) {
			console.log('❌ Failed Tests:');
			this.results.filter(r => !r.success).forEach(result => {
				console.log(`   - ${result.test}: ${result.details}`);
			});
			console.log('');
		}

		if (passedTests === totalTests) {
			console.log('🎉 All validation tests passed!');
			console.log('✅ Database-driven configuration system is ready');
			console.log('');
			console.log('Next steps:');
			console.log('1. Build containers: docker-compose build');
			console.log('2. Start snapshot stack: docker-compose -f docker-compose.snapshot.yml up');
			console.log('3. Test reply bots: npm run test:bots');
		} else {
			console.log('⚠️  Some validation tests failed');
			console.log('Please review the failed tests and fix any issues before proceeding');
		}
	}

	async cleanup() {
		if (this.prisma) {
			await this.prisma.$disconnect();
		}
	}
}

// Main execution
async function main() {
	const validator = new DatabaseConfigValidator();

	try {
		await validator.initialize();
		await validator.runValidation();
	} catch (error) {
		console.error('❌ Validation failed:', error);
		process.exit(1);
	} finally {
		await validator.cleanup();
	}
}

if (require.main === module) {
	main().catch(error => {
		console.error('Fatal error:', error);
		process.exit(1);
	});
}
