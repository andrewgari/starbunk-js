import { PrismaClient } from '@prisma/client';
import { CreateCharacterDto, UpdateCharacterDto } from '../dto/character.dto';

export class CharacterRepository {
	constructor(private prisma: PrismaClient) { }

	async create(data: CreateCharacterDto) {
		return this.prisma.character.create({
			data,
			include: {
				campaign: true
			}
		});
	}

	async findOne(where: Partial<CreateCharacterDto>) {
		return this.prisma.character.findFirst({
			where,
			include: {
				campaign: true
			}
		});
	}

	async findMany(where: Partial<CreateCharacterDto>) {
		return this.prisma.character.findMany({
			where,
			include: {
				campaign: true
			}
		});
	}

	async update(id: string, data: UpdateCharacterDto) {
		return this.prisma.character.update({
			where: { id },
			data,
			include: {
				campaign: true
			}
		});
	}

	async delete(id: string): Promise<void> {
		await this.prisma.character.delete({
			where: { id }
		});
	}
}
