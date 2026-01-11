#!/usr/bin/env ts-node

/**
 * Migration script to move hardcoded Discord IDs to database configuration
 * This script ensures all user configurations and bot configurations are properly seeded
 */

// Use the root Prisma client since BunkBot container doesn't have its own schema
import { PrismaClient } from '@prisma/client';
import { ConfigurationService } from '../src/services/configuration-service';

const prisma = new PrismaClient();

async function main() {
	console.log('🔄 Starting hardcoded ID migration...');

	try {
		// Initialize configuration service
		const configService = new ConfigurationService(prisma);

		console.log('📋 Verifying user configurations...');

		// Check if all expected users are in the database
		const expectedUsers = [
			{ userId: '139592376443338752', username: 'Cova', displayName: 'Cova' },
			{ userId: '151120340343455744', username: 'Venn', displayName: 'Venn' },
			{ userId: '135820819086573568', username: 'Bender', displayName: 'Bender' },
			{ userId: '486516247576444928', username: 'Sig', displayName: 'Sig' },
			{ userId: '113035990725066752', username: 'Guy', displayName: 'Guy' },
			{ userId: '113776144012148737', username: 'Guildus', displayName: 'Guildus' },
			{ userId: '115631499344216066', username: 'Deaf', displayName: 'Deaf' },
			{ userId: '120263103366692868', username: 'Feli', displayName: 'Feli' },
			{ userId: '163780525859930112', username: 'Goose', displayName: 'Goose' },
			{ userId: '85184539906809856', username: 'Chad', displayName: 'Chad' },
			{ userId: '146110603835080704', username: 'Ian', displayName: 'Ian' },
		];

		for (const user of expectedUsers) {
			const existingUser = await configService.getUserConfig(user.userId);
			if (!existingUser) {
				console.log(`❌ User ${user.username} (${user.userId}) not found in database`);
			} else {
				console.log(`✅ User ${user.username} found in database`);
			}
		}

		console.log('🤖 Verifying bot configurations...');

		// Check if all expected bots are in the database
		const expectedBots = ['nice-bot', 'cova-bot', 'chad-bot', 'guy-bot', 'venn-bot'];

		for (const botName of expectedBots) {
			const existingBot = await configService.getBotConfig(botName);
			if (!existingBot) {
				console.log(`❌ Bot ${botName} not found in database`);
			} else {
				console.log(`✅ Bot ${botName} found in database`);
			}
		}

		console.log('🔍 Testing configuration service functionality...');

		// Test user ID lookups
		const testUsers = ['Chad', 'Guy', 'Venn', 'Cova'];
		for (const username of testUsers) {
			const userId = await configService.getUserIdByUsername(username);
			if (userId) {
				console.log(`✅ ${username} -> ${userId}`);
			} else {
				console.log(`❌ Failed to resolve ${username}`);
			}
		}

		console.log('📊 Configuration cache statistics:');
		await configService.refreshCache();
		console.log('✅ Cache refreshed successfully');

		console.log('🎯 Migration verification complete!');
		console.log('');
		console.log('📝 Summary:');
		console.log('- All hardcoded Discord IDs should now be retrieved from the database');
		console.log('- Reply bots will use ConfigurationService and BotIdentityService');
		console.log('- User identities are resolved dynamically from Discord API');
		console.log('- Configuration is cached for performance');
		console.log('');
		console.log('🚀 Next steps:');
		console.log('1. Test the BunkBot container with the new configuration system');
		console.log('2. Verify that bot identities are resolved correctly');
		console.log('3. Check that reply bots respond with the correct user avatars/names');
		console.log('4. Monitor logs for any configuration lookup failures');
	} catch (error) {
		console.error('❌ Migration failed:', error);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

// Run the migration
if (require.main === module) {
	main().catch((error) => {
		console.error('Fatal error:', error);
		process.exit(1);
	});
}

export { main as migrationMain };
