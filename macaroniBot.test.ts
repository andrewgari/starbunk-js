import { mockMessage, mockTextChannel } from '@/tests/mocks/discordMocks';
import { Message, TextChannel } from 'discord.js';
import userID from './src/discord/userID';
import { Logger } from './src/services/Logger';
import MacaroniBot from './src/starbunk/bots/reply-bots/macaroniBot';
import { WebhookService } from './src/webhooks/webhookService';

describe('MacaroniBot', () => {
	let bot: MacaroniBot;
	let channel: TextChannel;
	let message: Message;
	let webhookService: WebhookService;

	beforeEach(() => {
		webhookService = {
			writeMessage: jest.fn()
		} as unknown as WebhookService;
		bot = new MacaroniBot(webhookService, Logger);
		channel = mockTextChannel();
		message = mockMessage({ channel });
	});

	it('should reply with correction when message contains macaroni', () => {
		message.content = 'I love macaroni';
		bot.handleMessage(message);
		expect(webhookService.writeMessage).toHaveBeenCalledWith(channel, {
			content: 'Correction: you mean Venn "Tyrone "The "Macaroni" Man" Johnson" Caelum',
			username: 'Macaroni Bot',
			avatarURL: 'https://i.imgur.com/fgbH6Xf.jpg',
			embeds: []
		});
	});

	it('should reply with correction when message contains pasta', () => {
		message.content = 'pasta is great';
		bot.handleMessage(message);
		expect(webhookService.writeMessage).toHaveBeenCalledWith(channel, {
			content: 'Correction: you mean Venn "Tyrone "The "Macaroni" Man" Johnson" Caelum',
			username: 'Macaroni Bot',
			avatarURL: 'https://i.imgur.com/fgbH6Xf.jpg',
			embeds: []
		});
	});

	it('should reply with mention when message contains venn', () => {
		message.content = 'where is venn?';
		bot.handleMessage(message);
		expect(webhookService.writeMessage).toHaveBeenCalledWith(channel, {
			content: `Are you trying to reach <@${userID.Venn}>`,
			username: 'Macaroni Bot',
			avatarURL: 'https://i.imgur.com/fgbH6Xf.jpg',
			embeds: []
		});
	});

	it('should not reply to bot messages', () => {
		message.author.bot = true;
		message.content = 'macaroni';
		bot.handleMessage(message);
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should not reply to unrelated messages', () => {
		message.content = 'hello world';
		bot.handleMessage(message);
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});
});
