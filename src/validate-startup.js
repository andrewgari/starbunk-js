#!/usr/bin/env node
/**
 * Startup validation script for Discord bot containers
 * Run this before starting any container to check for common issues
 */

const fs = require('fs');
const path = require('path');
const dns = require('dns').promises;

// ANSI color codes for console output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(level, message, details = null) {
    const timestamp = new Date().toISOString();
    const icons = { info: '✅', warn: '⚠️', error: '❌', debug: '🔍' };
    const colorMap = { info: colors.green, warn: colors.yellow, error: colors.red, debug: colors.blue };

    console.log(`${colorMap[level]}${icons[level]} ${message}${colors.reset}`);
    if (details) {
        console.log(`   ${JSON.stringify(details, null, 2)}`);
    }
}

async function validateEnvironment() {
    log('info', 'Checking environment variables...');

    const requiredVars = ['DISCORD_TOKEN'];
    const optionalVars = ['DATABASE_URL', 'DEBUG_MODE', 'TESTING_SERVER_IDS', 'TESTING_CHANNEL_IDS', 'NODE_ENV'];

    // Load .env file if it exists
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        log('info', '.env file found, loading...');
        try {
            require('dotenv').config({ path: envPath });
        } catch (error) {
            log('warn', 'dotenv not available, loading .env manually...');
            // Simple .env parser
            const envContent = fs.readFileSync(envPath, 'utf8');
            envContent.split('\n').forEach(line => {
                const [key, ...valueParts] = line.split('=');
                if (key && valueParts.length > 0) {
                    const value = valueParts.join('=').trim();
                    process.env[key.trim()] = value.replace(/^["']|["']$/g, '');
                }
            });
        }
    } else {
        log('warn', 'No .env file found');
    }

    // Check required variables
    const missing = requiredVars.filter(varName => !process.env[varName]);
    if (missing.length > 0) {
        log('error', `Missing required environment variables: ${missing.join(', ')}`);
        return false;
    }

    // Check optional variables
    const missingOptional = optionalVars.filter(varName => !process.env[varName]);
    if (missingOptional.length > 0) {
        log('warn', `Optional variables not set: ${missingOptional.join(', ')}`);
    }

    log('info', 'Environment variables check passed');
    return true;
}

async function validateDiscordToken() {
    log('info', 'Validating Discord token format...');

    const token = process.env.DISCORD_TOKEN;
    if (!token) {
        log('error', 'DISCORD_TOKEN is not set');
        return false;
    }

    // Basic format validation
    if (token.length < 24) {
        log('error', `Discord token too short (${token.length} chars, should be 24+)`);
        return false;
    }

    if (token === 'dummy_token' || token.includes('your_token_here') || token.includes('placeholder')) {
        log('error', 'Discord token appears to be a placeholder value');
        return false;
    }

    // Check for common token format (3 parts separated by dots)
    const parts = token.split('.');
    if (parts.length !== 3) {
        log('warn', 'Discord token format unusual (expected 3 parts separated by dots)');
    }

    log('info', `Discord token format appears valid (${token.length} chars)`);
    return true;
}

async function validateNetworkConnectivity() {
    log('info', 'Checking network connectivity to Discord...');

    try {
        await dns.resolve('discord.com');
        log('info', 'Can resolve discord.com');

        await dns.resolve('gateway.discord.gg');
        log('info', 'Can resolve Discord gateway');

        return true;
    } catch (error) {
        log('error', 'Cannot resolve Discord endpoints', { error: error.message });
        return false;
    }
}

function validateNodeVersion() {
    log('info', 'Checking Node.js version...');

    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

    if (majorVersion < 18) {
        log('error', `Node.js version ${nodeVersion} is too old (requires 18+)`);
        return false;
    }

    log('info', `Node.js version ${nodeVersion} is compatible`);
    return true;
}

function validateMemoryUsage() {
    log('info', 'Checking memory usage...');

    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

    log('info', `Memory usage: ${heapUsedMB}MB used / ${heapTotalMB}MB allocated`);
    return true;
}

function validateContainerStructure() {
    log('info', 'Checking container structure...');

    const requiredFiles = ['package.json', 'dist/index.js'];
    const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));

    if (missingFiles.length > 0) {
        log('error', `Missing required files: ${missingFiles.join(', ')}`);
        log('info', 'Try running: npm run build');
        return false;
    }

    log('info', 'Container structure is valid');
    return true;
}

async function runAllValidations() {
    console.log(`${colors.bold}${colors.blue}🔍 Discord Bot Startup Validation${colors.reset}\n`);

    const checks = [
        { name: 'Node.js Version', fn: validateNodeVersion },
        { name: 'Container Structure', fn: validateContainerStructure },
        { name: 'Environment Variables', fn: validateEnvironment },
        { name: 'Discord Token', fn: validateDiscordToken },
        { name: 'Network Connectivity', fn: validateNetworkConnectivity },
        { name: 'Memory Usage', fn: validateMemoryUsage }
    ];

    let passCount = 0;
    let failCount = 0;

    for (const check of checks) {
        console.log(`\n${colors.bold}--- ${check.name} ---${colors.reset}`);
        try {
            const result = await check.fn();
            if (result) {
                passCount++;
            } else {
                failCount++;
            }
        } catch (error) {
            log('error', `${check.name} check failed`, { error: error.message });
            failCount++;
        }
    }

    console.log(`\n${colors.bold}=== Validation Summary ===${colors.reset}`);
    log('info', `${passCount} checks passed`);

    if (failCount > 0) {
        log('error', `${failCount} checks failed`);
        console.log(`\n${colors.yellow}🔧 See TROUBLESHOOTING.md for solutions${colors.reset}`);
        process.exit(1);
    } else {
        log('info', 'All validations passed! Bot should start successfully.');
        process.exit(0);
    }
}

// Handle command line usage
if (require.main === module) {
    runAllValidations().catch(error => {
        log('error', 'Validation script failed', { error: error.message });
        process.exit(1);
    });
}

module.exports = {
    validateEnvironment,
    validateDiscordToken,
    validateNetworkConnectivity,
    validateNodeVersion,
    validateMemoryUsage,
    validateContainerStructure,
    runAllValidations
};
