import { logger } from '../../logger';
import { runPromptKitTests } from './testPromptKit';

/**
 * Execute all LLM service tests
 */
async function runAllTests(): Promise<void> {
	logger.info('========================================');
	logger.info('Starting LLM Service tests');
	logger.info('========================================');

	try {
		// Run PromptKit tests
		await runPromptKitTests();

		// Add more test suites here as needed

		logger.info('========================================');
		logger.info('All tests completed successfully');
		logger.info('========================================');
	} catch (error) {
		const typedError = error instanceof Error ? error : new Error(String(error));
		logger.error('Tests failed with error:', typedError);
		process.exit(1);
	}
}

// Allow running directly from command line
if (require.main === module) {
	runAllTests().catch(error => {
		logger.error('Test runner failed:', error);
		process.exit(1);
	});
}

export { runAllTests };
export default { runAllTests };
