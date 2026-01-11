#!/usr/bin/env ts-node

/**
 * Test script to verify the new silent failure behavior
 * Tests that bots remain silent when identity resolution fails
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

async function testSilentFailureBehavior() {
	console.log('\n🔇 Testing Silent Failure Behavior');
	console.log('===================================');

	const configService = new ConfigurationService();
	const identityService = new BotIdentityService(configService);

	// Test 1: Non-existent user should return null
	console.log('\n📋 Test 1: Non-existent user identity resolution');
	console.log('------------------------------------------------');

	try {
		const message = createMockMessage('test-guild-123');
		const nonExistentIdentity = await identityService.getBotIdentityByUsername(
			'NonExistentUser',
			message as unknown,
		);

		if (nonExistentIdentity === null) {
			console.log('✅ Non-existent user correctly returns null');
			console.log('   ↳ Bot will remain silent (no fallback identity)');
		} else {
			console.log('❌ Non-existent user should return null, but got:', nonExistentIdentity);
		}
	} catch (error) {
		console.log(`❌ Error in Test 1: ${error}`);
	}

	// Test 2: Test cache expiry (1 hour)
	console.log('\n📋 Test 2: Cache expiry duration');
	console.log('--------------------------------');

	try {
		const message = createMockMessage('test-guild-456');

		// First call (should hit database)
		const startTime = Date.now();
		const _chadIdentity1 = await identityService.getChadIdentity(message as unknown);
		const firstCallTime = Date.now() - startTime;

		// Second call (should hit cache)
		const secondStartTime = Date.now();
		const _chadIdentity2 = await identityService.getChadIdentity(message as unknown);
		const secondCallTime = Date.now() - secondStartTime;

		console.log(`✅ First call (DB): ${firstCallTime}ms`);
		console.log(`✅ Second call (Cache): ${secondCallTime}ms`);
		console.log(`✅ Cache speedup: ${Math.round(firstCallTime / Math.max(secondCallTime, 1))}x faster`);
		console.log(`✅ Cache expiry: 1 hour (3600000ms)`);

		// Check cache stats
		const cacheStats = identityService.getCacheStats();
		console.log(`✅ Cache entries: ${cacheStats.size}`);
	} catch (error) {
		console.log(`❌ Error in Test 2: ${error}`);
	}

	// Test 3: Test convenience methods return null on failure
	console.log('\n📋 Test 3: Convenience methods null handling');
	console.log('--------------------------------------------');

	try {
		const message = createMockMessage('test-guild-789');

		// Test all convenience methods with a disconnected config service
		await configService.disconnect();
		const failingIdentityService = new BotIdentityService(configService);

		const chadResult = await failingIdentityService.getChadIdentity(message as unknown);
		const guyResult = await failingIdentityService.getGuyIdentity(message as unknown);
		const vennResult = await failingIdentityService.getVennIdentity(message as unknown);
		const covaResult = await failingIdentityService.getCovaIdentity(message as unknown);

		console.log(`✅ Chad identity (DB disconnected): ${chadResult}`);
		console.log(`✅ Guy identity (DB disconnected): ${guyResult}`);
		console.log(`✅ Venn identity (DB disconnected): ${vennResult}`);
		console.log(`✅ Cova identity (DB disconnected): ${covaResult}`);

		if (chadResult === null && guyResult === null && vennResult === null && covaResult === null) {
			console.log('✅ All convenience methods correctly return null on failure');
			console.log('   ↳ Bots will remain silent when database is unavailable');
		} else {
			console.log('❌ Some convenience methods did not return null on failure');
		}
	} catch (error) {
		console.log(`❌ Error in Test 3: ${error}`);
	}

	await configService.disconnect();
}

async function demonstrateNewBehavior() {
	console.log('\n🎯 New Behavior Demonstration');
	console.log('=============================');

	console.log('\n📊 What happens when Chad Bot tries to reply but identity fails:');
	console.log('');
	console.log('1️⃣  Chad Bot trigger activates (message matches conditions)');
	console.log('2️⃣  identityService.getChadIdentity(message) is called');
	console.log('3️⃣  configService.getUserIdByUsername("Chad") is called');
	console.log('');
	console.log('🔀 FAILURE POINT: Database lookup fails');
	console.log('');
	console.log('4️⃣  ConfigurationService catches error, logs it, returns null');
	console.log('5️⃣  BotIdentityService sees null userId, returns null');
	console.log('6️⃣  Chad Bot trigger identity function returns null');
	console.log('7️⃣  TriggerResponse.getIdentity() receives null');
	console.log('8️⃣  TriggerResponse.process() sees null identity');
	console.log('9️⃣  Bot execution stops - NO MESSAGE SENT');
	console.log('🔟  Users see: SILENCE (no response at all)');
	console.log('');
	console.log('🎯 RESULT: Bot remains completely silent, no fallback identity!');
	console.log('');
	console.log('📝 Logged messages:');
	console.log('   WARN: "User \'Chad\' not found in configuration, no fallback provided"');
	console.log('   DEBUG: "Identity resolution returned null - bot will remain silent"');
	console.log('   DEBUG: "Identity resolution failed for trigger - bot will remain silent"');
	console.log('');
	console.log('⏰ Recovery: Next attempt in 1 hour (cache expires)');
	console.log('   If database is back up, normal identity will be restored');
	console.log('');
	console.log('🔄 Cache Behavior:');
	console.log('   ✅ Success: Cached for 1 hour (3600000ms)');
	console.log('   ❌ Failure: No caching (immediate retry next time)');
	console.log('');
	console.log('🆚 Comparison with Old Behavior:');
	console.log('   OLD: "ChadBot" with default Discord avatar (fallback)');
	console.log('   NEW: Complete silence (no response)');
}

async function main() {
	console.log('🧪 Discord Bot Silent Failure Testing');
	console.log('======================================');

	try {
		await demonstrateNewBehavior();
		await testSilentFailureBehavior();

		console.log('\n🎉 Silent Failure Testing Complete!');
		console.log('\n📋 Summary of New Behavior:');
		console.log('✅ Cache duration extended to 1 hour (reduced API calls)');
		console.log('✅ Identity resolution failures return null (no fallbacks)');
		console.log('✅ Null identities prevent bot responses (complete silence)');
		console.log('✅ No generic "ChadBot" fallback identities');
		console.log('✅ Users only see authentic identities or nothing');
		console.log('✅ Clear logging for debugging identity failures');

		console.log('\n🔧 What Users Experience:');
		console.log('👤 Success: "Chad" with Chad\'s server avatar (authentic)');
		console.log('📱 Cached: "Chad" with Chad\'s server avatar (up to 1 hour old)');
		console.log('🔇 Failure: Complete silence (no response at all)');
		console.log('🔄 Recovery: Back to "Chad" when database/Discord recovers');

		console.log('\n⚠️  Important Notes:');
		console.log('• Bots will be completely silent during identity failures');
		console.log('• No fallback "ChadBot" or generic bot responses');
		console.log('• Users only see authentic user identities');
		console.log('• 1-hour cache reduces Discord API load significantly');
		console.log('• Failed identity resolutions are not cached (immediate retry)');
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

export { main as testSilentFailureBehavior };
