// Jest manual mock for @prisma/client
class PrismaClientMock {
	constructor() {
		this.blacklist = {
			findUnique: jest.fn().mockResolvedValue(null),
		};
	}
}

module.exports = {
	PrismaClient: PrismaClientMock,
};
