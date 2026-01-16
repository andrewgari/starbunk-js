#!/usr/bin/env node

/**
 * Simple script to check for potentially unused dependencies
 * This is a basic check - for more thorough analysis, use: npm run deps:check
 */

const fs = require('fs');
const path = require('path');

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
const dependencies = Object.keys(packageJson.dependencies || {});
const devDependencies = Object.keys(packageJson.devDependencies || {});

// Files to search
const srcDir = path.join(__dirname, '../src');
const testsDir = path.join(__dirname, '../tests');

// Read all TypeScript files
function getAllTsFiles(dir) {
	const files = [];
	const items = fs.readdirSync(dir);

	for (const item of items) {
		const fullPath = path.join(dir, item);
		const stat = fs.statSync(fullPath);

		if (stat.isDirectory()) {
			files.push(...getAllTsFiles(fullPath));
		} else if (item.endsWith('.ts')) {
			files.push(fullPath);
		}
	}

	return files;
}

// Get all source content
const srcFiles = getAllTsFiles(srcDir);
const testFiles = getAllTsFiles(testsDir);
const allFiles = [...srcFiles, ...testFiles];

const allContent = allFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n');

// Check which dependencies are imported
const unusedDeps = [];
const unusedDevDeps = [];

for (const dep of dependencies) {
	// Skip type definitions
	if (dep.startsWith('@types/')) continue;

	// Check if imported (including side-effect imports like 'dotenv/config')
	const escapedDep = dep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const importRegex = new RegExp(`from ['"]${escapedDep}(/[^'"]*)?['"]|require\\(['"]${escapedDep}(/[^'"]*)?['"]\\)|import ['"]${escapedDep}(/[^'"]*)?['"]`, 'g');
	if (!importRegex.test(allContent)) {
		unusedDeps.push(dep);
	}
}

for (const dep of devDependencies) {
	// Skip common dev tools that might not be directly imported
	const skipDeps = ['typescript', 'vitest', 'rimraf', 'cross-env', 'ts-node', 'ts-node-dev', 'tsc-alias', 'tsconfig-paths'];
	if (skipDeps.includes(dep) || dep.startsWith('@types/')) continue;

	// Check if imported
	const importRegex = new RegExp(`from ['"]${dep}['"]|require\\(['"]${dep}['"]\\)`, 'g');
	if (!importRegex.test(allContent)) {
		unusedDevDeps.push(dep);
	}
}

// Report results
console.log('\n=== Dependency Check Results ===\n');

if (unusedDeps.length === 0 && unusedDevDeps.length === 0) {
	console.log('✅ No obviously unused dependencies found!\n');
	console.log('Note: This is a basic check. For thorough analysis, run: npm run deps:check\n');
	process.exit(0);
}

if (unusedDeps.length > 0) {
	console.log('⚠️  Potentially unused dependencies:');
	unusedDeps.forEach(dep => console.log(`   - ${dep}`));
	console.log('');
}

if (unusedDevDeps.length > 0) {
	console.log('⚠️  Potentially unused devDependencies:');
	unusedDevDeps.forEach(dep => console.log(`   - ${dep}`));
	console.log('');
}

console.log('To remove unused dependencies, run:');
if (unusedDeps.length > 0) {
	console.log(`   npm uninstall ${unusedDeps.join(' ')}`);
}
if (unusedDevDeps.length > 0) {
	console.log(`   npm uninstall --save-dev ${unusedDevDeps.join(' ')}`);
}
console.log('\nNote: This is a basic check. For thorough analysis, run: npm run deps:check\n');

process.exit(1);

