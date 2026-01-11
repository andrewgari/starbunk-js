import { PrismaClient } from '@prisma/client';
import path from 'path';
import { CampaignRepository, FileRepository, MessageRepository } from '../../domain/repositories';
import { LocalFileRepository } from './files/localFileRepository';
import { SQLiteCampaignRepository } from './sqlite/repositories/campaignRepository';
import { SQLiteMessageRepository } from './sqlite/repositories/message-repository';

export class RepositoryFactory {
	private static instance: RepositoryFactory;
	private prisma: PrismaClient;
	private fileBasePath: string;

	private constructor() {
		this.prisma = new PrismaClient();
		this.fileBasePath = path.join(process.cwd(), 'data', 'files');
	}

	public static getInstance(): RepositoryFactory {
		if (!RepositoryFactory.instance) {
			RepositoryFactory.instance = new RepositoryFactory();
		}
		return RepositoryFactory.instance;
	}

	getCampaignRepository(): CampaignRepository {
		return new SQLiteCampaignRepository(this.prisma);
	}

	getMessageRepository(): MessageRepository {
		return new SQLiteMessageRepository(this.prisma);
	}

	getFileRepository(): FileRepository {
		return new LocalFileRepository(this.fileBasePath, this.prisma);
	}
}
