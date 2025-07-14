// Jest manual mock for @prisma/client
class PrismaClientMock {
	constructor() {
		// Mock the blacklist model
		const buildModelMock = () => ({
			findUnique: jest.fn(),
			findFirst: jest.fn(),
			findMany: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			upsert: jest.fn().mockImplementation(({ update, create }) =>
				Promise.resolve({ ...create, ...update })
			),
			delete: jest.fn(),
			deleteMany: jest.fn(),
			count: jest.fn()
		});

		this.blacklist = buildModelMock();
		this.guild = buildModelMock();
		this.channel = buildModelMock();
		this.user = buildModelMock();
		this.role = buildModelMock();
		this.userOnGuild = buildModelMock();
		this.userConfiguration = buildModelMock();
		this.botConfiguration = buildModelMock();
		this.serverConfiguration = buildModelMock();

		// Mock the guild model
		this.guild = {
			findUnique: jest.fn().mockResolvedValue(null),
			findFirst: jest.fn().mockResolvedValue(null),
			findMany: jest.fn().mockResolvedValue([]),
			create: jest.fn().mockImplementation(data => Promise.resolve(data.data)),
			update: jest.fn().mockImplementation(data => Promise.resolve(data.data)),
			upsert: jest.fn().mockImplementation(data => Promise.resolve(data.create)),
			delete: jest.fn().mockResolvedValue({}),
			deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
			count: jest.fn().mockResolvedValue(0)
		};

		// Mock the channel model
		this.channel = {
			findUnique: jest.fn().mockResolvedValue(null),
			findFirst: jest.fn().mockResolvedValue(null),
			findMany: jest.fn().mockResolvedValue([]),
			create: jest.fn().mockImplementation(data => Promise.resolve(data.data)),
			update: jest.fn().mockImplementation(data => Promise.resolve(data.data)),
			upsert: jest.fn().mockImplementation(data => Promise.resolve(data.create)),
			delete: jest.fn().mockResolvedValue({}),
			deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
			count: jest.fn().mockResolvedValue(0)
		};

		// Mock connection methods
		this.$connect = jest.fn().mockResolvedValue(undefined);
		this.$disconnect = jest.fn().mockResolvedValue(undefined);
	}
}

module.exports = {
	PrismaClient: PrismaClientMock,
};
