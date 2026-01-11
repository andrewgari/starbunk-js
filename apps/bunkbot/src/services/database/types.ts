// Database service types
export interface BotConfigurationData {
	id: string;
	botName: string;
	displayName: string;
	description?: string;
	isEnabled: boolean;
	avatarUrl?: string;
	priority: number;
	metadata?: any;
	patterns: BotPatternData[];
	responses: BotResponseData[];
}

export interface BotPatternData {
	id: string;
	name: string;
	pattern: string;
	patternFlags?: string;
	isEnabled: boolean;
	priority: number;
	description?: string;
}

export interface BotResponseData {
	id: string;
	name: string;
	responseType: 'static' | 'random' | 'llm' | 'function';
	content?: string;
	alternatives?: string[];
	isEnabled: boolean;
	priority: number;
	metadata?: any;
}

export interface UserConfigurationData {
	id: string;
	userId: string;
	username: string;
	displayName?: string;
	isActive: boolean;
	metadata?: any;
}

export interface ServerConfigurationData {
	id: string;
	serverId: string;
	serverName: string;
	isActive: boolean;
	settings?: any;
}

export interface DatabaseConnectionOptions {
	url?: string;
	maxConnections?: number;
	connectionTimeout?: number;
	retryAttempts?: number;
	retryDelay?: number;
}
