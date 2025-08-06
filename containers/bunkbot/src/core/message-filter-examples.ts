/**
 * Examples of custom message filtering functions for different bot behaviors
 */

import { MessageFilterFunction, defaultMessageFilter } from './bot-builder';
import { ConfigurationService } from '../services/configurationService';
import { ChannelType } from 'discord.js';
import { isE2ETestClient } from './conditions';

/**
 * Skip messages from the bot's own identity
 * Useful for bots that impersonate real users to avoid responding to themselves
 */
export function createSelfAwareFilter(
	botIdentityUsername: string, 
	configService: ConfigurationService
): MessageFilterFunction {
	return async (message) => {
		// Always allow E2E test clients (whitelisted for testing)
		if (isE2ETestClient(message)) {
			return false; // Don't skip - allow test clients
		}

		// Apply default filtering first (optional)
		if (defaultMessageFilter(message)) {
			return true;
		}
		
		// Get the user ID for the bot's identity
		const botUserId = await configService.getUserIdByUsername(botIdentityUsername);
		
		// Skip if message is from the bot's own identity
		if (botUserId && message.author.id === botUserId) {
			return true;
		}
		
		return false;
	};
}

/**
 * Skip messages based on channel type or name
 */
export function createChannelFilter(options: {
	allowedChannels?: string[];
	blockedChannels?: string[];
	allowDMs?: boolean;
}): MessageFilterFunction {
	return async (message) => {
		// Always allow E2E test clients (whitelisted for testing)
		if (isE2ETestClient(message)) {
			return false; // Don't skip - allow test clients
		}

		// Apply default filtering first (optional)
		if (defaultMessageFilter(message)) {
			return true;
		}
		// Handle DM filtering
		if (message.channel.type === ChannelType.DM) {
			return !options.allowDMs;
		}
		
		// Handle guild channel filtering
		if (message.channel.type === ChannelType.GuildText) {
			const channelName = message.channel.name;
			
			// Check blocked channels first
			if (options.blockedChannels?.includes(channelName)) {
				return true;
			}
			
			// Check allowed channels
			if (options.allowedChannels && !options.allowedChannels.includes(channelName)) {
				return true;
			}
		}
		
		return false;
	};
}

/**
 * Skip messages based on user roles
 */
export function createRoleBasedFilter(options: {
	requiredRoles?: string[];
	blockedRoles?: string[];
}): MessageFilterFunction {
	return async (message) => {
		// Always allow E2E test clients (whitelisted for testing)
		if (isE2ETestClient(message)) {
			return false; // Don't skip - allow test clients
		}

		// Apply default filtering first (optional)
		if (defaultMessageFilter(message)) {
			return true;
		}
		// Only works in guild channels
		if (!message.member) {
			return false;
		}
		
		const userRoles = message.member.roles.cache.map(role => role.name);
		
		// Check for blocked roles
		if (options.blockedRoles) {
			const hasBlockedRole = options.blockedRoles.some(role => userRoles.includes(role));
			if (hasBlockedRole) {
				return true;
			}
		}
		
		// Check for required roles
		if (options.requiredRoles) {
			const hasRequiredRole = options.requiredRoles.some(role => userRoles.includes(role));
			if (!hasRequiredRole) {
				return true;
			}
		}
		
		return false;
	};
}

/**
 * Skip messages based on content patterns
 */
export function createContentFilter(options: {
	minLength?: number;
	maxLength?: number;
	blockedPatterns?: RegExp[];
	requiredPatterns?: RegExp[];
}): MessageFilterFunction {
	return async (message) => {
		// Always allow E2E test clients (whitelisted for testing)
		if (isE2ETestClient(message)) {
			return false; // Don't skip - allow test clients
		}

		// Apply default filtering first (optional)
		if (defaultMessageFilter(message)) {
			return true;
		}
		const content = message.content;
		
		// Check length constraints
		if (options.minLength && content.length < options.minLength) {
			return true;
		}
		
		if (options.maxLength && content.length > options.maxLength) {
			return true;
		}
		
		// Check blocked patterns
		if (options.blockedPatterns) {
			const hasBlockedPattern = options.blockedPatterns.some(pattern => pattern.test(content));
			if (hasBlockedPattern) {
				return true;
			}
		}
		
		// Check required patterns
		if (options.requiredPatterns) {
			const hasRequiredPattern = options.requiredPatterns.some(pattern => pattern.test(content));
			if (!hasRequiredPattern) {
				return true;
			}
		}
		
		return false;
	};
}

/**
 * Time-based filtering (e.g., only respond during certain hours)
 */
export function createTimeBasedFilter(options: {
	allowedHours?: number[]; // 0-23
	timezone?: string;
}): MessageFilterFunction {
	return async (message) => {
		// Always allow E2E test clients (whitelisted for testing)
		if (isE2ETestClient(message)) {
			return false; // Don't skip - allow test clients
		}

		// Apply default filtering first (optional)
		if (defaultMessageFilter(message)) {
			return true;
		}
		if (!options.allowedHours) {
			return false;
		}
		
		const now = new Date();
		const currentHour = options.timezone 
			? new Intl.DateTimeFormat('en-US', { 
				timeZone: options.timezone, 
				hour: 'numeric', 
				hour12: false 
			}).formatToParts(now).find(part => part.type === 'hour')?.value || '0'
			: now.getHours();
		
		const hour = typeof currentHour === 'string' ? parseInt(currentHour, 10) : currentHour;
		
		return !options.allowedHours.includes(hour);
	};
}

/**
 * Composite example: Chad bot that doesn't respond to itself and has time restrictions
 * Factory function that creates a filter with injected dependencies
 */
export function createChadMessageFilter(configService: ConfigurationService): MessageFilterFunction {
	return async (message) => {
		// Always allow E2E test clients (whitelisted for testing)
		if (isE2ETestClient(message)) {
			return false; // Don't skip - allow test clients
		}

		// Apply default filtering first (optional)
		if (defaultMessageFilter(message)) {
			return true;
		}
		// Don't respond to Chad himself
		const chadUserId = await configService.getUserIdByUsername('Chad');
		if (chadUserId && message.author.id === chadUserId) {
			return true;
		}
		
		// Only respond during "gym hours" (6 AM - 10 PM EST)
		const now = new Date();
		const estHourPart = new Intl.DateTimeFormat('en-US', {
			timeZone: 'America/New_York',
			hour: 'numeric',
			hour12: false
		}).formatToParts(now).find(part => part.type === 'hour')?.value || '0';
		const estHour = parseInt(estHourPart, 10);
		if (estHour < 6 || estHour > 22) {
			return true; // Chad is sleeping or resting
		}
		
		// Don't respond to messages that are too short (Chad likes substance)
		if (message.content.trim().length < 10) {
			return true;
		}
		
		return false;
	};
}