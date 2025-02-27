import { CommandInteraction, GuildMember, PermissionFlagsBits, SlashCommandBuilder, TextChannel, User } from 'discord.js';
import webhookService, { WebhookService } from '../../webhooks/webhookService';

// Interface for message sender
export interface MessageSender {
	sendMessage(channel: TextChannel, username: string, avatarURL: string, content: string): Promise<void>;
}

// Implementation using webhook service
export class WebhookMessageSender implements MessageSender {
	private readonly webhookService: WebhookService;

	constructor(webhookService: WebhookService) {
		this.webhookService = webhookService;
	}

	async sendMessage(channel: TextChannel, username: string, avatarURL: string, content: string): Promise<void> {
		await this.webhookService.writeMessage(channel, {
			username,
			avatarURL,
			content,
			embeds: [],
		});
	}
}

// Service for handling monkey say operations
export class MonkeySayService {
	private readonly messageSender: MessageSender;

	constructor(messageSender: MessageSender) {
		this.messageSender = messageSender;
	}

	async impersonateUser(
		interaction: CommandInteraction,
		user: User,
		member: GuildMember,
		message: string
	): Promise<void> {
		const nickname = member.nickname ?? user.username;
		const avatar = member.displayAvatarURL() ?? user.displayAvatarURL();
		const channel = interaction.channel as TextChannel;

		await this.messageSender.sendMessage(channel, nickname, avatar, message);

		await interaction.reply({
			content: 'Message sent!',
			ephemeral: true,
		});
	}
}

// Command definition
export default {
	data: new SlashCommandBuilder()
		.setName('monkeysay')
		.setDescription('monkeydo')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addUserOption((option) =>
			option.setName('user').setDescription('the monkey you want to make speak').setRequired(true),
		)
		.addStringOption((option) =>
			option.setName('message').setDescription('what you want the monkey to say').setRequired(true),
		),

	async execute(interaction: CommandInteraction) {
		const user = interaction.options.get('user')?.user;
		const member = interaction.options.get('user')?.member as GuildMember;
		const message = interaction.options.get('message')?.value as string;

		if (!user || !member || !message) {
			await interaction.reply({
				content: 'Missing required parameters',
				ephemeral: true,
			});
			return;
		}

		// Create service with default webhook service
		const messageSender = new WebhookMessageSender(webhookService);
		const monkeySayService = new MonkeySayService(messageSender);

		try {
			await monkeySayService.impersonateUser(interaction, user, member, message);
		} catch (error) {
			console.error('Error sending monkey message:', error);
			await interaction.reply({
				content: 'An error occurred while sending the message',
				ephemeral: true
			});
		}
	},
};
