#!/usr/bin/env ts-node

/**
 * Comprehensive test runner for BunkBot Unit Tests
 *
 * This script runs all the BunkBot tests in the correct order and provides
 * detailed reporting on test results, including debug mode vs production mode
 * behavior validation.
 */

import { execSync } from 'child_process';

interface TestSuite {
	name: string;
	file: string;
	description: string;
	critical: boolean; // Whether failure should stop the entire test run
}

const TEST_SUITES: TestSuite[] = [
	{
		name: 'Bot Trigger Conditions',
		file: 'bot-trigger-conditions.test.ts',
		description: 'Unit tests for individual trigger condition functions',
		critical: true,
	},
	{
		name: 'CovaBot Filtering',
		file: 'covabot-filtering.test.ts',
		description: 'Tests for CovaBot message filtering and exclusion',
		critical: true,
	},
	{
		name: 'Debug Mode Behavior',
		file: 'debug-mode-behavior.test.ts',
		description: 'Tests for debug mode vs production mode behavior differences',
		critical: true,
	},
	{
		name: 'Individual Bot Triggers',
		file: 'individual-bot-triggers.test.ts',
		description: 'Tests for specific bot trigger patterns and responses',
		critical: false,
	},
];

interface TestResult {
	suite: TestSuite;
	passed: boolean;
	duration: number;
	output: string;
	error?: string;
}

class BunkBotTestRunner {
	private results: TestResult[] = [];
	private startTime: number = 0;

	async runAllTests(): Promise<void> {
		console.log('🚀 Starting BunkBot Comprehensive Test Suite');
		console.log('='.repeat(60));

		this.startTime = Date.now();

		for (const suite of TEST_SUITES) {
			await this.runTestSuite(suite);
		}

		this.printSummary();
	}

	private async runTestSuite(suite: TestSuite): Promise<void> {
		console.log(`\n📋 Running: ${suite.name}`);
		console.log(`📝 ${suite.description}`);
		console.log('-'.repeat(40));

		const startTime = Date.now();
		let passed = false;
		let output = '';
		let error: string | undefined;

		try {
			// Run the test suite using Jest
			const command = `npx jest ${suite.file} --verbose --no-cache`;
			output = execSync(command, {
				cwd: process.cwd(),
				encoding: 'utf8',
				stdio: 'pipe',
			});
			passed = true;
			console.log('✅ PASSED');
		} catch (err: any) {
			passed = false;
			error = err.message;
			output = err.stdout || err.stderr || err.message;
			console.log('❌ FAILED');

			if (suite.critical) {
				console.log('🚨 CRITICAL TEST FAILED - This may indicate a serious issue');
			}
		}

		const duration = Date.now() - startTime;

		this.results.push({
			suite,
			passed,
			duration,
			output,
			error,
		});

		console.log(`⏱️  Duration: ${duration}ms`);

		// If it's a critical test and it failed, we might want to stop
		if (!passed && suite.critical) {
			console.log('\n🛑 Critical test failed. Consider fixing before proceeding.');
		}
	}

	private printSummary(): void {
		const totalDuration = Date.now() - this.startTime;
		const passedTests = this.results.filter((r) => r.passed).length;
		const failedTests = this.results.filter((r) => !r.passed).length;
		const criticalFailures = this.results.filter((r) => !r.passed && r.suite.critical).length;

		console.log('\n' + '='.repeat(60));
		console.log('📊 TEST SUMMARY');
		console.log('='.repeat(60));

		console.log(`\n📈 Overall Results:`);
		console.log(`   ✅ Passed: ${passedTests}/${this.results.length}`);
		console.log(`   ❌ Failed: ${failedTests}/${this.results.length}`);
		console.log(`   🚨 Critical Failures: ${criticalFailures}`);
		console.log(`   ⏱️  Total Duration: ${totalDuration}ms`);

		console.log(`\n📋 Detailed Results:`);
		this.results.forEach((result, _index) => {
			const status = result.passed ? '✅' : '❌';
			const critical = result.suite.critical ? '🚨' : '📝';
			console.log(`   ${status} ${critical} ${result.suite.name} (${result.duration}ms)`);

			if (!result.passed && result.error) {
				console.log(`      Error: ${result.error.split('\n')[0]}`);
			}
		});

		// Print recommendations
		console.log(`\n💡 Recommendations:`);

		if (criticalFailures === 0) {
			console.log(`   🎉 All critical tests passed! BunkBot core functionality is working correctly.`);
		} else {
			console.log(`   🚨 ${criticalFailures} critical test(s) failed. These should be fixed immediately:`);
			this.results
				.filter((r) => !r.passed && r.suite.critical)
				.forEach((r) => {
					console.log(`      - ${r.suite.name}: ${r.suite.description}`);
				});
		}

		if (failedTests > criticalFailures) {
			const nonCriticalFailures = failedTests - criticalFailures;
			console.log(`   ⚠️  ${nonCriticalFailures} non-critical test(s) failed. Consider fixing when possible.`);
		}

		// Print debug mode testing status
		console.log(`\n🔧 Debug Mode Testing:`);
		const debugModeTest = this.results.find((r) => r.suite.name === 'Debug Mode Behavior');
		if (debugModeTest?.passed) {
			console.log(`   ✅ Debug mode behavior is correctly implemented`);
			console.log(`   ✅ Production mode behavior is correctly implemented`);
			console.log(`   ✅ Mode switching works as expected`);
		} else {
			console.log(`   ❌ Debug mode behavior tests failed - check implementation`);
		}

		// Print CovaBot filtering status
		console.log(`\n🤖 CovaBot Filtering:`);
		const covaBotTest = this.results.find((r) => r.suite.name === 'CovaBot Filtering');
		if (covaBotTest?.passed) {
			console.log(`   ✅ CovaBot messages are correctly filtered out`);
			console.log(`   ✅ Other bot messages are handled appropriately`);
			console.log(`   ✅ Human messages are processed normally`);
		} else {
			console.log(`   ❌ CovaBot filtering tests failed - check exclusion logic`);
		}

		// Exit with appropriate code
		if (criticalFailures > 0) {
			console.log(`\n🚨 Exiting with error code due to critical test failures`);
			process.exit(1);
		} else if (failedTests > 0) {
			console.log(`\n⚠️  Exiting with warning due to non-critical test failures`);
			process.exit(2);
		} else {
			console.log(`\n🎉 All tests passed! BunkBot is ready for deployment.`);
			process.exit(0);
		}
	}
}

// Run the tests if this file is executed directly
if (require.main === module) {
	const runner = new BunkBotTestRunner();
	runner.runAllTests().catch((error) => {
		console.error('💥 Test runner failed:', error);
		process.exit(1);
	});
}

export { BunkBotTestRunner, TEST_SUITES };
