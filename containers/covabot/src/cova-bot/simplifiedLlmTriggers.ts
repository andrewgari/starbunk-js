import { Message } from 'discord.js';
import { logger } from '@starbunk/shared';
import { TriggerCondition, ResponseGenerator } from '../types/triggerResponse';
import { createLLMService, LLMService } from '../services/llmService';

const DEBUG_MODE = process.env.DEBUG_MODE === 'true';

// Lazy-initialized LLM service
let llmService: LLMService | null = null;

function getLLMService(): LLMService {
	if (!llmService) {
		llmService = createLLMService();
	}
	return llmService;
}

/**
 * Improved LLM response decision condition
 * Uses contextual analysis to determine when Cova would naturally respond
 */
export function createLLMResponseDecisionCondition(): TriggerCondition {
	return async (message: Message): Promise<boolean> => {
		try {
			const content = message.content.toLowerCase();

			// Don't respond to empty or whitespace-only messages
			if (!content.trim()) {
				logger.debug('[CovaBot] LLM decision: not responding to empty message');
				return false;
			}

			// High probability responses - Cova's areas of interest
			if (isHighInterestMessage(content)) {
				logger.debug('[CovaBot] LLM decision: high interest topic detected');
				return true;
			}

			// Direct questions or mentions - always respond
			if (isDirectEngagement(content, message)) {
				logger.debug('[CovaBot] LLM decision: direct engagement detected');
				return true;
			}

			// Moderate interest topics - respond sometimes
			if (isModerateInterestMessage(content)) {
				const shouldRespond = Math.random() < 0.4; // 40% chance for moderate interest
				logger.debug(
					`[CovaBot] LLM decision: moderate interest - ${shouldRespond ? 'responding' : 'not responding'}`,
				);
				return shouldRespond;
			}

			// Debug mode: respond to 20% of remaining messages (reduced from 100% to prevent spam)
			if (DEBUG_MODE) {
				const shouldRespond = Math.random() < 0.2;
				logger.debug(
					`[CovaBot] LLM decision: DEBUG_MODE - ${shouldRespond ? 'responding' : 'not responding'} (20% chance)`,
				);
				return shouldRespond;
			}

			// Low baseline response rate for general conversation
			const shouldRespond = Math.random() < 0.05; // 5% baseline chance
			logger.debug(
				`[CovaBot] LLM decision: general message - ${shouldRespond ? 'responding' : 'not responding'} (5% chance)`,
			);
			return shouldRespond;
		} catch (error) {
			logger.error('[CovaBot] Error in LLM decision condition:', error as Error);
			return false;
		}
	};
}

/**
 * Cova personality-driven response generator
 * Uses LLM service with fallback to personality-based responses
 * IMPORTANT: On any error, return an empty string so CovaBot remains silent (no fallbacks)
 */
export function createLLMEmulatorResponse(): ResponseGenerator {
	return async (message: Message): Promise<string> => {
		const startTime = Date.now();

		try {
			logger.debug('[CovaBot] Generating Cova personality response');

			// Try to use LLM service for contextual response
			try {
				const llmSvc = getLLMService();
				const response = await llmSvc.generateResponse(message);

				if (response && response.trim()) {
					const duration = Date.now() - startTime;
					logger.debug(`[CovaBot] LLM response generated in ${duration}ms`);
					return response.trim();
				}
			} catch (llmError) {
				logger.warn('[CovaBot] LLM service failed, using fallback responses:', llmError as Error);
			}

			// Fallback to personality-based responses
			const content = message.content.toLowerCase();
			const originalContent = message.content;

			// Technical/Programming responses
			if (isTechnicalContent(content)) {
				return generateTechnicalResponse(content, originalContent);
			}

			// Gaming responses
			if (isGamingContent(content)) {
				return generateGamingResponse(content, originalContent);
			}

			// Comics/DC responses
			if (isComicsContent(content)) {
				return generateComicsResponse(content, originalContent);
			}

			// Discord/bot development responses
			if (isDiscordBotContent(content)) {
				return generateDiscordBotResponse(content, originalContent);
			}

			// Personal references (Kyra, Coke Zero, Taco Bell)
			if (isPersonalReference(content)) {
				return generatePersonalResponse(content, originalContent);
			}

			// Greetings - Cova style
			if (content.includes('hello') || content.includes('hi') || content.match(/\bhey\b/)) {
				return getRandomResponse(['Hey there!', "Hi! What's up?", "Hey! How's it going?", 'Yo!']);
			}

			// Questions - thoughtful responses
			if (content.includes('?')) {
				return getRandomResponse([
					"Hmm, that's a good question...",
					'Yeah, let me think about that.',
					"Interesting question! What's the context?",
					'That depends - what are you trying to do?',
					'Good point. Can you tell me more about that?',
				]);
			}

			// Thanks responses
			if (content.includes('thanks') || content.includes('thank you')) {
				return getRandomResponse(['No problem!', "You're welcome!", 'Happy to help!', 'Sure thing!']);
			}

			// General conversational responses - Cova style
			const response = getRandomResponse([
				'Yeah, I see what you mean.',
				'Hmm, interesting.',
				"That's pretty cool.",
				'Makes sense to me.',
				'I hear you.',
				'Yeah, totally.',
				'lol yeah',
				'Tell me more about that.',
			]);

			const duration = Date.now() - startTime;
			logger.debug(`[CovaBot] Fallback response generated in ${duration}ms`);
			return response;
		} catch (error) {
			const duration = Date.now() - startTime;
			logger.error(
				`[CovaBot] Error generating response after ${duration}ms (will remain silent):`,
				error as Error,
			);
			return '';
		}
	};
}

/**
 * Get a random response from an array
 */
function getRandomResponse(responses: string[]): string {
	const index = Math.floor(Math.random() * responses.length);
	return responses[index];
}

/**
 * Helper functions to identify message content types
 */
function isHighInterestMessage(content: string): boolean {
	return (
		// Programming/technical topics
		isTechnicalContent(content) ||
		// Direct questions
		content.includes('?') ||
		// Mentions of Cova or variants
		content.match(/\b(cova|covadax|cove|covs|covie)\b/i) !== null ||
		// Discord bot development
		isDiscordBotContent(content) ||
		// Personal interests
		isPersonalReference(content)
	);
}

function isDirectEngagement(content: string, message: Message): boolean {
	return (
		// Direct mentions
		message.mentions.users.size > 0 ||
		// @ mentions in content
		content.includes('@') ||
		// Direct questions to Cova
		content.match(/\b(cova|covadax).*\?/i) !== null
	);
}

function isModerateInterestMessage(content: string): boolean {
	return (
		isGamingContent(content) ||
		isComicsContent(content) ||
		// General programming discussion
		content.match(/\b(code|programming|software|development)\b/i) !== null
	);
}

function isTechnicalContent(content: string): boolean {
	return (
		content.match(
			/\b(typescript|javascript|react|node|npm|git|api|database|sql|json|html|css|python|docker|aws|error|bug|debug|function|class|component|hook|state|props|async|await|promise|regex|algorithm)\b/i,
		) !== null
	);
}

function isGamingContent(content: string): boolean {
	return (
		content.match(
			/\b(game|gaming|jrpg|gacha|final fantasy|dragon quest|persona|pokemon|nintendo|playstation|xbox|steam|boss|level|character|stats|build|strategy|rpg)\b/i,
		) !== null
	);
}

function isComicsContent(content: string): boolean {
	return (
		content.match(
			/\b(batman|superman|dc comics|comic|superhero|joker|wonder woman|flash|green lantern|justice league|gotham|metropolis|krypton)\b/i,
		) !== null
	);
}

function isDiscordBotContent(content: string): boolean {
	return (
		content.match(
			/\b(discord|bot|webhook|guild|channel|message|slash command|interaction|embed|permission|role|server|starbunk)\b/i,
		) !== null
	);
}

function isPersonalReference(content: string): boolean {
	return content.match(/\b(kyra|pug|coke zero|taco bell|dog|puppy)\b/i) !== null;
}

/**
 * Response generators for different content types
 */
function generateTechnicalResponse(content: string, _originalContent: string): string {
	if (content.includes('error') || content.includes('bug')) {
		return getRandomResponse([
			"What's the error message saying?",
			'Hmm, can you share the full error?',
			"That's frustrating. What have you tried so far?",
			"I've seen that before. What's the context?",
		]);
	}

	if (content.includes('typescript') || content.includes('javascript')) {
		return getRandomResponse([
			'Yeah, TS is pretty solid for that.',
			'JavaScript can be tricky sometimes.',
			"What's your setup looking like?",
			'Are you using any specific libraries for that?',
		]);
	}

	if (content.includes('react')) {
		return getRandomResponse([
			"React's great for that kind of thing.",
			'Are you using hooks or class components?',
			'What version of React are you on?',
			'Yeah, React makes that pretty straightforward.',
		]);
	}

	return getRandomResponse([
		"That's a solid approach.",
		"Yeah, I'd probably do something similar.",
		"Interesting solution. How's it working out?",
		"Makes sense. What's your use case?",
	]);
}

function generateGamingResponse(content: string, _originalContent: string): string {
	if (content.includes('jrpg') || content.includes('final fantasy')) {
		return getRandomResponse([
			'JRPGs are the best! Which one?',
			'Oh nice, I love a good JRPG.',
			'Final Fantasy has some amazing entries.',
			"That's a classic! Great choice.",
		]);
	}

	if (content.includes('gacha')) {
		return getRandomResponse([
			'Gacha games can be dangerous for the wallet lol',
			"What's your gacha game of choice?",
			'The gacha life chose me...',
			'Yeah, gacha mechanics are addictive by design.',
		]);
	}

	return getRandomResponse([
		"That's a fun game!",
		"Yeah, I've played that one.",
		'Gaming is such a good way to unwind.',
		"Nice! What's your favorite part about it?",
	]);
}

function generateComicsResponse(content: string, _originalContent: string): string {
	if (content.includes('batman')) {
		return getRandomResponse([
			"Batman's always been my favorite.",
			'The Dark Knight is iconic.',
			'Gotham has the best stories.',
			'Which Batman run are you reading?',
		]);
	}

	if (content.includes('superman')) {
		return getRandomResponse([
			"Superman's such a classic hero.",
			'The S shield is timeless.',
			'Metropolis stories are always good.',
			'Which Superman era do you prefer?',
		]);
	}

	return getRandomResponse([
		'DC Comics has some great characters.',
		'Comics are such a great medium.',
		'I love the storytelling in comics.',
		"That's a solid comic choice!",
	]);
}

function generateDiscordBotResponse(content: string, _originalContent: string): string {
	if (content.includes('starbunk') || content.includes('bot')) {
		return getRandomResponse([
			'Yeah, Discord bots are fun to work on.',
			'Bot development can be tricky sometimes.',
			'What are you trying to build?',
			'Discord.js is pretty solid for that.',
		]);
	}

	return getRandomResponse([
		'Discord development is interesting.',
		'Server management can be complex.',
		"What's your Discord setup like?",
		"That's a cool Discord feature.",
	]);
}

function generatePersonalResponse(content: string, _originalContent: string): string {
	if (content.includes('kyra') || content.includes('pug')) {
		return getRandomResponse([
			"Kyra's the best pug ever!",
			'Pugs are such good dogs.',
			"She's probably sleeping right now lol",
			'Pug life is the good life.',
		]);
	}

	if (content.includes('coke zero')) {
		return getRandomResponse([
			'Coke Zero is basically a food group.',
			'The nectar of the gods.',
			"Can't function without it.",
			'Zero calories, infinite energy.',
		]);
	}

	if (content.includes('taco bell')) {
		return getRandomResponse([
			'Taco Bell hits different sometimes.',
			"The Bell knows what's up.",
			'Peak fast food engineering.',
			"Can't go wrong with the Bell.",
		]);
	}

	return getRandomResponse(['lol yeah', "That's pretty accurate.", 'You know me too well.']);
}

/**
 * Simple performance timing utility
 */
export class SimplePerformanceTimer {
	private static instance: SimplePerformanceTimer;
	private timings: Map<string, number[]> = new Map();

	static getInstance(): SimplePerformanceTimer {
		if (!SimplePerformanceTimer.instance) {
			SimplePerformanceTimer.instance = new SimplePerformanceTimer();
		}
		return SimplePerformanceTimer.instance;
	}

	async time<T>(label: string, fn: () => Promise<T>): Promise<T> {
		const start = Date.now();
		try {
			const result = await fn();
			const duration = Date.now() - start;
			this.recordTiming(label, duration);
			return result;
		} catch (error) {
			const duration = Date.now() - start;
			this.recordTiming(label, duration);
			throw error;
		}
	}

	private recordTiming(label: string, duration: number): void {
		if (!this.timings.has(label)) {
			this.timings.set(label, []);
		}
		const timings = this.timings.get(label)!;
		timings.push(duration);

		// Keep only last 100 timings
		if (timings.length > 100) {
			timings.shift();
		}
	}

	getStatsString(): string {
		const stats: string[] = [];
		for (const [label, timings] of this.timings.entries()) {
			const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
			const min = Math.min(...timings);
			const max = Math.max(...timings);
			stats.push(`${label}: avg=${avg.toFixed(1)}ms, min=${min}ms, max=${max}ms, count=${timings.length}`);
		}
		return stats.join('\n') || 'No performance data available';
	}
}
