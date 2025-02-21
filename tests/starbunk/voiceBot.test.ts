import VoiceBot from '../../src/starbunk/bots/voiceBot';
import { Message, VoiceChannel } from 'discord.js';
import { mock, MockProxy } from 'jest-mock-extended';

interface MockVoiceBot extends VoiceBot {
    handleMessage(message: Message): Promise<string | undefined>;
}

describe('VoiceBot', () => {
    let voiceBot: MockProxy<MockVoiceBot>;
    let mockMessage: MockProxy<Message>;

    beforeEach(() => {
        voiceBot = mock<MockVoiceBot>();
        mockMessage = mock<Message>();
    });
    // ... rest of the test remains the same
}); 