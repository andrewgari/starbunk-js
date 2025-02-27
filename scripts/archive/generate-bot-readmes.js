#!/usr/bin/env node

/**
 * Script to generate README files for all bots
 *
 * This script reads the bot implementation files and generates basic README templates
 * for each bot in the docs/bots directory.
 */

const fs = require('fs');
const path = require('path');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const readdir = util.promisify(fs.readdir);
const mkdir = util.promisify(fs.mkdir);

const BOTS_DIR = path.join(__dirname, '..', 'src', 'starbunk', 'bots');
const REPLY_BOTS_DIR = path.join(BOTS_DIR, 'reply-bots');
const VOICE_BOTS_DIR = path.join(BOTS_DIR, 'voice-bots');
const DOCS_DIR = path.join(__dirname, '..', 'docs', 'bots');

// Ensure docs directory exists
async function ensureDocsDir() {
	try {
		await mkdir(DOCS_DIR, { recursive: true });
		console.log(`Created docs directory: ${DOCS_DIR}`);
	} catch (err) {
		if (err.code !== 'EEXIST') {
			console.error(`Error creating docs directory: ${err.message}`);
			throw err;
		}
	}
}

// Get all bot files
async function getBotFiles() {
	const replyBots = (await readdir(REPLY_BOTS_DIR))
		.filter(file => file.endsWith('.ts'))
		.map(file => ({
			name: file.replace('.ts', ''),
			path: path.join(REPLY_BOTS_DIR, file),
			type: 'reply'
		}));

	const voiceBots = (await readdir(VOICE_BOTS_DIR))
		.filter(file => file.endsWith('.ts'))
		.map(file => ({
			name: file.replace('.ts', ''),
			path: path.join(VOICE_BOTS_DIR, file),
			type: 'voice'
		}));

	return [...replyBots, ...voiceBots];
}

// Generate README for a bot
async function generateReadme(bot) {
	const botContent = await readFile(bot.path, 'utf8');

	// Extract bot name in proper case
	const botName = bot.name.replace(/([A-Z])/g, ' $1').trim()
		.split(' ')
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join('');

	// Try to extract description from comments
	let description = '';
	const descriptionMatch = botContent.match(/\/\*\*\s*\n\s*\*\s*(.*?)\s*\n/);
	if (descriptionMatch) {
		description = descriptionMatch[1];
	} else {
		// Generate a basic description based on the bot name
		description = `${botName} is a ${bot.type} bot that responds to specific patterns in messages.`;
	}

	// Try to extract pattern from code
	let pattern = '';
	const patternMatch = botContent.match(/Patterns\.([A-Z_]+)/);
	if (patternMatch) {
		pattern = patternMatch[1];
	}

	// Try to extract response from code
	let response = '';
	const staticResponseMatch = botContent.match(/respondsWithStatic\(['"](.+?)['"]\)/);
	if (staticResponseMatch) {
		response = staticResponseMatch[1];
	}

	const randomResponseMatch = botContent.match(/respondsWithRandom\(([^)]+)\)/);
	if (randomResponseMatch) {
		response = 'Random response from a predefined list';
	}

	// Generate README content
	const readmeContent = `# ${botName}

${description}

## Overview

${botName} is a ${bot.type} bot that ${bot.type === 'reply' ? 'monitors chat messages' : 'monitors voice channels'}.

## Implementation

${botName} is implemented using the ${bot.type === 'reply' ? 'BotBuilder pattern' : 'VoiceBot interface'}.

\`\`\`typescript
// See implementation in ${bot.path.replace(/^.*\/src\//, 'src/')}
\`\`\`

${pattern ? `## Trigger Condition

${botName} uses the \`${pattern}\` pattern defined in \`conditions.ts\`.
` : ''}

${response ? `## Response

When triggered, ${botName} responds with: ${response.length > 50 ? 'a predefined message' : `"${response}"`}
` : ''}

## Examples

### When ${botName} Responds

${botName} will respond to:

| Message | Response |
|---------|----------|
| Example message | Example response |

### When ${botName} Doesn't Respond

${botName} will not respond to:

| Message | Reason |
|---------|--------|
| Example message | Example reason |
| Messages from other bots | Bot messages are ignored by design |

## Testing

${botName} has tests in \`src/tests/starbunk/${bot.type}-bots/${bot.name}.test.ts\` that verify its functionality.
`;

	const readmePath = path.join(DOCS_DIR, `${botName}.md`);
	await writeFile(readmePath, readmeContent);
	console.log(`Generated README for ${botName}`);
}

// Main function
async function main() {
	try {
		await ensureDocsDir();
		const botFiles = await getBotFiles();

		// Get existing README files
		const existingReadmes = new Set((await readdir(DOCS_DIR))
			.filter(file => file.endsWith('.md'))
			.map(file => file.replace('.md', '')));

		// Generate READMEs for bots that don't already have one
		for (const bot of botFiles) {
			const botName = bot.name.replace(/([A-Z])/g, ' $1').trim()
				.split(' ')
				.map(word => word.charAt(0).toUpperCase() + word.slice(1))
				.join('');

			if (!existingReadmes.has(botName) && botName !== 'README') {
				await generateReadme(bot);
			} else {
				console.log(`Skipping ${botName} - README already exists`);
			}
		}

		console.log('Done generating README files');
	} catch (err) {
		console.error(`Error: ${err.message}`);
		process.exit(1);
	}
}

main();
