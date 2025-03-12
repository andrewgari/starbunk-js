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

	// Remove unused ServiceId imports
	content = content.replace(/import\s*\{\s*ServiceId\s*\}\s*from\s*(['"].*['"])/g, '');
	content = content.replace(/import\s*\{\s*(.*),\s*ServiceId\s*\}\s*from\s*(['"].*['"])/g, 'import { $1 } from $2');
	content = content.replace(/import\s*\{\s*ServiceId,\s*(.*)\s*\}\s*from\s*(['"].*['"])/g, 'import { $1 } from $2');

	// Write the updated content back to the file
	fs.writeFileSync(filePath, content);
	console.log(`Updated ${file}`);
});

console.log('All bot files updated successfully!');
