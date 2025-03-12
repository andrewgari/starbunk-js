const fs = require('fs');
const path = require('path');

const BOT_DIR = path.join(__dirname, 'src/starbunk/bots/reply-bots');

// Get all bot files
const botFiles = fs.readdirSync(BOT_DIR)
	.filter(file => file.endsWith('.ts') && file !== 'replyBot.ts' && file !== 'botIdentity.ts');

// Process each bot file
botFiles.forEach(file => {
	const filePath = path.join(BOT_DIR, file);
	console.log(`Processing ${filePath}`);

	// Read the file content
	let content = fs.readFileSync(filePath, 'utf8');

	// Check if the file has a @Service decorator
	if (content.includes('@Service')) {
		// Remove the @Service decorator
		content = content.replace(/@Service\(\{[\s\S]*?\}\)/m, '');

		// Remove Service from imports
		content = content.replace(/import\s*\{\s*(.*),\s*Service,\s*(.*)\s*\}\s*from\s*(['"].*['"])/g, 'import { $1, $2 } from $3');
		content = content.replace(/import\s*\{\s*Service,\s*(.*)\s*\}\s*from\s*(['"].*['"])/g, 'import { $1 } from $2');

		// Add comment before class declaration
		content = content.replace(
			/(export\s+default\s+class)/,
			'// This class is registered by StarbunkClient.registerBots() rather than through the service container\n$1'
		);

		// Write the updated content back to the file
		fs.writeFileSync(filePath, content);
		console.log(`Updated ${file}`);
	} else {
		console.log(`No @Service decorator found in ${file}`);
	}
});

console.log('All bot files updated successfully!');
