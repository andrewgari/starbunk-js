// Shared interfaces for all containers
export interface ContainerConfig {
	name: string;
	version: string;
	discordToken: string;
	databaseUrl?: string;
	debug?: boolean;
}

export interface ModuleInterface {
	name: string;
	initialize(): Promise<void>;
	start(): Promise<void>;
	stop(): Promise<void>;
	isHealthy(): Promise<boolean>;
}

export interface ErrorBoundary {
	handleError(error: Error, context: string): void;
	isRecoverable(error: Error): boolean;
}

// Re-export service interfaces
export { Logger, WebhookService, ServiceId, container, getService } from '../services/container';
