import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	console.log('🌱 Starting database seeding...');

	// Seed User Configuration with known user IDs
	console.log('👥 Seeding user configurations...');
	const users = [
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

	for (const user of users) {
		await prisma.userConfiguration.upsert({
			where: { userId: user.userId },
			update: {
				username: user.username,
				displayName: user.displayName,
			},
			create: {
				userId: user.userId,
				username: user.username,
				displayName: user.displayName,
				isActive: true,
			},
		});
	}

	// Seed Server Configuration
	console.log('🏠 Seeding server configurations...');
	await prisma.serverConfiguration.upsert({
		where: { serverId: '753251582719688714' },
		update: {
			serverName: 'Starbunk Development Server',
		},
		create: {
			serverId: '753251582719688714',
			serverName: 'Starbunk Development Server',
			isActive: true,
			settings: {
				debugMode: true,
				allowAllBots: true,
			},
		},
	});

	// Seed Bot Configurations
	console.log('🤖 Seeding bot configurations...');

	// Nice Bot
	const niceBot = await prisma.botConfiguration.upsert({
		where: { botName: 'nice-bot' },
		update: {
			displayName: 'Nice Bot',
			description: 'Responds with "Nice." to specific numbers',
		},
		create: {
			botName: 'nice-bot',
			displayName: 'Nice Bot',
			description: 'Responds with "Nice." to specific numbers',
			isEnabled: true,
			avatarUrl: 'https://pbs.twimg.com/profile_images/421461637325787136/0rxpHzVx.jpeg',
			priority: 1,
		},
	});

	await prisma.botPattern.upsert({
		where: { botConfigId_name: { botConfigId: niceBot.id, name: 'default' } },
		update: {
			pattern: '\\b69|(sixty-?nine)\\b',
			patternFlags: 'i',
		},
		create: {
			botConfigId: niceBot.id,
			name: 'default',
			pattern: '\\b69|(sixty-?nine)\\b',
			patternFlags: 'i',
			isEnabled: true,
			priority: 1,
			description: 'Matches 69 or sixty-nine',
		},
	});

	await prisma.botResponse.upsert({
		where: { botConfigId_name: { botConfigId: niceBot.id, name: 'default' } },
		update: {
			content: 'Nice.',
		},
		create: {
			botConfigId: niceBot.id,
			name: 'default',
			responseType: 'static',
			content: 'Nice.',
			isEnabled: true,
			priority: 1,
		},
	});

	// Cova Bot
	const covaBot = await prisma.botConfiguration.upsert({
		where: { botName: 'cova-bot' },
		update: {
			displayName: 'Cova Bot',
			description: 'LLM-powered CovaBot that responds to messages based on personality vectors',
		},
		create: {
			botName: 'cova-bot',
			displayName: 'Cova Bot',
			description: 'LLM-powered CovaBot that responds to messages based on personality vectors',
			isEnabled: true,
			priority: 3,
			metadata: {
				llmEnabled: true,
				personalityEmbedding: true,
				covaUserId: '139592376443338752',
			},
		},
	});

	await prisma.botPattern.upsert({
		where: { botConfigId_name: { botConfigId: covaBot.id, name: 'contextual' } },
		update: {
			pattern: '.*',
			patternFlags: 'i',
		},
		create: {
			botConfigId: covaBot.id,
			name: 'contextual',
			pattern: '.*',
			patternFlags: 'i',
			isEnabled: true,
			priority: 3,
			description: 'Matches any message for LLM decision',
		},
	});

	await prisma.botPattern.upsert({
		where: { botConfigId_name: { botConfigId: covaBot.id, name: 'direct_mention' } },
		update: {
			pattern: '<@139592376443338752>',
			patternFlags: 'i',
		},
		create: {
			botConfigId: covaBot.id,
			name: 'direct_mention',
			pattern: '<@139592376443338752>',
			patternFlags: 'i',
			isEnabled: true,
			priority: 5,
			description: 'Direct mentions of Cova',
		},
	});

	await prisma.botResponse.upsert({
		where: { botConfigId_name: { botConfigId: covaBot.id, name: 'llm_emulator' } },
		update: {
			responseType: 'llm',
		},
		create: {
			botConfigId: covaBot.id,
			name: 'llm_emulator',
			responseType: 'llm',
			content: 'cova_emulator_prompt',
			isEnabled: true,
			priority: 1,
			metadata: {
				promptType: 'COVA_EMULATOR',
				temperature: 0.7,
				maxTokens: 250,
			},
		},
	});

	// Chad Bot
	const chadBot = await prisma.botConfiguration.upsert({
		where: { botName: 'chad-bot' },
		update: {
			displayName: 'Chad Bot',
			description: 'Responds to mentions of gym, protein, and other chad topics',
		},
		create: {
			botName: 'chad-bot',
			displayName: 'Chad Bot',
			description: 'Responds to mentions of gym, protein, and other chad topics',
			isEnabled: true,
			avatarUrl: 'https://i.imgur.com/XFDYZYz.png',
			priority: 1,
			metadata: {
				responseChance: 1,
				targetUserId: '85184539906809856', // Chad's Discord ID
			},
		},
	});

	await prisma.botPattern.upsert({
		where: { botConfigId_name: { botConfigId: chadBot.id, name: 'default' } },
		update: {
			pattern: '\\b(gym|protein|gains|workout|lifting|chad|alpha|sigma|grindset|hustle)\\b',
			patternFlags: 'i',
		},
		create: {
			botConfigId: chadBot.id,
			name: 'default',
			pattern: '\\b(gym|protein|gains|workout|lifting|chad|alpha|sigma|grindset|hustle)\\b',
			patternFlags: 'i',
			isEnabled: true,
			priority: 1,
			description: 'Matches chad-related keywords',
		},
	});

	await prisma.botResponse.upsert({
		where: { botConfigId_name: { botConfigId: chadBot.id, name: 'default' } },
		update: {
			content: 'What is bro *yappin* about?...',
		},
		create: {
			botConfigId: chadBot.id,
			name: 'default',
			responseType: 'static',
			content: 'What is bro *yappin* about?...',
			isEnabled: true,
			priority: 1,
		},
	});

	// Guy Bot
	const guyBot = await prisma.botConfiguration.upsert({
		where: { botName: 'guy-bot' },
		update: {
			displayName: 'Guy Bot',
			description: 'Responds with Guy-style messages',
		},
		create: {
			botName: 'guy-bot',
			displayName: 'Guy Bot',
			description: 'Responds with Guy-style messages',
			isEnabled: true,
			priority: 1,
			metadata: {
				targetUserId: '135820819086573568', // Guy's Discord ID
			},
		},
	});

	await prisma.botPattern.upsert({
		where: { botConfigId_name: { botConfigId: guyBot.id, name: 'default' } },
		update: {
			pattern: '\\b(guy|dude|bro|man)\\b',
			patternFlags: 'i',
		},
		create: {
			botConfigId: guyBot.id,
			name: 'default',
			pattern: '\\b(guy|dude|bro|man)\\b',
			patternFlags: 'i',
			isEnabled: true,
			priority: 1,
			description: 'Matches guy-related keywords',
		},
	});

	await prisma.botResponse.upsert({
		where: { botConfigId_name: { botConfigId: guyBot.id, name: 'default' } },
		update: {
			responseType: 'random',
			alternatives: [
				'Hey there, guy!',
				'What\'s up, dude?',
				'Yo, bro!',
				'Guy here!'
			],
		},
		create: {
			botConfigId: guyBot.id,
			name: 'default',
			responseType: 'random',
			alternatives: [
				'Hey there, guy!',
				'What\'s up, dude?',
				'Yo, bro!',
				'Guy here!'
			],
			isEnabled: true,
			priority: 1,
		},
	});

	// Venn Bot
	const vennBot = await prisma.botConfiguration.upsert({
		where: { botName: 'venn-bot' },
		update: {
			displayName: 'Venn Bot',
			description: 'Responds to cringe messages with Venn-style reactions',
		},
		create: {
			botName: 'venn-bot',
			displayName: 'Venn Bot',
			description: 'Responds to cringe messages with Venn-style reactions',
			isEnabled: true,
			priority: 2,
			metadata: {
				responseChance: 1,
				targetUserId: '151120340343455744', // Venn's Discord ID
			},
		},
	});

	await prisma.botPattern.upsert({
		where: { botConfigId_name: { botConfigId: vennBot.id, name: 'cringe' } },
		update: {
			pattern: '\\b(cringe|yikes|oof|bruh|sus|cap|no cap|fr|periodt)\\b',
			patternFlags: 'i',
		},
		create: {
			botConfigId: vennBot.id,
			name: 'cringe',
			pattern: '\\b(cringe|yikes|oof|bruh|sus|cap|no cap|fr|periodt)\\b',
			patternFlags: 'i',
			isEnabled: true,
			priority: 2,
			description: 'Matches cringe-related keywords',
		},
	});

	await prisma.botResponse.upsert({
		where: { botConfigId_name: { botConfigId: vennBot.id, name: 'cringe' } },
		update: {
			responseType: 'random',
			alternatives: [
				'That\'s pretty cringe, ngl',
				'Yikes...',
				'Bruh moment',
				'Sus',
				'That ain\'t it, chief'
			],
		},
		create: {
			botConfigId: vennBot.id,
			name: 'cringe',
			responseType: 'random',
			alternatives: [
				'That\'s pretty cringe, ngl',
				'Yikes...',
				'Bruh moment',
				'Sus',
				'That ain\'t it, chief'
			],
			isEnabled: true,
			priority: 1,
		},
	});

	console.log('✅ Database seeding completed successfully!');
}

main()
	.catch((e) => {
		console.error('❌ Error during seeding:', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
