// Configuration service types
export interface BotTriggerConfig {
	name: string;
	pattern: RegExp;
	priority: number;
	isEnabled: boolean;
	description?: string;
}

export interface BotResponseConfig {
	name: string;
	type: 'static' | 'random' | 'llm' | 'function';
	content?: string;
	alternatives?: string[];
	priority: number;
	isEnabled: boolean;
	metadata?: any;
}

export interface BotConfig {
	botName: string;
	displayName: string;
	description?: string;
	isEnabled: boolean;
	avatarUrl?: string;
	priority: number;
	triggers: BotTriggerConfig[];
	responses: BotResponseConfig[];
	metadata?: any;
}

export interface UserConfig {
	userId: string;
	username: string;
	displayName?: string;
	isActive: boolean;
	metadata?: any;
}

export interface ServerConfig {
	serverId: string;
	serverName: string;
	isActive: boolean;
	settings?: any;
}

export interface ConfigurationServiceOptions {
	enableCache?: boolean;
	cacheTimeout?: number;
	fallbackToHardcoded?: boolean;
}
