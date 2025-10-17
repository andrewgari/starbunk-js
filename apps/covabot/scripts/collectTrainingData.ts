/**
 * Training Data Collection Script
 *
 * Analyzes your actual Discord message history to understand:
 * 1. When do you respond vs ignore?
 * 2. What's your response style?
 * 3. What phrases do you use?
 * 4. What topics trigger responses?
 */

import { Client, GatewayIntentBits, TextChannel, Message, Collection } from 'discord.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

const YOUR_USER_ID = '139592376443338752'; // Cova's Discord ID

interface MessageData {
	id: string;
	content: string;
	author: string;
	authorId: string;
	timestamp: Date;
	channelId: string;
	channelName: string;
}

interface ResponsePattern {
	context: MessageData[];
	yourResponse: MessageData;
	timeSinceLastMessage: number; // ms
	responseTime: number; // ms between trigger and your response
}

interface NonResponsePattern {
	context: MessageData[];
	messageYouIgnored: MessageData;
	whyIgnored?: string; // We can infer this
}

interface TrainingData {
	// When you DO respond
	responsePatterns: ResponsePattern[];

	// When you DON'T respond
	nonResponsePatterns: NonResponsePattern[];

	// Your writing style
	yourPhrases: Record<string, number>; // phrase -> frequency
	averageResponseLength: number;
	commonWords: string[];

	// Timing patterns
	averageResponseTime: number;
	mostActiveHours: number[];

	// Topics you care about
	topicKeywords: Record<string, number>;
}

async function collectData() {
	console.log('🔍 Starting training data collection...\n');

	const client = new Client({
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.MessageContent,
		],
	});

	const token = process.env.COVABOT_TOKEN || process.env.STARBUNK_TOKEN;
	if (!token) {
		throw new Error('Need COVABOT_TOKEN or STARBUNK_TOKEN');
	}

	await client.login(token);
	await new Promise(resolve => client.once('ready', resolve));

	console.log(`✅ Logged in as ${client.user?.tag}\n`);

	const trainingData: TrainingData = {
		responsePatterns: [],
		nonResponsePatterns: [],
		yourPhrases: {},
		averageResponseLength: 0,
		commonWords: [],
		averageResponseTime: 0,
		mostActiveHours: [],
		topicKeywords: {},
	};

	// Get all text channels you have access to
	const channels: TextChannel[] = [];
	for (const guild of client.guilds.cache.values()) {
		for (const channel of guild.channels.cache.values()) {
			if (channel.isTextBased() && !channel.isDMBased()) {
				channels.push(channel as TextChannel);
			}
		}
	}

	console.log(`📊 Found ${channels.length} channels to analyze\n`);

	// Analyze each channel
	for (const channel of channels) {
		try {
			console.log(`Analyzing #${channel.name}...`);
			await analyzeChannel(channel, trainingData);
		} catch (error) {
			console.error(`Error analyzing #${channel.name}:`, error);
		}
	}

	// Calculate aggregates
	calculateAggregates(trainingData);

	// Save to file
	const outputPath = join(__dirname, '../data/training-data.json');
	writeFileSync(outputPath, JSON.stringify(trainingData, null, 2));
	console.log(`\n✅ Training data saved to: ${outputPath}`);

	// Print summary
	printSummary(trainingData);

	await client.destroy();
	process.exit(0);
}

async function analyzeChannel(channel: TextChannel, data: TrainingData) {
	try {
		// Fetch recent messages (Discord limit is 100 per request, can fetch multiple times)
		let allMessages: Message[] = [];
		let lastId: string | undefined;

		// Fetch up to 500 messages
		for (let i = 0; i < 5; i++) {
			const fetchOptions: { limit: number; before?: string } = { limit: 100 };
			if (lastId) {
				fetchOptions.before = lastId;
			}

			const messagesCollection: Collection<string, Message> = await channel.messages.fetch(fetchOptions);

			if (messagesCollection.size === 0) break;

			const messagesArray = Array.from(messagesCollection.values());
			allMessages.push(...messagesArray);

			const lastMessage = messagesArray[messagesArray.length - 1];
			if (lastMessage) {
				lastId = lastMessage.id;
			}
		}

		// Sort by timestamp
		allMessages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

		console.log(`  Found ${allMessages.length} messages`);

		// Analyze message patterns
		for (let i = 0; i < allMessages.length; i++) {
			const message = allMessages[i];

			// Is this YOUR message?
			if (message.author.id === YOUR_USER_ID) {
				// This is a response from you
				const context = allMessages.slice(Math.max(0, i - 10), i); // 10 messages before

				if (context.length > 0) {
					const lastMessage = context[context.length - 1];
					const responseTime = message.createdTimestamp - lastMessage.createdTimestamp;

					data.responsePatterns.push({
						context: context.map(toMessageData),
						yourResponse: toMessageData(message),
						timeSinceLastMessage: responseTime,
						responseTime,
					});

					// Analyze your writing
					analyzeYourWriting(message.content, data);
				}
			} else {
				// Someone else's message - did you respond?
				const nextMessages = allMessages.slice(i + 1, Math.min(i + 6, allMessages.length));
				const youResponded = nextMessages.some(m => m.author.id === YOUR_USER_ID);

				if (!youResponded) {
					// You DIDN'T respond to this
					const context = allMessages.slice(Math.max(0, i - 10), i);

					data.nonResponsePatterns.push({
						context: context.map(toMessageData),
						messageYouIgnored: toMessageData(message),
						whyIgnored: inferWhyIgnored(message),
					});
				}
			}
		}
	} catch (error: any) {
		if (error.code === 50013) {
			console.log(`  ⏭️  No permission to read #${channel.name}`);
		} else {
			throw error;
		}
	}
}

function toMessageData(message: Message): MessageData {
	return {
		id: message.id,
		content: message.content,
		author: message.author.username,
		authorId: message.author.id,
		timestamp: message.createdAt,
		channelId: message.channel.id,
		channelName: (message.channel as TextChannel).name || 'unknown',
	};
}

function analyzeYourWriting(content: string, data: TrainingData) {
	// Extract phrases (2-4 words)
	const words = content.toLowerCase().split(/\s+/);

	for (let i = 0; i < words.length - 1; i++) {
		const twoWord = words.slice(i, i + 2).join(' ');
		data.yourPhrases[twoWord] = (data.yourPhrases[twoWord] || 0) + 1;

		if (i < words.length - 2) {
			const threeWord = words.slice(i, i + 3).join(' ');
			data.yourPhrases[threeWord] = (data.yourPhrases[threeWord] || 0) + 1;
		}
	}

	// Extract topic keywords
	const topicWords = ['code', 'bot', 'docker', 'deploy', 'typescript', 'javascript', 'server', 'music', 'game'];
	for (const word of words) {
		if (topicWords.includes(word)) {
			data.topicKeywords[word] = (data.topicKeywords[word] || 0) + 1;
		}
	}
}

function inferWhyIgnored(message: Message): string {
	const content = message.content.toLowerCase();

	if (content.length < 10) return 'Very short message';
	if (!content.includes('?') && content.split(' ').length < 5) return 'Brief statement';
	if (content.match(/^(lol|haha|lmao|nice|cool|yeah|ok)$/)) return 'Simple reaction';
	if (!content.match(/code|bot|docker|typescript|tech/)) return 'Not technical topic';

	return 'Unknown reason';
}

function calculateAggregates(data: TrainingData) {
	// Average response length
	if (data.responsePatterns.length > 0) {
		const totalLength = data.responsePatterns.reduce((sum, p) => sum + p.yourResponse.content.length, 0);
		data.averageResponseLength = totalLength / data.responsePatterns.length;
	}

	// Average response time
	if (data.responsePatterns.length > 0) {
		const totalTime = data.responsePatterns.reduce((sum, p) => sum + p.responseTime, 0);
		data.averageResponseTime = totalTime / data.responsePatterns.length;
	}

	// Most common phrases (top 20)
	const sortedPhrases = Object.entries(data.yourPhrases)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 20);

	data.yourPhrases = Object.fromEntries(sortedPhrases);

	// Most active hours
	const hourCounts: Record<number, number> = {};
	for (const pattern of data.responsePatterns) {
		const hour = pattern.yourResponse.timestamp.getHours();
		hourCounts[hour] = (hourCounts[hour] || 0) + 1;
	}

	data.mostActiveHours = Object.entries(hourCounts)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 5)
		.map(([hour]) => parseInt(hour));

	// Common words (single words, filtered)
	const wordCounts: Record<string, number> = {};
	for (const pattern of data.responsePatterns) {
		const words = pattern.yourResponse.content.toLowerCase()
			.split(/\s+/)
			.filter(w => w.length > 3); // Filter short words

		for (const word of words) {
			wordCounts[word] = (wordCounts[word] || 0) + 1;
		}
	}

	data.commonWords = Object.entries(wordCounts)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 30)
		.map(([word]) => word);
}

function printSummary(data: TrainingData) {
	console.log('\n📊 TRAINING DATA SUMMARY\n');
	console.log('='.repeat(50));

	console.log('\n📈 Response Patterns:');
	console.log(`  Messages you responded to: ${data.responsePatterns.length}`);
	console.log(`  Messages you ignored: ${data.nonResponsePatterns.length}`);
	const responseRate = (data.responsePatterns.length / (data.responsePatterns.length + data.nonResponsePatterns.length) * 100).toFixed(1);
	console.log(`  Response rate: ${responseRate}%`);

	console.log('\n✍️  Your Writing Style:');
	console.log(`  Average response length: ${data.averageResponseLength.toFixed(0)} characters`);
	console.log(`  Average response time: ${(data.averageResponseTime / 1000).toFixed(1)} seconds`);

	console.log('\n💬 Most Common Phrases:');
	Object.entries(data.yourPhrases).slice(0, 10).forEach(([phrase, count]) => {
		console.log(`  "${phrase}": ${count} times`);
	});

	console.log('\n🔤 Common Words:');
	console.log(`  ${data.commonWords.slice(0, 15).join(', ')}`);

	console.log('\n🕐 Most Active Hours:');
	console.log(`  ${data.mostActiveHours.map(h => `${h}:00`).join(', ')}`);

	console.log('\n🎯 Topics You Engage With:');
	Object.entries(data.topicKeywords).slice(0, 10).forEach(([topic, count]) => {
		console.log(`  ${topic}: ${count} mentions`);
	});

	console.log('\n' + '='.repeat(50));
	console.log('\n✅ Next steps:');
	console.log('  1. Review data/training-data.json');
	console.log('  2. Update data/personality.json with insights');
	console.log('  3. Add real examples to exampleResponses');
	console.log('  4. Test the bot with improved data\n');
}

// Run the script
collectData().catch(console.error);
