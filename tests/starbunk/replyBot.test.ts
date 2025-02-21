import ReplyBot from '../../src/starbunk/bots/replyBot';
import { Message } from 'discord.js';
import { mock, MockProxy } from 'jest-mock-extended';

describe('ReplyBot', () => {
    let replyBot: ReplyBot;
    let mockMessage: MockProxy<Message>;

    beforeEach(() => {
        replyBot = new ReplyBot();
        mockMessage = mock<Message>();
    });

    test('should handle command messages', async () => {
        mockMessage.content = '!help';
        mockMessage.author = { bot: false } as any;
        
        const result = await replyBot.handleMessage(mockMessage);
        expect(result).toBeDefined();
    });

    test('should ignore bot messages', async () => {
        mockMessage.content = '!help';
        mockMessage.author = { bot: true } as any;
        
        const result = await replyBot.handleMessage(mockMessage);
        expect(result).toBeUndefined();
    });
}); 