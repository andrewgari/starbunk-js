import { logger, isDebugMode, DiscordService } from '@starbunk/shared';
import { Message } from 'discord.js';
import { getBotDefaults } from '../config/botDefaults';
import { BotIdentity } from '../types/botIdentity';
import { TriggerResponse } from './trigger-response';
import { shouldExcludeFromReplyBots } from './conditions';
import { BotProcessor } from './BotProcessor';

export type MessageFilterFunction = (message: Message) => boolean | Promise<boolean>;

export function defaultMessageFilter(message: Message): boolean {
	if (!message?.author) return false;

	if (shouldExcludeFromReplyBots(message)) {
		if (isDebugMode()) {
			logger.debug('🚫 Skipping BunkBot self-message');
		}
		return true;
	}

	if (isDebugMode()) {
		logger.debug(`✅ Processing message from: ${message.author.username}`);
	}
	return false;
}

export type BotReplyName = string;
export type BotDescription = string;

export function createBotReplyName(name: string): BotReplyName {
	if (!name?.trim()) {
		throw new Error('Bot name is required');
	}
	return name;
}

export function createBotDescription(description: string): BotDescription {
	if (!description?.trim()) {
		throw new Error('Bot description cannot be empty');
	}
	return description;
}

export interface ReplyBotConfig {
	name: string;
	description: string;
	defaultIdentity: BotIdentity;
	triggers: TriggerResponse[];
	defaultResponseRate?: number;
	responseRate?: number;
	messageFilter?: MessageFilterFunction;
	skipBotMessages?: boolean;
	disabled?: boolean;
	discordService?: DiscordService;
}

export interface ValidatedReplyBotConfig {
	name: BotReplyName;
	description: BotDescription;
	defaultIdentity: BotIdentity;
	triggers: TriggerResponse[];
	defaultResponseRate: number;
	messageFilter: MessageFilterFunction;
	disabled: boolean;
	discordService?: DiscordService;
}

export function validateBotConfig(config: ReplyBotConfig): ValidatedReplyBotConfig {
	const errors = [];

	if (!config.name?.trim()) errors.push('Bot name is required');
	if (!config.description?.trim()) errors.push('Bot description cannot be empty');
	if (!config.defaultIdentity) errors.push('Default bot identity is required');
	if (!config.triggers?.length) errors.push('At least one trigger is required');

	if (errors.length > 0) {
		throw new Error(`Invalid bot configuration: ${errors.join(', ')}`);
	}

	const responseRate = config.responseRate ?? config.defaultResponseRate ?? getBotDefaults().responseRate;
	const disabled = config.disabled ?? false;

	let messageFilter: MessageFilterFunction;
	if (config.messageFilter) {
		messageFilter = config.messageFilter;
	} else if (config.skipBotMessages === false) {
		messageFilter = async () => false;
	} else {
		messageFilter = defaultMessageFilter;
	}

	return {
		name: createBotReplyName(config.name),
		description: createBotDescription(config.description),
		defaultIdentity: config.defaultIdentity,
		triggers: config.triggers,
		defaultResponseRate: responseRate,
		messageFilter,
		disabled,
		discordService: config.discordService,
	};
}

export interface ReplyBotImpl {
	readonly name: BotReplyName;
	readonly description: BotDescription;
	readonly metadata?: {
		responseRate: number;
		disabled: boolean;
		[key: string]: unknown;
	};
	shouldRespond(message: Message): Promise<boolean>;
	processMessage(message: Message): Promise<void>;
}

export function createReplyBot(config: ReplyBotConfig): ReplyBotImpl {
	const validConfig = validateBotConfig(config);
	const processor = new BotProcessor(validConfig);

	return {
		name: validConfig.name,
		description: validConfig.description,
		metadata: {
			responseRate: validConfig.defaultResponseRate,
			disabled: validConfig.disabled,
		},
		async shouldRespond(message: Message): Promise<boolean> {
			return processor.shouldRespond(message);
		},
		async processMessage(message: Message): Promise<void> {
			return processor.processMessage(message);
		},
	};
}