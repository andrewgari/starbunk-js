import 'dotenv/config';
import * as readline from 'readline';
import { Message } from 'discord.js';
import { setupBlueBotLogging } from '../src/observability/setup-logging';
import { getResponseForMessage } from '../src/strategy/strategy-router';
import { createMockMessage } from '../tests/helpers/mock-message';

// Setup logging
setupBlueBotLogging();

// ANSI color codes
const colors = {
	reset: '\x1b[0m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	cyan: '\x1b[36m',
	gray: '\x1b[90m',
	white: '\x1b[37m',
	red: '\x1b[31m',
	magenta: '\x1b[35m',
};

// User identity configuration
interface UserIdentity {
	userId: string;
	username: string;
	nickname: string;
}

let identity: UserIdentity = {
	userId: process.env.TEST_USER_ID || '123456789012345678',
	username: process.env.TEST_USERNAME || 'TestUser',
	nickname: process.env.TEST_NICKNAME || 'TestNick',
};

function printBanner() {
	console.log(`${colors.cyan}
╔═══════════════════════════════════════════════════════════════╗
║           BlueBot Interactive Tester (CLI Mode)               ║
╚═══════════════════════════════════════════════════════════════╝
${colors.reset}`);
	console.log(`${colors.gray}Test BlueBot responses without connecting to Discord${colors.reset}\n`);
}

function printIdentity() {
	console.log(`${colors.magenta}Current Identity:${colors.reset}`);
	console.log(`  User ID:  ${colors.white}${identity.userId}${colors.reset}`);
	console.log(`  Username: ${colors.white}${identity.username}${colors.reset}`);
	console.log(`  Nickname: ${colors.white}${identity.nickname}${colors.reset}\n`);
}

function printHelp() {
	console.log(`${colors.cyan}Commands:${colors.reset}`);
	console.log(`  ${colors.yellow}/help${colors.reset}              - Show this help message`);
	console.log(`  ${colors.yellow}/identity${colors.reset}          - Show current identity`);
	console.log(`  ${colors.yellow}/setid <id>${colors.reset}        - Set user ID`);
	console.log(`  ${colors.yellow}/setname <name>${colors.reset}    - Set username`);
	console.log(`  ${colors.yellow}/setnick <nick>${colors.reset}    - Set nickname`);
	console.log(`  ${colors.yellow}/enemy${colors.reset}             - Toggle enemy user mode (sets ID to BLUEBOT_ENEMY_USER_ID)`);
	console.log(`  ${colors.yellow}/clear${colors.reset}             - Clear screen`);
	console.log(`  ${colors.yellow}/exit${colors.reset} or ${colors.yellow}/quit${colors.reset}    - Exit tester\n`);
	console.log(`${colors.gray}Just type a message to test BlueBot's response${colors.reset}\n`);
}

async function processMessage(content: string): Promise<void> {
	try {
		const mockMessage = createMockMessage({
			content,
			authorId: identity.userId,
			isBot: false,
			guildId: '999999999999999999',
			nickname: identity.nickname
		});

		// Override username
		if (mockMessage.author) {
			mockMessage.author.username = identity.username;
		}

		const response = await getResponseForMessage(mockMessage as Message);

		console.log(`${colors.gray}${'─'.repeat(70)}${colors.reset}`);
		console.log(`${colors.blue}You (${identity.username}):${colors.reset} ${content}`);

		if (response) {
			console.log(`${colors.green}BlueBot:${colors.reset} ${colors.yellow}${response}${colors.reset}`);
		} else {
			console.log(`${colors.gray}[No response - no strategy matched]${colors.reset}`);
		}
		console.log(`${colors.gray}${'─'.repeat(70)}${colors.reset}\n`);
	} catch (error) {
		console.error(`${colors.red}Error:${colors.reset}`, error);
	}
}

function handleCommand(input: string): boolean {
	const parts = input.trim().split(/\s+/);
	const command = parts[0].toLowerCase();
	const args = parts.slice(1);

	switch (command) {
		case '/help':
			printHelp();
			return true;

		case '/identity':
			printIdentity();
			return true;

		case '/setid':
			if (args.length === 0) {
				console.log(`${colors.red}Usage: /setid <user_id>${colors.reset}\n`);
			} else {
				identity.userId = args[0];
				console.log(`${colors.green}User ID set to: ${identity.userId}${colors.reset}\n`);
			}
			return true;

		case '/setname':
			if (args.length === 0) {
				console.log(`${colors.red}Usage: /setname <username>${colors.reset}\n`);
			} else {
				identity.username = args.join(' ');
				console.log(`${colors.green}Username set to: ${identity.username}${colors.reset}\n`);
			}
			return true;

		case '/setnick':
			if (args.length === 0) {
				console.log(`${colors.red}Usage: /setnick <nickname>${colors.reset}\n`);
			} else {
				identity.nickname = args.join(' ');
				console.log(`${colors.green}Nickname set to: ${identity.nickname}${colors.reset}\n`);
			}
			return true;

		case '/enemy':
			const enemyId = process.env.BLUEBOT_ENEMY_USER_ID;
			if (enemyId) {
				identity.userId = enemyId;
				console.log(`${colors.green}Switched to enemy user mode (ID: ${enemyId})${colors.reset}\n`);
			} else {
				console.log(`${colors.red}BLUEBOT_ENEMY_USER_ID not set in environment${colors.reset}\n`);
			}
			return true;

		case '/clear':
			console.clear();
			printBanner();
			return true;
	}

	return false;
}

async function main(): Promise<void> {
	printBanner();
	printIdentity();
	printHelp();

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		prompt: `${colors.cyan}> ${colors.reset}`,
	});

	rl.prompt();

	rl.on('line', async (input: string) => {
		const trimmed = input.trim();

		if (!trimmed) {
			rl.prompt();
			return;
		}

		// Handle exit commands
		if (trimmed === '/exit' || trimmed === '/quit') {
			console.log(`${colors.yellow}Goodbye!${colors.reset}`);
			rl.close();
			process.exit(0);
		}

		// Handle other commands
		if (trimmed.startsWith('/')) {
			const handled = handleCommand(trimmed);
			if (!handled) {
				console.log(`${colors.red}Unknown command. Type /help for available commands.${colors.reset}\n`);
			}
			rl.prompt();
			return;
		}

		// Process as a message
		await processMessage(trimmed);
		rl.prompt();
	});

	rl.on('close', () => {
		console.log(`${colors.yellow}\nGoodbye!${colors.reset}`);
		process.exit(0);
	});
}

if (require.main === module) {
	main().catch((error) => {
		console.error(`${colors.red}Fatal error:${colors.reset}`, error);
		process.exit(1);
	});
}

