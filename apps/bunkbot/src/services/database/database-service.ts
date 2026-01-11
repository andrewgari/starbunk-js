import { PrismaClient } from '@prisma/client';
import { logger } from '@starbunk/shared';
import { DatabaseConnectionOptions } from './types';

export class DatabaseService {
	private static instance: DatabaseService;
	private prisma: PrismaClient | null = null;
	private isConnected = false;
	private connectionOptions: DatabaseConnectionOptions;

	private constructor(options: DatabaseConnectionOptions = {}) {
		this.connectionOptions = {
			maxConnections: 10,
			connectionTimeout: 10000,
			retryAttempts: 3,
			retryDelay: 1000,
			...options,
		};
	}

	public static getInstance(options?: DatabaseConnectionOptions): DatabaseService {
		if (!DatabaseService.instance) {
			DatabaseService.instance = new DatabaseService(options);
		}
		return DatabaseService.instance;
	}

	public async connect(): Promise<void> {
		if (this.isConnected && this.prisma) {
			return;
		}

		const databaseUrl = this.connectionOptions.url || process.env.DATABASE_URL;
		if (!databaseUrl) {
			throw new Error('DATABASE_URL environment variable is required');
		}

		logger.info('🔌 Connecting to PostgreSQL database...');

		try {
			this.prisma = new PrismaClient({
				datasources: {
					db: {
						url: databaseUrl,
					},
				},
				log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
			});

			// Test the connection
			await this.prisma.$connect();
			await this.prisma.$queryRaw`SELECT 1`;

			this.isConnected = true;
			logger.info('✅ Database connection established successfully');
		} catch (error) {
			logger.error(
				'❌ Failed to connect to database:',
				error instanceof Error ? error : new Error(String(error)),
			);
			this.prisma = null;
			this.isConnected = false;
			throw error;
		}
	}

	public async disconnect(): Promise<void> {
		if (this.prisma) {
			logger.info('🔌 Disconnecting from database...');
			await this.prisma.$disconnect();
			this.prisma = null;
			this.isConnected = false;
			logger.info('✅ Database disconnected successfully');
		}
	}

	public getClient(): PrismaClient {
		if (!this.prisma || !this.isConnected) {
			throw new Error('Database not connected. Call connect() first.');
		}
		return this.prisma;
	}

	public isReady(): boolean {
		return this.isConnected && this.prisma !== null;
	}

	public async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }> {
		try {
			if (!this.prisma || !this.isConnected) {
				return { status: 'unhealthy', message: 'Database not connected' };
			}

			await this.prisma.$queryRaw`SELECT 1`;
			return { status: 'healthy', message: 'Database connection is healthy' };
		} catch (error) {
			logger.error('Database health check failed:', error instanceof Error ? error : new Error(String(error)));
			return { status: 'unhealthy', message: `Database health check failed: ${error}` };
		}
	}

	public async withRetry<T>(operation: () => Promise<T>, maxRetries?: number): Promise<T> {
		const retries = Math.max(1, maxRetries ?? this.connectionOptions.retryAttempts ?? 3);
		const delay = this.connectionOptions.retryDelay || 1000;

		for (let attempt = 1; attempt <= retries; attempt++) {
			try {
				return await operation();
			} catch (error) {
				if (attempt === retries) {
					throw error;
				}

				logger.warn(
					`Database operation failed (attempt ${attempt}/${retries}), retrying in ${delay}ms...`,
					error,
				);
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}

		throw new Error('Max retries exceeded');
	}
}

// Export singleton instance getter
export const getDatabaseService = (options?: DatabaseConnectionOptions): DatabaseService => {
	return DatabaseService.getInstance(options);
};
