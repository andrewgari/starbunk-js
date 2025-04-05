// Mock external dependencies
const mockRegisterPrompt = jest.fn();
const mockGetPersonalityService = jest.fn();
const mockLoadPersonalityEmbedding = jest.fn();

jest.mock('../../../../../services/llm/promptManager', () => ({
	PromptRegistry: {
		registerPrompt: mockRegisterPrompt
	},
	PromptType: {
		COVA_EMULATOR: 'covaEmulator',
		COVA_DECISION: 'covaDecision'
	}
}));
jest.mock('../../../../../services/personalityService', () => ({
	getPersonalityService: mockGetPersonalityService
}));

// Keep necessary imports
// import { PromptType } from '../../../../../services/llm/promptManager'; // No longer needed directly
import { COVA_BOT_PROMPTS } from '../constants';
// Import the factory and the function under test
import { CovaBotFactory, initializeCovaBot } from '../index';

// Remove the jest.mock call for the entire module
// jest.mock('../index', () => ({
//  ...jest.requireActual('../index'),
//  _initializeCovaPrompts: jest.fn().mockResolvedValue(undefined),
//  _loadCovaPersonalityEmbedding: jest.fn(),
// }));

describe('CovaBot Factory (initializeCovaBot)', () => {
	// Declare spies
	let initializePromptsSpy: jest.SpyInstance;
	let loadEmbeddingSpy: jest.SpyInstance;

	// Remove direct mock references
	// const mockInitializePrompts = CovaBotModule._initializeCovaPrompts as jest.MockedFunction<typeof CovaBotModule._initializeCovaPrompts>;
	// const mockLoadEmbedding = CovaBotModule._loadCovaPersonalityEmbedding as jest.MockedFunction<typeof CovaBotModule._loadCovaPersonalityEmbedding>;

	beforeEach(() => {
		jest.clearAllMocks();

		// Mock the return value of getPersonalityService
		mockGetPersonalityService.mockReturnValue({
			loadPersonalityEmbedding: mockLoadPersonalityEmbedding,
			generatePersonalityEmbedding: jest.fn() // Mock other methods if necessary
		});

		// Use jest.spyOn to mock the public static methods of the imported factory
		initializePromptsSpy = jest.spyOn(CovaBotFactory, 'initializePrompts');
		// .mockResolvedValue(undefined); // We want the actual implementation to run to call the mocked PromptRegistry

		loadEmbeddingSpy = jest.spyOn(CovaBotFactory, 'loadPersonalityEmbedding');
		// Let the actual implementation run, it will use the mocked personalityService
	});

	// Add afterEach to restore spies
	afterEach(() => {
		// jest.restoreAllMocks(); // Use this instead of individual restores if preferred
		initializePromptsSpy.mockRestore();
		loadEmbeddingSpy.mockRestore();
	});

	it('should call dependency methods and return config with embeddings when successful', async () => {
		// Setup mock return value for the *service* method
		mockLoadPersonalityEmbedding.mockResolvedValueOnce(new Float32Array([0.1, 0.2, 0.3]));

		// Execute
		const config = await initializeCovaBot();

		// Verify spies on static methods were called (optional, focus on dependency calls)
		expect(initializePromptsSpy).toHaveBeenCalledTimes(1);
		expect(loadEmbeddingSpy).toHaveBeenCalledTimes(1);

		// Verify the *mocked dependencies* were called correctly
		// initializePrompts calls registerPrompt twice
		expect(mockRegisterPrompt).toHaveBeenCalledTimes(2);
		expect(mockRegisterPrompt).toHaveBeenCalledWith('covaEmulator', expect.any(Object));
		expect(mockRegisterPrompt).toHaveBeenCalledWith('covaDecision', expect.any(Object));
		// loadPersonalityEmbedding calls getPersonalityService once
		expect(mockGetPersonalityService).toHaveBeenCalledTimes(1);
		// The service's loadPersonalityEmbedding is called once (npy succeeds)
		expect(mockLoadPersonalityEmbedding).toHaveBeenCalledTimes(1);
		// Check args if needed, e.g., .toHaveBeenCalledWith('personality.npy', 'covaBot')

		// Verify config contents
		expect(config.embedding).toEqual(new Float32Array([0.1, 0.2, 0.3]));
		expect(config.prompts).toEqual({
			emulator: COVA_BOT_PROMPTS.EmulatorPrompt,
			decision: COVA_BOT_PROMPTS.DecisionPrompt
		});
	});

	it('should call dependency methods and return config without embedding if loading fails', async () => {
		// Setup mock return value for the *service* method (simulate failure)
		// Simulate both npy and json failing
		mockLoadPersonalityEmbedding.mockResolvedValue(undefined);
		// Mock generate to also fail
		const mockGenerateEmbedding = jest.fn().mockResolvedValue(undefined);
		mockGetPersonalityService.mockReturnValue({
			loadPersonalityEmbedding: mockLoadPersonalityEmbedding,
			generatePersonalityEmbedding: mockGenerateEmbedding
		});

		// Execute
		const config = await initializeCovaBot();

		// Verify spies on static methods were called (optional)
		expect(initializePromptsSpy).toHaveBeenCalledTimes(1);
		expect(loadEmbeddingSpy).toHaveBeenCalledTimes(1);

		// Verify the *mocked dependencies* were called correctly WITHIN THIS TEST
		// initializePrompts calls registerPrompt twice
		expect(mockRegisterPrompt).toHaveBeenCalledTimes(2);
		// loadPersonalityEmbedding calls getPersonalityService once
		expect(mockGetPersonalityService).toHaveBeenCalledTimes(1);
		// The service's loadPersonalityEmbedding is called twice (npy fails, then json fails)
		expect(mockLoadPersonalityEmbedding).toHaveBeenCalledTimes(2);
		// The service's generatePersonalityEmbedding is called once as a fallback
		expect(mockGenerateEmbedding).toHaveBeenCalledTimes(1);

		// Verify config contents
		expect(config.embedding).toBeUndefined();
		expect(config.prompts).toEqual({
			emulator: COVA_BOT_PROMPTS.EmulatorPrompt,
			decision: COVA_BOT_PROMPTS.DecisionPrompt
		});
	});

	// Remove tests that were testing the internal implementation details
	// it('should try JSON format if NPY fails', async () => {
	//  ...
	// });

	// it('should generate new embedding if loading fails', async () => {
	//  ...
	// });

	// Note: The test 'should return config without embedding if all attempts fail'
	// is now covered by 'should return config without embedding if loading fails'
	// because we are mocking the loadPersonalityEmbedding directly.
});
