import { container, ServiceId } from '../container';

describe('SimpleContainer', () => {
	// Mock service for testing
	const mockService = {
		test: 'test-value',
		method: jest.fn()
	};

	const mockLogger = {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		success: jest.fn(),
		formatMessage: jest.fn()
	};

	// Test symbol
	const TEST_SERVICE = Symbol.for('TestService');

	beforeEach(() => {
		// Reset the container before each test
		container.clear();
	});

	describe('register', () => {
		test('should register a service', () => {
			container.register(TEST_SERVICE, mockService);
			expect(container.has(TEST_SERVICE)).toBe(true);
		});

		test('should overwrite a service if registered again with same ID', () => {
			const service1 = { name: 'service1' };
			const service2 = { name: 'service2' };
      
			container.register(TEST_SERVICE, service1);
			container.register(TEST_SERVICE, service2);
      
			expect(container.get(TEST_SERVICE)).toBe(service2);
		});

		test('should allow registering different services with different IDs', () => {
			const TEST_SERVICE_2 = Symbol.for('TestService2');
      
			container.register(TEST_SERVICE, mockService);
			container.register(TEST_SERVICE_2, mockLogger);
      
			expect(container.get(TEST_SERVICE)).toBe(mockService);
			expect(container.get(TEST_SERVICE_2)).toBe(mockLogger);
		});
	});

	describe('get', () => {
		test('should retrieve a registered service', () => {
			container.register(TEST_SERVICE, mockService);
			expect(container.get(TEST_SERVICE)).toBe(mockService);
		});

		test('should throw error when getting unregistered service', () => {
			expect(() => {
				container.get(Symbol.for('UnregisteredService'));
			}).toThrow('Service not registered');
		});

		test('should retrieve the correct service by ID', () => {
			// Register multiple services
			container.register(ServiceId.Logger, mockLogger);
			container.register(TEST_SERVICE, mockService);
      
			// Make sure we get the right service for each ID
			expect(container.get(ServiceId.Logger)).toBe(mockLogger);
			expect(container.get(TEST_SERVICE)).toBe(mockService);
		});
	});

	describe('has', () => {
		test('should return true for registered services', () => {
			container.register(TEST_SERVICE, mockService);
			expect(container.has(TEST_SERVICE)).toBe(true);
		});

		test('should return false for unregistered services', () => {
			expect(container.has(Symbol.for('UnregisteredService'))).toBe(false);
		});
	});

	describe('clear', () => {
		test('should remove all registered services', () => {
			container.register(TEST_SERVICE, mockService);
			container.register(ServiceId.Logger, mockLogger);
      
			expect(container.has(TEST_SERVICE)).toBe(true);
			expect(container.has(ServiceId.Logger)).toBe(true);
      
			container.clear();
      
			expect(container.has(TEST_SERVICE)).toBe(false);
			expect(container.has(ServiceId.Logger)).toBe(false);
		});
	});
});