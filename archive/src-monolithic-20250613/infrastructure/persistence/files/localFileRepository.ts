import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { StoredFile } from '../../../domain/models';
import { FileRepository } from '../../../domain/repositories';

export class LocalFileRepository implements FileRepository {
	constructor(
		private basePath: string,
		private prisma: PrismaClient
	) {
		// Ensure base directory exists
		fs.mkdir(this.basePath, { recursive: true });
	}

	async save(file: Buffer, metadata: Omit<StoredFile, 'id' | 'path' | 'createdAt'>): Promise<StoredFile> {
		const id = randomUUID();
		const relativePath = path.join(metadata.campaignId, `${id}-${metadata.name}`);
		const fullPath = path.join(this.basePath, relativePath);

		// Ensure campaign directory exists
		await fs.mkdir(path.dirname(fullPath), { recursive: true });

		// Write file
		await fs.writeFile(fullPath, file);

		// Store file metadata in database
		return this.prisma.storedFile.create({
			data: {
				id,
				...metadata,
				path: relativePath
			}
		});
	}

	async findById(id: string): Promise<StoredFile | null> {
		return this.prisma.storedFile.findUnique({
			where: { id }
		});
	}

	async findByCampaign(campaignId: string): Promise<StoredFile[]> {
		return this.prisma.storedFile.findMany({
			where: { campaignId }
		});
	}

	async getContent(id: string): Promise<Buffer> {
		const file = await this.findById(id);
		if (!file) {
			throw new Error(`File not found: ${id}`);
		}
		return fs.readFile(path.join(this.basePath, file.path));
	}

	async delete(id: string): Promise<void> {
		const file = await this.findById(id);
		if (!file) {
			return;
		}

		// Delete from filesystem
		try {
			await fs.unlink(path.join(this.basePath, file.path));
		} catch (error) {
			console.error(`Error deleting file ${id}:`, error);
		}

		// Delete from database
		await this.prisma.storedFile.delete({
			where: { id }
		});
	}
}
