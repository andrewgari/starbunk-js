#!/usr/bin/env ts-node
/**
 * Seed Redis with user configuration data
 * This script populates Redis with username -> userId mappings
 * 
 * Usage:
 *   npm run seed-redis
 *   or
 *   ts-node scripts/seed-redis-users.ts
 */

import Redis from 'ioredis';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// User mappings - add your Discord users here
const USERS = [
	{ username: 'Cova', userId: process.env.COVA_USER_ID || '139592376443338752' },
	{ username: 'Venn', userId: process.env.VENN_USER_ID || '' },
	{ username: 'Guy', userId: process.env.GUY_USER_ID || '' },
	{ username: 'Chad', userId: process.env.CHAD_USER_ID || '' },
	{ username: 'Siggreat', userId: process.env.SIGGREAT_USER_ID || '' },
	// Add more users as needed
];

async function seedRedis() {
	const redisHost = process.env.REDIS_HOST || '192.168.50.3';
	const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
	const redisPassword = process.env.REDIS_PASSWORD || undefined;
	const redisDb = parseInt(process.env.REDIS_DB || '0', 10);

	console.log(`Connecting to Redis at ${redisHost}:${redisPort} (db: ${redisDb})...`);

	const redis = new Redis({
		host: redisHost,
		port: redisPort,
		password: redisPassword,
		db: redisDb,
	});

	try {
		// Test connection
		await redis.ping();
		console.log('✅ Connected to Redis');

		// Seed users
		let seededCount = 0;
		let skippedCount = 0;

		for (const user of USERS) {
			if (!user.userId) {
				console.log(`⚠️  Skipping ${user.username} - no user ID provided`);
				skippedCount++;
				continue;
			}

			const normalizedUsername = user.username.toLowerCase();
			const key = `user:username:${normalizedUsername}`;

			await redis.set(key, user.userId);
			console.log(`✅ Set ${user.username} -> ${user.userId}`);
			seededCount++;
		}

		console.log('\n📊 Summary:');
		console.log(`   Seeded: ${seededCount} users`);
		console.log(`   Skipped: ${skippedCount} users`);

		// Verify the data
		console.log('\n🔍 Verifying data:');
		for (const user of USERS) {
			if (!user.userId) continue;

			const normalizedUsername = user.username.toLowerCase();
			const key = `user:username:${normalizedUsername}`;
			const storedUserId = await redis.get(key);

			if (storedUserId === user.userId) {
				console.log(`   ✅ ${user.username}: ${storedUserId}`);
			} else {
				console.log(`   ❌ ${user.username}: Expected ${user.userId}, got ${storedUserId}`);
			}
		}

		console.log('\n✅ Redis seeding complete!');
	} catch (error) {
		console.error('❌ Error seeding Redis:', error);
		process.exit(1);
	} finally {
		await redis.quit();
	}
}

// Run the seeding
seedRedis().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});

