#!/usr/bin/env node

/**
 * Test script to verify yt-dlp functionality in the Docker container
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 Testing yt-dlp setup...\n');

// Test 1: Check if Python is available
console.log('1. Checking Python availability...');
try {
    const pythonVersion = execSync('python3 --version', { encoding: 'utf8' }).trim();
    console.log(`   ✅ Python found: ${pythonVersion}`);
} catch (error) {
    console.log(`   ❌ Python not found: ${error.message}`);
    process.exit(1);
}

// Test 2: Check if @distube/yt-dlp package is installed
console.log('\n2. Checking @distube/yt-dlp package...');
try {
    const packagePath = path.join(process.cwd(), 'node_modules', '@distube', 'yt-dlp');
    const packageJson = require(path.join(packagePath, 'package.json'));
    console.log(`   ✅ Package found: @distube/yt-dlp@${packageJson.version}`);
} catch (error) {
    console.log(`   ❌ Package not found: ${error.message}`);
    process.exit(1);
}

// Test 3: Check environment variables
console.log('\n3. Checking environment variables...');
const ytdlpDir = process.env.YTDLP_DIR;
const ytdlpFilename = process.env.YTDLP_FILENAME;

if (ytdlpDir) {
    console.log(`   ✅ YTDLP_DIR: ${ytdlpDir}`);
} else {
    console.log('   ⚠️  YTDLP_DIR not set (will use default)');
}

if (ytdlpFilename) {
    console.log(`   ✅ YTDLP_FILENAME: ${ytdlpFilename}`);
} else {
    console.log('   ⚠️  YTDLP_FILENAME not set (will use default)');
}

// Test 4: Try to import and initialize the yt-dlp package
console.log('\n4. Testing package import...');
try {
    const { YtDlpPlugin } = require('@distube/yt-dlp');
    console.log('   ✅ Package import successful');
    
    // Test initialization (without update to avoid network calls in test)
    const plugin = new YtDlpPlugin({ update: false });
    console.log('   ✅ Plugin initialization successful');
} catch (error) {
    console.log(`   ❌ Package import/initialization failed: ${error.message}`);
    console.log('   This might be expected if DisTube is not available, but the package should still be importable');
}

// Test 5: Check if ytdl-core is working (fallback)
console.log('\n5. Testing @distube/ytdl-core (fallback)...');
try {
    const ytdl = require('@distube/ytdl-core');
    console.log('   ✅ @distube/ytdl-core import successful');
} catch (error) {
    console.log(`   ❌ @distube/ytdl-core import failed: ${error.message}`);
}

console.log('\n🎉 yt-dlp setup test completed!');
console.log('\nNote: This test verifies the basic setup. Actual functionality');
console.log('depends on network connectivity and the specific URLs being processed.');
