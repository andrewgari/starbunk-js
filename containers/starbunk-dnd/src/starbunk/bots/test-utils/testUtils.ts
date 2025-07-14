// Test utilities for starbunk-dnd
export const mockDiscordService = {
	sendWebhookMessage: jest.fn(),
	sendMessage: jest.fn(),
	getChannel: jest.fn(),
	getGuild: jest.fn()
};

export const mockLogger = {
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
	debug: jest.fn()
};

export const mockWebhookService = {
	send: jest.fn(),
	sendToChannel: jest.fn(),
	writeMessage: jest.fn()
};

export const mockMessage = (content: string = 'test message') => ({
	id: '123456789',
	content,
	author: {
		id: '987654321',
		username: 'testuser',
		bot: false
	},
	channel: {
		id: '555666777',
		type: 0
	},
	guild: {
		id: '111222333'
	},
	createdTimestamp: Date.now(),
	reply: jest.fn(),
	react: jest.fn()
});

export const createMockInteraction = (options: any = {}) => ({
	id: '123456789',
	user: {
		id: '987654321',
		username: 'testuser'
	},
	guild: {
		id: '111222333'
	},
	channel: {
		id: '555666777'
	},
	member: {
		id: '987654321',
		user: {
			id: '987654321',
			username: 'testuser'
		}
	},
	options: {
		getSubcommand: jest.fn().mockReturnValue('test'),
		getString: jest.fn().mockReturnValue('test'),
		getUser: jest.fn(),
		getChannel: jest.fn()
	},
	reply: jest.fn(),
	followUp: jest.fn(),
	deferReply: jest.fn(),
	editReply: jest.fn(),
	...options
});
