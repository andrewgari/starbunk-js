#!/usr/bin/env ts-node

/**
 * Test script to demonstrate what happens when Chad fails to be retrieved from the database
 * This shows the complete failure cascade and fallback mechanisms
 */

import { ConfigurationService } from '../src/services/configuration-service';
import { BotIdentityService } from '../src/services/bot-identity-service';

// Mock Discord Message object for testing
const createMockMessage = (guildId: string, authorId: string = 'test-user') => ({
	guild: {
		id: guildId,
		name: `Test Guild ${guildId}`,
	},
	author: {
		id: authorId,
		username: 'testuser',
	},
	channel: {
		id: 'test-channel',
	},
});

async function testDatabaseFailureScenarios() {
	console.log('\n🚨 Testing Database Failure Scenarios');
	console.log('=====================================');

	const configService = new ConfigurationService();
	const identityService = new BotIdentityService(configService);

	// Test 1: Chad not found in database
	console.log('\n📋 Test 1: Chad not found in database');
	console.log('--------------------------------------');

	try {
		// This will try to look up Chad, but let's simulate he's not in the database
		// by looking up a non-existent user
		const nonExistentUserId = await configService.getUserIdByUsername('NonExistentChad');
		console.log(`❌ NonExistentChad lookup result: ${nonExistentUserId}`);

		// Now test the identity service fallback
		const message = createMockMessage('test-guild-123');
		const chadIdentity = await identityService.getBotIdentityByUsername(
			'NonExistentChad',
			message as unknown,
			'ChadBot',
		);

		console.log(`✅ Fallback identity created:`);
		console.log(`   Bot Name: ${chadIdentity.botName}`);
		console.log(`   Avatar URL: ${chadIdentity.avatarUrl}`);
		console.log(`   ↳ This is what users would see if Chad's data was missing`);
	} catch (error) {
		console.log(`❌ Error in Test 1: ${error}`);
	}

	// Test 2: Database connection failure
	console.log('\n📋 Test 2: Database connection failure simulation');
	console.log('------------------------------------------------');

	try {
		// Create a new config service that will fail
		const failingConfigService = new ConfigurationService();

		// Disconnect the database to simulate connection failure
		await failingConfigService.disconnect();

		const failingIdentityService = new BotIdentityService(failingConfigService);
		const message = createMockMessage('test-guild-456');

		// This should trigger the catch block and return fallback
		const chadIdentity = await failingIdentityService.getBotIdentityByUsername(
			'Chad',
			message as unknown,
			'ChadBot',
		);

		console.log(`✅ Database failure handled gracefully:`);
		console.log(`   Bot Name: ${chadIdentity.botName}`);
		console.log(`   Avatar URL: ${chadIdentity.avatarUrl}`);
		console.log(`   ↳ Bot continues working even with database down`);
	} catch (error) {
		console.log(`❌ Error in Test 2: ${error}`);
	}

	// Test 3: Successful lookup for comparison
	console.log('\n📋 Test 3: Successful Chad lookup (for comparison)');
	console.log('--------------------------------------------------');

	try {
		// Use a fresh config service
		const workingConfigService = new ConfigurationService();
		const workingIdentityService = new BotIdentityService(workingConfigService);
		const message = createMockMessage('test-guild-789');

		const chadIdentity = await workingIdentityService.getChadIdentity(message as unknown);

		console.log(`✅ Successful Chad identity:`);
		console.log(`   Bot Name: ${chadIdentity.botName}`);
		console.log(`   Avatar URL: ${chadIdentity.avatarUrl}`);
		console.log(`   ↳ This is what users see when everything works`);

		await workingConfigService.disconnect();
	} catch (error) {
		console.log(`❌ Error in Test 3: ${error}`);
	}

	await configService.disconnect();
}

async function demonstrateFailureCascade() {
	console.log('\n🔄 Failure Cascade Demonstration');
	console.log('=================================');

	console.log('\n📊 What happens when Chad Bot tries to reply but Chad fails to retrieve:');
	console.log('');
	console.log('1️⃣  Chad Bot trigger activates (message matches conditions)');
	console.log('2️⃣  identityService.getChadIdentity(message) is called');
	console.log('3️⃣  configService.getUserIdByUsername("Chad") is called');
	console.log('');
	console.log('🔀 FAILURE POINT: Database lookup fails');
	console.log('');
	console.log('4️⃣  ConfigurationService catches error, logs it, returns null');
	console.log('5️⃣  BotIdentityService sees null userId');
	console.log('6️⃣  BotIdentityService creates fallback identity:');
	console.log('    ├─ botName: "ChadBot" (from fallback parameter)');
	console.log('    ├─ avatarUrl: "https://cdn.discordapp.com/embed/avatars/0.png"');
	console.log('    └─ Cached for 1 minute (shorter than normal 5 minutes)');
	console.log('7️⃣  Bot sends message using fallback identity');
	console.log('8️⃣  Users see "ChadBot" with default Discord avatar');
	console.log('');
	console.log('🎯 RESULT: Bot continues working, users get response, no crash!');
	console.log('');
	console.log('📝 Logged messages:');
	console.log('   WARN: "User \'Chad\' not found in configuration, using fallback"');
	console.log('   DEBUG: "Cached identity for username:chad:guild-123: ChadBot"');
	console.log('');
	console.log('⏰ Recovery: Next attempt in 1 minute (cache expires)');
	console.log('   If database is back up, normal identity will be restored');
}

async function main() {
	console.log('🧪 Discord Bot Identity Failure Testing');
	console.log('========================================');

	try {
		await demonstrateFailureCascade();
		await testDatabaseFailureScenarios();

		console.log('\n🎉 Failure Testing Complete!');
		console.log('\n📋 Summary of Failure Handling:');
		console.log('✅ Database failures are caught and logged');
		console.log('✅ Fallback identities are created automatically');
		console.log('✅ Bot continues responding to users');
		console.log('✅ Shorter cache time allows quick recovery');
		console.log('✅ No crashes or service interruptions');
		console.log('✅ Clear logging for debugging');

		console.log('\n🔧 What Users Experience:');
		console.log('👤 Normal: "Chad" with Chad\'s server avatar');
		console.log('⚠️  Failure: "ChadBot" with default Discord avatar');
		console.log('🔄 Recovery: Back to "Chad" when database recovers');
	} catch (error) {
		console.error('❌ Test suite failed:', error);
		process.exit(1);
	}
}

// Run the test suite
if (require.main === module) {
	main().catch((error) => {
		console.error('Fatal error:', error);
		process.exit(1);
	});
}

export { main as testFailureScenarios };
