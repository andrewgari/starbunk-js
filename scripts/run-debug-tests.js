#!/usr/bin/env node

/**
 * Debug Mode Test Runner
 * 
 * This script runs comprehensive debug mode tests across all containers
 * and provides detailed reporting on the three-tier debug configuration system.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// ANSI color codes for console output
const colors = {
	reset: '\x1b[0m',
	bright: '\x1b[1m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	magenta: '\x1b[35m',
	cyan: '\x1b[36m'
};

// Container configurations
const containers = [
	{
		name: 'BunkBot',
		path: 'containers/bunkbot',
		testFiles: [
			'tests/debug-mode.test.ts',
			'tests/reply-bots-debug.test.ts'
		],
		description: 'Reply bots and admin commands with random trigger testing'
	},
	{
		name: 'DJCova',
		path: 'containers/djcova',
		testFiles: [
			'tests/debug-mode.test.ts'
		],
		description: 'Music service with voice connection isolation'
	},
	{
		name: 'Starbunk-DND',
		path: 'containers/starbunk-dnd',
		testFiles: [
			'tests/debug-mode.test.ts'
		],
		description: 'D&D features with LLM and database isolation'
	},
	{
		name: 'CovaBot',
		path: 'containers/covabot',
		testFiles: [
			'tests/debug-mode.test.ts'
		],
		description: 'AI responses with minimal DB and external service isolation'
	},
	{
		name: 'Shared Services',
		path: 'containers/shared',
		testFiles: [
			'tests/debug-mode-integration.test.ts',
			'tests/debug-configuration-validation.test.ts'
		],
		description: 'Core debug functionality and configuration validation'
	}
];

// Test categories for reporting
const testCategories = {
	'Random Trigger Behavior': {
		description: 'Tests that random triggers work at 100% rate in debug mode',
		containers: ['BunkBot']
	},
	'Message Filtering': {
		description: 'Tests three-tier filtering (DEBUG_MODE, TESTING_SERVER_IDS, TESTING_CHANNEL_IDS)',
		containers: ['BunkBot', 'DJCova', 'Starbunk-DND', 'CovaBot', 'Shared Services']
	},
	'Channel Filtering with DEBUG_MODE=true': {
		description: 'Tests that non-whitelisted channels are blocked even when DEBUG_MODE=true',
		containers: ['BunkBot', 'DJCova', 'Starbunk-DND', 'CovaBot', 'Shared Services']
	},
	'External Service Isolation': {
		description: 'Tests that external APIs and services are mocked in debug mode',
		containers: ['BunkBot', 'Starbunk-DND', 'CovaBot']
	},
	'Pre-Processing Filtering': {
		description: 'Tests that filtering occurs before any bot processing or external calls',
		containers: ['BunkBot', 'DJCova', 'Starbunk-DND', 'CovaBot']
	},
	'Configuration Validation': {
		description: 'Tests environment variable parsing and validation',
		containers: ['Shared Services']
	},
	'Container-Specific Features': {
		description: 'Tests debug behavior specific to each container type',
		containers: ['BunkBot', 'DJCova', 'Starbunk-DND', 'CovaBot']
	}
};

function log(message, color = 'reset') {
	console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
	log('\n' + '='.repeat(60), 'cyan');
	log(message, 'bright');
	log('='.repeat(60), 'cyan');
}

function logSubHeader(message) {
	log('\n' + '-'.repeat(40), 'blue');
	log(message, 'bright');
	log('-'.repeat(40), 'blue');
}

function checkTestFileExists(containerPath, testFile) {
	const fullPath = path.join(process.cwd(), containerPath, testFile);
	return fs.existsSync(fullPath);
}

function runContainerTests(container) {
	logSubHeader(`Testing ${container.name}`);
	log(`Description: ${container.description}`, 'yellow');
	
	const results = {
		container: container.name,
		passed: 0,
		failed: 0,
		skipped: 0,
		details: []
	};

	// Check if container directory exists
	const containerPath = path.join(process.cwd(), container.path);
	if (!fs.existsSync(containerPath)) {
		log(`⚠️  Container directory not found: ${container.path}`, 'yellow');
		results.skipped = container.testFiles.length;
		return results;
	}

	// Check if package.json exists
	const packageJsonPath = path.join(containerPath, 'package.json');
	if (!fs.existsSync(packageJsonPath)) {
		log(`⚠️  No package.json found in ${container.path}`, 'yellow');
		results.skipped = container.testFiles.length;
		return results;
	}

	for (const testFile of container.testFiles) {
		const testPath = path.join(containerPath, testFile);
		
		if (!checkTestFileExists(container.path, testFile)) {
			log(`⚠️  Test file not found: ${testFile}`, 'yellow');
			results.skipped++;
			results.details.push({ file: testFile, status: 'skipped', reason: 'File not found' });
			continue;
		}

		try {
			log(`\n🧪 Running ${testFile}...`);
			
			// Run Jest for the specific test file
			const command = `cd ${container.path} && npm test -- ${testFile} --verbose --no-coverage`;
			const output = execSync(command, { 
				encoding: 'utf8',
				stdio: 'pipe'
			});
			
			log(`✅ ${testFile} passed`, 'green');
			results.passed++;
			results.details.push({ file: testFile, status: 'passed' });
			
		} catch (error) {
			log(`❌ ${testFile} failed`, 'red');
			results.failed++;
			results.details.push({ 
				file: testFile, 
				status: 'failed', 
				error: error.message.split('\n').slice(0, 5).join('\n') // First 5 lines of error
			});
			
			// Log error details if verbose mode
			if (process.argv.includes('--verbose')) {
				log(`Error details:\n${error.message}`, 'red');
			}
		}
	}

	return results;
}

function generateReport(allResults) {
	logHeader('DEBUG MODE TEST REPORT');
	
	// Summary statistics
	const totalTests = allResults.reduce((sum, r) => sum + r.passed + r.failed + r.skipped, 0);
	const totalPassed = allResults.reduce((sum, r) => sum + r.passed, 0);
	const totalFailed = allResults.reduce((sum, r) => sum + r.failed, 0);
	const totalSkipped = allResults.reduce((sum, r) => sum + r.skipped, 0);
	
	log('\n📊 SUMMARY STATISTICS');
	log(`Total Tests: ${totalTests}`);
	log(`Passed: ${totalPassed}`, totalPassed > 0 ? 'green' : 'reset');
	log(`Failed: ${totalFailed}`, totalFailed > 0 ? 'red' : 'reset');
	log(`Skipped: ${totalSkipped}`, totalSkipped > 0 ? 'yellow' : 'reset');
	log(`Success Rate: ${totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0}%`);

	// Container breakdown
	logSubHeader('CONTAINER BREAKDOWN');
	allResults.forEach(result => {
		const total = result.passed + result.failed + result.skipped;
		const status = result.failed > 0 ? '❌' : result.skipped > 0 ? '⚠️' : '✅';
		log(`${status} ${result.container}: ${result.passed}/${total} passed`);
		
		if (process.argv.includes('--detailed')) {
			result.details.forEach(detail => {
				const icon = detail.status === 'passed' ? '  ✅' : detail.status === 'failed' ? '  ❌' : '  ⚠️';
				log(`${icon} ${detail.file}`);
				if (detail.error && process.argv.includes('--verbose')) {
					log(`     ${detail.error}`, 'red');
				}
			});
		}
	});

	// Test category coverage
	logSubHeader('TEST CATEGORY COVERAGE');
	Object.entries(testCategories).forEach(([category, info]) => {
		log(`\n📋 ${category}`);
		log(`   ${info.description}`, 'yellow');
		log(`   Containers: ${info.containers.join(', ')}`, 'cyan');
		
		const categoryResults = allResults.filter(r => info.containers.includes(r.container));
		const categoryPassed = categoryResults.reduce((sum, r) => sum + r.passed, 0);
		const categoryTotal = categoryResults.reduce((sum, r) => sum + r.passed + r.failed, 0);
		
		if (categoryTotal > 0) {
			const categoryRate = ((categoryPassed / categoryTotal) * 100).toFixed(1);
			log(`   Coverage: ${categoryPassed}/${categoryTotal} tests passed (${categoryRate}%)`, 
				categoryPassed === categoryTotal ? 'green' : 'yellow');
		} else {
			log(`   Coverage: No tests found`, 'red');
		}
	});

	// Recommendations
	logSubHeader('RECOMMENDATIONS');
	
	if (totalFailed > 0) {
		log('🔧 FAILED TESTS DETECTED:', 'red');
		log('   1. Review failed test output above');
		log('   2. Check debug mode implementation in affected containers');
		log('   3. Verify environment variable handling');
		log('   4. Ensure external services are properly mocked');
	}
	
	if (totalSkipped > 0) {
		log('⚠️  SKIPPED TESTS DETECTED:', 'yellow');
		log('   1. Ensure all container directories exist');
		log('   2. Run npm install in each container');
		log('   3. Verify test files are created');
	}
	
	if (totalFailed === 0 && totalSkipped === 0) {
		log('🎉 ALL DEBUG MODE TESTS PASSED!', 'green');
		log('   Your three-tier debug configuration system is working correctly');
		log('   Random triggers, message filtering, and external service isolation are all functional');
	}

	return totalFailed === 0;
}

function main() {
	logHeader('DISCORD BOT DEBUG MODE TEST SUITE');
	log('Testing three-tier debug configuration system across all containers', 'cyan');
	log('Categories: Random Triggers, Message Filtering, External Service Isolation', 'cyan');
	
	// Parse command line arguments
	const args = process.argv.slice(2);
	const verbose = args.includes('--verbose');
	const detailed = args.includes('--detailed');
	const containerFilter = args.find(arg => arg.startsWith('--container='))?.split('=')[1];
	
	if (verbose) {
		log('\n🔍 Verbose mode enabled - showing detailed error output', 'blue');
	}
	
	if (detailed) {
		log('📝 Detailed mode enabled - showing individual test results', 'blue');
	}

	// Filter containers if specified
	let containersToTest = containers;
	if (containerFilter) {
		containersToTest = containers.filter(c => 
			c.name.toLowerCase().includes(containerFilter.toLowerCase())
		);
		log(`\n🎯 Testing only containers matching: ${containerFilter}`, 'blue');
	}

	// Run tests for each container
	const allResults = [];
	
	for (const container of containersToTest) {
		try {
			const result = runContainerTests(container);
			allResults.push(result);
		} catch (error) {
			log(`💥 Fatal error testing ${container.name}: ${error.message}`, 'red');
			allResults.push({
				container: container.name,
				passed: 0,
				failed: container.testFiles.length,
				skipped: 0,
				details: [{ file: 'all', status: 'failed', error: error.message }]
			});
		}
	}

	// Generate comprehensive report
	const success = generateReport(allResults);
	
	// Exit with appropriate code
	process.exit(success ? 0 : 1);
}

// Handle command line help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
	log('Debug Mode Test Runner', 'bright');
	log('\nUsage: node scripts/run-debug-tests.js [options]');
	log('\nOptions:');
	log('  --verbose     Show detailed error output');
	log('  --detailed    Show individual test file results');
	log('  --container=X Filter to containers matching X');
	log('  --help, -h    Show this help message');
	log('\nExamples:');
	log('  node scripts/run-debug-tests.js');
	log('  node scripts/run-debug-tests.js --verbose --detailed');
	log('  node scripts/run-debug-tests.js --container=bunkbot');
	process.exit(0);
}

// Run the main function
if (require.main === module) {
	main();
}

module.exports = { runContainerTests, generateReport };
