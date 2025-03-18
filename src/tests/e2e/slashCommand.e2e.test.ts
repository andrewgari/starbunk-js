import { ApplicationCommandType, ChatInputCommandInteraction, CommandInteractionOption } from 'discord.js';
import StarbunkClient from '../../starbunk/starbunkClient';
import { discordMock, expectBotResponse } from './setup';

// Mock the interaction data structure
function createMockInteraction(
	commandName: string,
	options: Record<string, string | number | boolean> = {}
): ChatInputCommandInteraction {
	// Create options array
	const optionsArray: CommandInteractionOption[] = Object.entries(options).map(([name, value]) => ({
		name,
		value,
		type: typeof value === 'string' ? 3 : typeof value === 'number' ? 4 : 5,
	})) as CommandInteractionOption[];

	// Get a channel from the discord mock
	const channel = discordMock.channels.first();
	const user = discordMock.users.find(u => !u.bot);

	if (!channel || !user) {
		throw new Error('Mock setup error: No channel or user found');
	}

	const mockInteraction = {
		commandName,
		commandType: ApplicationCommandType.ChatInput,
		options: {
			getString: jest.fn().mockImplementation((name: string) => {
				const option = optionsArray.find(o => o.name === name);
				return option && typeof option.value === 'string' ? option.value : null;
			}),
			getNumber: jest.fn().mockImplementation((name: string) => {
				const option = optionsArray.find(o => o.name === name);
				return option && typeof option.value === 'number' ? option.value : null;
			}),
			getBoolean: jest.fn().mockImplementation((name: string) => {
				const option = optionsArray.find(o => o.name === name);
				return option && typeof option.value === 'boolean' ? option.value : null;
			}),
			data: optionsArray,
		},
		channelId: channel.id,
		channel,
		guildId: channel.guild.id,
		guild: channel.guild,
		user,
		member: channel.guild.members.cache.get(user.id),
		reply: jest.fn().mockImplementation((content) => {
			discordMock.sentMessages.push({
				channel: channel.name,
				content: typeof content === 'string' ? content : content.content,
			});
			return Promise.resolve({});
		}),
		followUp: jest.fn().mockImplementation((content) => {
			discordMock.sentMessages.push({
				channel: channel.name,
				content: typeof content === 'string' ? content : content.content,
			});
			return Promise.resolve({});
		}),
		deferReply: jest.fn().mockResolvedValue({}),
		editReply: jest.fn().mockImplementation((content) => {
			discordMock.sentMessages.push({
				channel: channel.name,
				content: typeof content === 'string' ? content : content.content,
			});
			return Promise.resolve({});
		}),
	} as unknown as ChatInputCommandInteraction;

	return mockInteraction;
}

describe('Slash Command E2E', () => {
	let starbunkClient: StarbunkClient;

	beforeEach(() => {
		// Create a new StarbunkClient instance
		starbunkClient = new StarbunkClient({
			intents: [],
		});

		// Set up environment variables
		process.env.STARBUNK_TOKEN = 'mock-token';
		process.env.CLIENT_ID = 'mock-client-id';
		process.env.GUILD_ID = 'mock-guild-id';

		// Initialize the bot
		starbunkClient.bootstrap('mock-token', 'mock-client-id', 'mock-guild-id');
	});

	it('should handle a basic slash command', async () => {
		// Create a mock interaction for the ping command
		const interaction = createMockInteraction('ping');

		// Simulate the interaction
		await discordMock.simulateEvent('interactionCreate', interaction);

		// Check if a response was sent
		// Note: adjust the expected response based on your actual ping command behavior
		expectBotResponse('Pong!');
	});

	it('should handle a slash command with options', async () => {
		// Create a mock interaction with options
		const interaction = createMockInteraction('echo', {
			message: 'Hello, world!'
		});

		// Simulate the interaction
		await discordMock.simulateEvent('interactionCreate', interaction);

		// Check if the echoed message was sent back
		expectBotResponse('Hello, world!');
	});

	afterEach(() => {
		// Reset environment variables
		process.env.STARBUNK_TOKEN = '';
		process.env.CLIENT_ID = '';
		process.env.GUILD_ID = '';
	});
});
