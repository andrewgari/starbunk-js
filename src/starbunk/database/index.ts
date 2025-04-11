import { PrismaClient } from '@prisma/client';
import { CampaignRepository } from './repositories/campaign-repository';
import { CharacterRepository } from './repositories/character-repository';

export class Database {
	private static instance: Database;
	private prisma: PrismaClient;

	private constructor() {
		this.prisma = new PrismaClient();
	}

	public static getInstance(): Database {
		if (!Database.instance) {
			Database.instance = new Database();
		}
		return Database.instance;
	}

	async init() {
		await this.prisma.$connect();
	}

	async cleanup() {
		await this.prisma.$disconnect();
	}

	get campaigns() {
		return new CampaignRepository(this.prisma);
	}

	get characters() {
		return new CharacterRepository(this.prisma);
	}
}
