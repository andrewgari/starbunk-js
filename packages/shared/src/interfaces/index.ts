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
export { container, getService } from '../services/container';
export type { Logger, WebhookService, ServiceId } from '../services/container';
