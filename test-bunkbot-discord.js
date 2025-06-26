#!/usr/bin/env node

/**
 * BunkBot Discord Test Script - Enhanced Debugging
 *
 * This script tests the BunkBot staging container by:
 * 1. Checking if the container is running with debug mode
 * 2. Monitoring container logs for Discord connection and message events
 * 3. Testing Discord API connectivity and permissions
 * 4. Providing comprehensive diagnostic information
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const https = require('https');

const CONTAINER_NAME = 'debug-bunkbot';
const GUILD_ID = '753251582719688714'; // From environment
const CLIENT_ID = '836445923105308672'; // From environment
const DISCORD_API_BASE = 'https://discord.com/api/v10';

async function checkContainerStatus() {
    console.log('🔍 Checking BunkBot container status...');
    
    try {
        const { stdout } = await execAsync(`podman ps --filter name=${CONTAINER_NAME} --format "{{.Status}}"`);
        const status = stdout.trim();
        
        if (status.includes('Up')) {
            console.log('✅ BunkBot container is running:', status);
            return true;
        } else {
            console.log('❌ BunkBot container is not running:', status);
            return false;
        }
    } catch (error) {
        console.error('❌ Error checking container status:', error.message);
        return false;
    }
}

async function checkContainerLogs() {
    console.log('📋 Checking BunkBot container logs...');

    try {
        const { stdout } = await execAsync(`podman logs --tail 30 ${CONTAINER_NAME}`);
        console.log('📋 Recent logs:');
        console.log(stdout);

        // Check for debug mode
        const debugActive = stdout.includes('Is Debug Mode Active: true');
        console.log(`🐛 Debug Mode: ${debugActive ? '✅ Active' : '❌ Inactive'}`);

        // Check for successful Discord connection
        if (stdout.includes('BunkBot is ready and connected to Discord')) {
            console.log('✅ BunkBot successfully connected to Discord');
            return { connected: true, debug: debugActive };
        } else if (stdout.includes('Failed to start BunkBot')) {
            console.log('❌ BunkBot failed to start');
            return { connected: false, debug: debugActive };
        } else {
            console.log('⚠️  BunkBot status unclear from logs');
            return { connected: false, debug: debugActive };
        }
    } catch (error) {
        console.error('❌ Error checking container logs:', error.message);
        return { connected: false, debug: false };
    }
}

async function testDiscordAPIConnectivity() {
    console.log('🌐 Testing Discord API connectivity...');

    return new Promise((resolve) => {
        const req = https.get(`${DISCORD_API_BASE}/gateway`, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.url) {
                        console.log('✅ Discord API is accessible');
                        console.log(`   Gateway URL: ${response.url}`);
                        resolve(true);
                    } else {
                        console.log('❌ Discord API response invalid');
                        resolve(false);
                    }
                } catch (error) {
                    console.log('❌ Failed to parse Discord API response');
                    resolve(false);
                }
            });
        });

        req.on('error', (error) => {
            console.log('❌ Cannot reach Discord API:', error.message);
            resolve(false);
        });

        req.setTimeout(5000, () => {
            console.log('❌ Discord API request timed out');
            req.destroy();
            resolve(false);
        });
    });
}

async function checkBotPermissions() {
    console.log('🔐 Checking bot permissions and token validity...');

    // We can't directly test the token without exposing it, but we can check container environment
    try {
        const { stdout } = await execAsync(`podman exec ${CONTAINER_NAME} printenv | grep -E "(STARBUNK_TOKEN|CLIENT_ID|GUILD_ID)"`);
        const lines = stdout.trim().split('\n');

        console.log('🔑 Environment variables:');
        lines.forEach(line => {
            if (line.includes('STARBUNK_TOKEN')) {
                console.log(`   STARBUNK_TOKEN: ${line.includes('=') ? '✅ Set' : '❌ Missing'}`);
            } else if (line.includes('CLIENT_ID')) {
                console.log(`   CLIENT_ID: ${line.split('=')[1] || '❌ Missing'}`);
            } else if (line.includes('GUILD_ID')) {
                console.log(`   GUILD_ID: ${line.split('=')[1] || '❌ Missing'}`);
            }
        });

        return true;
    } catch (error) {
        console.log('❌ Could not check environment variables:', error.message);
        return false;
    }
}

async function getDiscordBotInfo() {
    console.log('🤖 Discord Bot Information:');
    console.log(`   Client ID: ${CLIENT_ID}`);
    console.log(`   Guild ID: ${GUILD_ID}`);
    console.log(`   Bot Invite URL: https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&permissions=8&scope=bot`);
    console.log('');
}

function printTestInstructions() {
    console.log('🧪 Manual Discord Testing Instructions:');
    console.log('');
    console.log('1. **Message Test**: Send a message containing "hello bunkbot" in any channel');
    console.log('   Expected: Bot should respond with "Hello [username]! BunkBot is working! 🤖"');
    console.log('   Note: Message must be sent in a channel the bot can see');
    console.log('');
    console.log('2. **Command Test**: Use the /ping slash command (if registered)');
    console.log('   Expected: Bot should respond with "Pong! BunkBot is operational! 🏓"');
    console.log('');
    console.log('3. **Monitor Logs**: Watch container logs for message processing');
    console.log(`   Command: podman logs -f ${CONTAINER_NAME}`);
    console.log('');
    console.log('4. **Debug Message Events**: Look for these log patterns:');
    console.log('   - Message received: Should show debug logs when messages arrive');
    console.log('   - Event processing: Should show handleMessage() calls');
    console.log('   - Webhook responses: Should show webhook manager activity');
    console.log('');
    console.log('5. **Common Issues to Check**:');
    console.log('   - Bot has "Read Messages" permission in the channel');
    console.log('   - Bot has "Send Messages" permission in the channel');
    console.log('   - Bot has "Use Webhooks" permission in the channel');
    console.log('   - Message is not from another bot (bots ignore bot messages)');
    console.log('');
}

async function testMessageEventLogging() {
    console.log('🔍 Testing message event logging with dual container monitoring...');
    console.log('');
    console.log('Containers being monitored:');
    console.log('   1. debug-bunkbot (webhook-based BunkBot)');
    console.log('   2. test-simple-bunkbot (simple reply-based test bot)');
    console.log('');
    console.log('Please send a test message in Discord containing "hello bunkbot"');
    console.log('Monitoring logs for 45 seconds...');
    console.log('');

    const duration = 45000; // 45 seconds

    return new Promise((resolve) => {
        // Monitor both containers
        const bunkbotProcess = exec(`podman logs -f debug-bunkbot --since 1s`);
        const simpleProcess = exec(`podman logs -f test-simple-bunkbot --since 1s`);

        let bunkbotMessageDetected = false;
        let bunkbotResponseDetected = false;
        let simpleMessageDetected = false;
        let simpleResponseDetected = false;

        // Monitor BunkBot container
        bunkbotProcess.stdout.on('data', (data) => {
            const logLine = data.toString();
            console.log(`[BUNKBOT] ${logLine.trim()}`);

            if (logLine.includes('handleMessage') || logLine.includes('MessageCreate') || logLine.includes('hello bunkbot')) {
                bunkbotMessageDetected = true;
                console.log('🎯 [BUNKBOT] Message event detected!');
            }

            if (logLine.includes('sendMessage') || logLine.includes('webhook') || logLine.includes('sent successfully')) {
                bunkbotResponseDetected = true;
                console.log('📤 [BUNKBOT] Bot response detected!');
            }
        });

        // Monitor Simple Test Bot container
        simpleProcess.stdout.on('data', (data) => {
            const logLine = data.toString();
            console.log(`[SIMPLE] ${logLine.trim()}`);

            if (logLine.includes('Message #') || logLine.includes('TRIGGER DETECTED')) {
                simpleMessageDetected = true;
                console.log('🎯 [SIMPLE] Message event detected!');
            }

            if (logLine.includes('reply sent') || logLine.includes('successful')) {
                simpleResponseDetected = true;
                console.log('📤 [SIMPLE] Bot response detected!');
            }
        });

        // Handle errors
        bunkbotProcess.stderr.on('data', (data) => {
            console.error(`[BUNKBOT ERROR] ${data.toString().trim()}`);
        });

        simpleProcess.stderr.on('data', (data) => {
            console.error(`[SIMPLE ERROR] ${data.toString().trim()}`);
        });

        setTimeout(() => {
            bunkbotProcess.kill();
            simpleProcess.kill();

            console.log('\n⏰ Monitoring period ended');
            console.log('📊 Results Summary:');
            console.log('');
            console.log('🤖 BunkBot (Webhook-based):');
            console.log(`   Message Event Detected: ${bunkbotMessageDetected ? '✅ Yes' : '❌ No'}`);
            console.log(`   Bot Response Detected: ${bunkbotResponseDetected ? '✅ Yes' : '❌ No'}`);
            console.log('');
            console.log('🧪 Simple Test Bot (Reply-based):');
            console.log(`   Message Event Detected: ${simpleMessageDetected ? '✅ Yes' : '❌ No'}`);
            console.log(`   Bot Response Detected: ${simpleResponseDetected ? '✅ Yes' : '❌ No'}`);

            resolve({
                bunkbot: { messageEventDetected: bunkbotMessageDetected, responseDetected: bunkbotResponseDetected },
                simple: { messageEventDetected: simpleMessageDetected, responseDetected: simpleResponseDetected }
            });
        }, duration);
    });
}

async function monitorLogs() {
    console.log('📡 Starting live log monitoring (Press Ctrl+C to stop)...');
    console.log('');
    
    const logProcess = exec(`podman logs -f ${CONTAINER_NAME}`);
    
    logProcess.stdout.on('data', (data) => {
        process.stdout.write(data);
    });
    
    logProcess.stderr.on('data', (data) => {
        process.stderr.write(data);
    });
    
    logProcess.on('close', (code) => {
        console.log(`\n📡 Log monitoring stopped with code ${code}`);
    });
    
    // Handle Ctrl+C
    process.on('SIGINT', () => {
        console.log('\n🛑 Stopping log monitoring...');
        logProcess.kill();
        process.exit(0);
    });
}

async function main() {
    console.log('🚀 BunkBot Discord Test Suite - Enhanced Diagnostics');
    console.log('====================================================');
    console.log('');

    // Check container status
    const isRunning = await checkContainerStatus();
    if (!isRunning) {
        console.log('❌ Container is not running. Please start it first:');
        console.log(`   podman run -d --name ${CONTAINER_NAME} --env-file .env -e DEBUG=true -e LOG_LEVEL=debug ghcr.io/andrewgari/bunkbot:pr-234-snapshot`);
        process.exit(1);
    }

    console.log('');

    // Check logs for Discord connection and debug mode
    const connectionStatus = await checkContainerLogs();
    console.log('');

    // Test Discord API connectivity
    const apiConnected = await testDiscordAPIConnectivity();
    console.log('');

    // Check bot permissions and environment
    const permissionsOk = await checkBotPermissions();
    console.log('');

    // Show Discord bot info
    await getDiscordBotInfo();

    // Print test instructions
    printTestInstructions();

    // Handle different modes
    const args = process.argv.slice(2);
    if (args.includes('--test-events') || args.includes('-t')) {
        console.log('🧪 Starting interactive message event testing...');
        const testResults = await testMessageEventLogging();

        console.log('\n📋 Final Diagnostic Summary:');
        console.log('============================');
        console.log(`Container Running: ${isRunning ? '✅' : '❌'}`);
        console.log(`Discord Connected: ${connectionStatus.connected ? '✅' : '❌'}`);
        console.log(`Debug Mode Active: ${connectionStatus.debug ? '✅' : '❌'}`);
        console.log(`Discord API Reachable: ${apiConnected ? '✅' : '❌'}`);
        console.log(`Environment Variables: ${permissionsOk ? '✅' : '❌'}`);
        console.log(`Message Events Detected: ${testResults.messageEventDetected ? '✅' : '❌'}`);
        console.log(`Bot Responses Detected: ${testResults.responseDetected ? '✅' : '❌'}`);

        if (!testResults.messageEventDetected) {
            console.log('\n🔍 Troubleshooting Suggestions:');
            console.log('1. Verify the bot is in the Discord server');
            console.log('2. Check bot permissions (Read Messages, Send Messages, Use Webhooks)');
            console.log('3. Ensure the message contains "hello bunkbot" (case insensitive)');
            console.log('4. Verify the message is not from another bot');
            console.log('5. Check if the bot token is valid and not expired');
        }

    } else if (args.includes('--monitor') || args.includes('-m')) {
        await monitorLogs();
    } else {
        console.log('💡 Available options:');
        console.log('   --test-events (-t): Interactive message event testing');
        console.log('   --monitor (-m): Watch live logs');
        console.log('   Example: node test-bunkbot-discord.js --test-events');
        console.log('');

        if (connectionStatus.connected && apiConnected && permissionsOk) {
            console.log('🎉 BunkBot appears to be configured correctly!');
            console.log('   Run with --test-events to verify Discord message processing.');
        } else {
            console.log('⚠️  BunkBot has configuration issues that need to be resolved.');
        }
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('💥 Test script failed:', error);
        process.exit(1);
    });
}
