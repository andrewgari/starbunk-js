import { PrismaClient } from '@prisma/client';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
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

	async save(file: Buffer, metadata: Omit<StoredFile, 'id' | 'path' | 'createdAt' | 'updatedAt'>): Promise<StoredFile> {
		const id = uuidv4();
		const relativePath = path.join(this.basePath, id);

		await fs.writeFile(relativePath, file);
		const stats = await fs.stat(relativePath);

		const storedFile = await this.prisma.storedFile.create({
			data: {
				id,
				name: metadata.name,
				url: `file://${relativePath}`,
				type: path.extname(metadata.name).slice(1),
				size: stats.size,
				uploaderId: metadata.uploaderId,
				campaignId: metadata.campaignId,
				path: relativePath,
				mimeType: `application/${path.extname(metadata.name).slice(1)}`
			}
		});

		return {
			id: storedFile.id,
			name: storedFile.name,
			url: storedFile.url,
			type: storedFile.type,
			size: storedFile.size,
			uploaderId: storedFile.uploaderId,
			campaignId: storedFile.campaignId,
			createdAt: storedFile.createdAt,
			updatedAt: storedFile.updatedAt
		};
	}

	async findById(id: string): Promise<StoredFile | null> {
		const file = await this.prisma.storedFile.findUnique({
			where: { id }
		});
		return file;
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
		return fs.readFile(file.url.replace('file://', ''));
	}

	async delete(id: string): Promise<void> {
		const file = await this.findById(id);
		if (!file) {
			return;
		}

		// Delete from filesystem
		try {
			await fs.unlink(file.url.replace('file://', ''));
		} catch (error) {
			console.error(`Error deleting file ${id}:`, error);
		}

		// Delete from database
		await this.prisma.storedFile.delete({
			where: { id }
		});
	}
}
