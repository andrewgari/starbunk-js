// Mock the BlueBotConfig
jest.mock('../config/blueBotConfig', () => ({
	BlueBotConfig: {
		Name: 'BluBot',
		Avatars: {
			Default: 'https://imgur.com/WcBRCWn.png',
			Murder: 'https://imgur.com/Tpo8Ywd.jpg',
			Cheeky: 'https://i.imgur.com/dO4a59n.png'
		},
		Patterns: {
			Default: /\b(blu|blue|bl(o+)|azul|blau|bl(u+)|blew|bl\u00f6|\u0441\u0438\u043d\u0438\u0439|\u9752|\u30d6\u30eb\u30fc|\ube14\uB8E8|\u05DB\u05D7\u05D5\u05DC|\u0928\u0940\u0932\u093E|\u84DD)\b/i,
			Confirm: /\b(blue?(bot)?)|(bot)|yes|no|yep|yeah|(i did)|(you got it)|(sure did)\b/i,
			Nice: /blue?bot,? say something nice about (?<n>.+$)/i,
			Mean: /\b(fuck(ing)?|hate|die|kill|worst|mom|shit|murder|bots?)\b/i
		},
		Responses: {
			Default: 'Did somebody say Blu?',
			Cheeky: 'Lol, Somebody definitely said Blu! :smile:',
			Murder: "What the fuck did you just fucking say about me...",
			Request: jest.fn().mockImplementation((message) => {
				if (message.includes('Venn')) {
					return 'No way, Venn can suck my blu cane. :unamused:';
				} else if (message.includes('Andrew')) {
					return 'Andrew, I think you\'re pretty Blu! :wink: :blue_heart:';
				} else {
					return 'Hey, I think you\'re pretty Blu! :wink: :blue_heart:';
				}
			})
		}
	}
}));

import { container, ServiceId } from '../../../services/container';
import { BlueBotConfig } from '../config/blueBotConfig';
import BlueBot from '../reply-bots/blueBot';
import { mockLogger, mockMessage, mockWebhookService } from './testUtils';

describe('BlueBot', () => {
	let blueBot: BlueBot;

	beforeEach(() => {
		// Clear container and register mocks
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);


		// Create BlueBot instance with the mock logger
		blueBot = new BlueBot();
	});

	it('should respond to direct blue references', async () => {
		const message = mockMessage('blue is my favorite color');
		await blueBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: BlueBotConfig.Name,
				content: BlueBotConfig.Responses.Default
			})
		);
	});

	it('should respond when AI detects a blue reference', async () => {
		const message = mockMessage('The sky is looking nice today');
		await blueBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: BlueBotConfig.Name,
				content: BlueBotConfig.Responses.Default
			})
		);
	});
});
