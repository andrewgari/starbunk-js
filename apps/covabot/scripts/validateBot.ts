/**
 * Bot Validation Script
 *
 * Tests the bot against your actual behavior to measure accuracy
 * Requires: training-data.json from collectTrainingData.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Ollama } from 'ollama';

interface TestCase {
	scenario: string;
	context: Array<{ author: string; content: string }>;
	youDid: 'respond' | 'ignore';
	yourActualResponse?: string;
}

interface ValidationResults {
	accuracy: number;
	precision: number;
	recall: number;
	details: {
		truePositives: number; // Correctly responded
		falsePositives: number; // Responded when you wouldn't
		trueNegatives: number; // Correctly stayed silent
		falseNegatives: number; // Stayed silent when you'd respond
	};
	styleMatches: {
		usedYourPhrases: number;
		similarLength: number;
		similarTone: number;
	};
	examples: Array<{
		scenario: string;
		expected: string;
		botDid: string;
		correct: boolean;
	}>;
}

async function validateBot() {
	console.log('🧪 Starting bot validation...\n');

	// Load training data
	const trainingDataPath = join(__dirname, '../data/training-data.json');
	let trainingData: any;

	try {
		trainingData = JSON.parse(readFileSync(trainingDataPath, 'utf-8'));
	} catch (error) {
		console.error('❌ Could not load training-data.json');
		console.error('   Run: npm run collect-training-data first');
		process.exit(1);
	}

	// Load personality
	const personalityPath = join(__dirname, '../data/personality.json');
	const personality = JSON.parse(readFileSync(personalityPath, 'utf-8'));

	// Create test cases from training data
	const testCases = createTestCases(trainingData);
	console.log(`📋 Created ${testCases.length} test cases\n`);

	// Initialize Ollama
	const ollama = new Ollama({
		host: process.env.OLLAMA_API_URL || 'http://localhost:11434',
	});

	const results: ValidationResults = {
		accuracy: 0,
		precision: 0,
		recall: 0,
		details: {
			truePositives: 0,
			falsePositives: 0,
			trueNegatives: 0,
			falseNegatives: 0,
		},
		styleMatches: {
			usedYourPhrases: 0,
			similarLength: 0,
			similarTone: 0,
		},
		examples: [],
	};

	// Test each case
	let testNum = 0;
	for (const testCase of testCases.slice(0, 50)) {
		// Limit to 50 tests for speed
		testNum++;
		process.stdout.write(`\rTesting ${testNum}/${Math.min(50, testCases.length)}...`);

		const botResponse = await testWithBot(testCase, personality, ollama);
		const botResponded = botResponse !== 'SKIP' && botResponse.trim() !== '';

		// Check decision accuracy
		if (testCase.youDid === 'respond' && botResponded) {
			results.details.truePositives++;

			// Check style similarity if both responded
			if (testCase.yourActualResponse) {
				analyzeStyleMatch(botResponse, testCase.yourActualResponse, trainingData, results);
			}
		} else if (testCase.youDid === 'respond' && !botResponded) {
			results.details.falseNegatives++;
		} else if (testCase.youDid === 'ignore' && !botResponded) {
			results.details.trueNegatives++;
		} else if (testCase.youDid === 'ignore' && botResponded) {
			results.details.falsePositives++;
		}

		// Save example
		if (results.examples.length < 10) {
			results.examples.push({
				scenario: testCase.scenario,
				expected: testCase.youDid,
				botDid: botResponded ? 'responded' : 'ignored',
				correct:
					(testCase.youDid === 'respond' && botResponded) || (testCase.youDid === 'ignore' && !botResponded),
			});
		}
	}

	console.log('\n');

	// Calculate metrics
	const { truePositives, falsePositives, trueNegatives, falseNegatives } = results.details;
	const total = truePositives + falsePositives + trueNegatives + falseNegatives;

	results.accuracy = (truePositives + trueNegatives) / total;
	results.precision = truePositives / (truePositives + falsePositives);
	results.recall = truePositives / (truePositives + falseNegatives);

	// Print results
	printResults(results);
}

function createTestCases(trainingData: any): TestCase[] {
	const testCases: TestCase[] = [];

	// From response patterns (where you DID respond)
	for (const pattern of trainingData.responsePatterns) {
		if (pattern.context.length > 0) {
			testCases.push({
				scenario: pattern.context[pattern.context.length - 1].content,
				context: pattern.context.map((m: any) => ({
					author: m.author,
					content: m.content,
				})),
				youDid: 'respond',
				yourActualResponse: pattern.yourResponse.content,
			});
		}
	}

	// From non-response patterns (where you DIDN'T respond)
	for (const pattern of trainingData.nonResponsePatterns) {
		testCases.push({
			scenario: pattern.messageYouIgnored.content,
			context: pattern.context.map((m: any) => ({
				author: m.author,
				content: m.content,
			})),
			youDid: 'ignore',
		});
	}

	// Shuffle
	return testCases.sort(() => Math.random() - 0.5);
}

async function testWithBot(testCase: TestCase, personality: any, ollama: any): Promise<string> {
	// Build context string
	const contextStr = testCase.context.map((m) => `${m.author}: ${m.content}`).join('\n');

	// Build personality context
	const personalityStr = `
Conversational Style:
${personality.conversationalStyle.map((s: string) => `- ${s}`).join('\n')}

Common Phrases: ${personality.commonPhrases.join(', ')}
`.trim();

	// Build prompt (same as simpleCovaBot)
	const prompt = `You are mimicking Cova in a Discord conversation.

PERSONALITY:
${personalityStr}

RECENT CONVERSATION:
${contextStr}

NEW MESSAGE:
${testCase.scenario}

INSTRUCTIONS:
1. Decide if Cova would respond to this message
2. If yes, respond EXACTLY as Cova would
3. If no, return only: SKIP

YOUR RESPONSE:`;

	try {
		const response = await ollama.generate({
			model: process.env.OLLAMA_MODEL || 'llama3.2',
			prompt,
			stream: false,
			options: {
				temperature: 0.7,
				top_p: 0.9,
			},
		});

		return response.response.trim();
	} catch (error) {
		console.error('Error calling Ollama:', error);
		return 'SKIP';
	}
}

function analyzeStyleMatch(botResponse: string, yourResponse: string, trainingData: any, results: ValidationResults) {
	// Check if bot used your common phrases
	const yourCommonPhrases = Object.keys(trainingData.yourPhrases);
	const botUsedYourPhrases = yourCommonPhrases.some((phrase) => botResponse.toLowerCase().includes(phrase));

	if (botUsedYourPhrases) {
		results.styleMatches.usedYourPhrases++;
	}

	// Check length similarity (within 50% of your typical length)
	const lengthRatio = botResponse.length / yourResponse.length;
	if (lengthRatio >= 0.5 && lengthRatio <= 1.5) {
		results.styleMatches.similarLength++;
	}

	// Check tone (very basic - count punctuation)
	const yourExclamations = (yourResponse.match(/!/g) || []).length;
	const botExclamations = (botResponse.match(/!/g) || []).length;
	const yourQuestions = (yourResponse.match(/\?/g) || []).length;
	const botQuestions = (botResponse.match(/\?/g) || []).length;

	if (
		Math.abs(yourExclamations - botExclamations) <= 1 &&
		Math.abs(yourQuestions - botQuestions) <= 1
	) {
		results.styleMatches.similarTone++;
	}
}

function printResults(results: ValidationResults) {
	console.log('📊 VALIDATION RESULTS\n');
	console.log('='.repeat(60));

	console.log('\n🎯 Decision Accuracy:');
	console.log(`  Overall Accuracy: ${(results.accuracy * 100).toFixed(1)}%`);
	console.log(`  Precision: ${(results.precision * 100).toFixed(1)}% (when bot responds, is it correct?)`);
	console.log(`  Recall: ${(results.recall * 100).toFixed(1)}% (does bot respond when you would?)`);

	console.log('\n📈 Detailed Breakdown:');
	console.log(`  ✅ True Positives: ${results.details.truePositives} (correctly responded)`);
	console.log(`  ❌ False Positives: ${results.details.falsePositives} (responded when you wouldn't)`);
	console.log(`  ✅ True Negatives: ${results.details.trueNegatives} (correctly stayed silent)`);
	console.log(`  ❌ False Negatives: ${results.details.falseNegatives} (stayed silent when you'd respond)`);

	console.log('\n✍️  Style Similarity:');
	const totalResponses = results.details.truePositives;
	if (totalResponses > 0) {
		console.log(
			`  Used your phrases: ${((results.styleMatches.usedYourPhrases / totalResponses) * 100).toFixed(1)}%`,
		);
		console.log(
			`  Similar length: ${((results.styleMatches.similarLength / totalResponses) * 100).toFixed(1)}%`,
		);
		console.log(
			`  Similar tone: ${((results.styleMatches.similarTone / totalResponses) * 100).toFixed(1)}%`,
		);
	}

	console.log('\n📝 Example Results:');
	for (const example of results.examples) {
		const icon = example.correct ? '✅' : '❌';
		console.log(`  ${icon} Expected: ${example.expected}, Bot: ${example.botDid}`);
		console.log(`     Scenario: "${example.scenario.substring(0, 60)}..."`);
	}

	console.log('\n' + '='.repeat(60));

	// Interpretation
	console.log('\n💡 Interpretation:\n');

	if (results.accuracy >= 0.8) {
		console.log('  ✅ EXCELLENT: Bot mimics your behavior very well');
	} else if (results.accuracy >= 0.7) {
		console.log('  ✓  GOOD: Bot is decent but has room for improvement');
	} else if (results.accuracy >= 0.6) {
		console.log('  ⚠️  FAIR: Bot needs more tuning');
	} else {
		console.log('  ❌ POOR: Bot needs significant improvement');
	}

	if (results.details.falsePositives > results.details.falseNegatives) {
		console.log('  📢 Bot is too chatty - responds too often');
		console.log('     → Add "Only respond when you have something meaningful to add" to personality');
	} else if (results.details.falseNegatives > results.details.falsePositives) {
		console.log('  🤐 Bot is too quiet - misses opportunities to respond');
		console.log('     → Add more examples of situations where you DO respond');
	}

	if (totalResponses > 0) {
		if (results.styleMatches.usedYourPhrases / totalResponses < 0.3) {
			console.log('  💬 Bot not using your phrases enough');
			console.log('     → Add more of your common phrases to personality.json');
		}

		if (results.styleMatches.similarLength / totalResponses < 0.5) {
			console.log('  📏 Bot response length doesn\'t match yours');
			console.log('     → Update conversationalStyle to specify response length preference');
		}
	}

	console.log('\n');
}

// Run validation
validateBot().catch(console.error);
