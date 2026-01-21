# BlueBot Development Tools

This directory contains development and testing tools for BlueBot that are **excluded from production builds**.

## Available Tools

### 1. Interactive CLI Tester (Recommended)

**Offline testing with custom identity** - Test BlueBot without Discord connection.

```bash
npm run tester:cli
```

Features:
- ✅ No Discord connection needed
- ✅ Set your own user ID, username, and nickname
- ✅ Interactive REPL - type messages and see responses instantly
- ✅ Switch identities on the fly
- ✅ Test enemy user behavior easily

### 2. Live Discord Tester

**Real-time Discord testing** - Connects to Discord and monitors actual messages.

```bash
npm run tester
```

Features:
- ✅ Listens to real Discord messages
- ✅ Shows what BlueBot would respond (without sending)
- ✅ Test in real server environment
- ❌ Requires Discord bot token and connection

---

## Interactive CLI Tester (Detailed Guide)

### Quick Start

1. **Run the tester:**
   ```bash
   cd src/bluebot
   npm run tester:cli
   ```

2. **Configure your identity (optional):**

   Set in `.env`:
   ```bash
   TEST_USER_ID=123456789012345678
   TEST_USERNAME=YourName
   TEST_NICKNAME=YourNick
   BLUEBOT_ENEMY_USER_ID=999999999999999999  # For testing enemy behavior
   ```

3. **Start testing:**
   ```
   > I love blue
   ──────────────────────────────────────────────────────────────────
   You (YourName): I love blue
   BlueBot: Did somebody say Blu?
   ──────────────────────────────────────────────────────────────────
   ```

### Available Commands

Type these commands in the interactive prompt:

- `/help` - Show help message
- `/identity` - Show current user identity
- `/setid <id>` - Change your user ID
- `/setname <name>` - Change your username
- `/setnick <nickname>` - Change your nickname
- `/enemy` - Switch to enemy user mode (uses BLUEBOT_ENEMY_USER_ID)
- `/clear` - Clear the screen
- `/exit` or `/quit` - Exit the tester

### Example Session

```
> /identity
Current Identity:
  User ID:  123456789012345678
  Username: TestUser
  Nickname: TestNick

> /setname Alice
Username set to: Alice

> bluebot, compliment me
──────────────────────────────────────────────────────────────────
You (Alice): bluebot, compliment me
BlueBot: Hey Alice, I think you're pretty blue! :wink:
──────────────────────────────────────────────────────────────────

> /enemy
Switched to enemy user mode (ID: 999999999999999999)

> bluebot, compliment me
──────────────────────────────────────────────────────────────────
You (Alice): bluebot, compliment me
BlueBot: No way, they can suck my blue cane :unamused:
──────────────────────────────────────────────────────────────────
```

---

## Live Discord Tester (Detailed Guide)

## Purpose

The BlueBot Tester allows you to:
- Test BlueBot's response logic in real-time
- Debug strategy matching and response generation
- Monitor what BlueBot would respond to without spamming Discord channels
- Verify behavior changes before deploying

## Setup

### 1. Create a Discord Bot for Testing

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application (e.g., "BlueBot Tester")
3. Go to the "Bot" section and create a bot
4. Copy the bot token
5. Enable the following Privileged Gateway Intents:
   - Server Members Intent
   - Message Content Intent
6. Invite the bot to your test server using OAuth2 URL Generator:
   - Scopes: `bot`
   - Bot Permissions: `Read Messages/View Channels`, `Read Message History`

### 2. Configure Environment Variables

Create or update your `.env` file in the `src/bluebot` directory:

```bash
# Your tester bot token
BLUEBOT_TESTER_TOKEN=your-tester-bot-token-here

# Or use the shared DISCORD_TOKEN if you prefer
# DISCORD_TOKEN=your-tester-bot-token-here

# Optional: Configure enemy user for testing enemy responses
BLUEBOT_ENEMY_USER_ID=123456789012345678
```

## Usage

### Running the Tester

From the `src/bluebot` directory:

```bash
npm run tester
```

Or from the repository root:

```bash
cd src/bluebot && npm run tester
```

### What You'll See

When a message is sent in any channel the tester bot can see, you'll see output like:

```
────────────────────────────────────────────────────────────────────────────────
📨 Message:
   Author: YourUsername#1234 (123456789012345678)
   Channel: 987654321098765432
   Content: "I love blue"
✅ BlueBot Response:
   "Did somebody say Blu?"
────────────────────────────────────────────────────────────────────────────────
```

If no strategy matches:

```
────────────────────────────────────────────────────────────────────────────────
📨 Message:
   Author: YourUsername#1234 (123456789012345678)
   Channel: 987654321098765432
   Content: "hello world"
⏭️  No response (no strategy matched)
────────────────────────────────────────────────────────────────────────────────
```

## Testing Different Scenarios

### Test Blue Detection
Send messages containing "blue", "blu", "azul", etc.

### Test Nice Strategy
Send messages like "bluebot, compliment me" or "bluebot, say something nice to @user"

### Test Confirm Strategy
1. Send a message with "blue" to trigger the initial response
2. Within 5 minutes, send "yes", "no", "yep", etc. to see the confirmation response

### Test Enemy User Behavior
1. Set `BLUEBOT_ENEMY_USER_ID` to your Discord user ID
2. Send messages to see how BlueBot responds differently to enemy users

## Stopping the Tester

Press `Ctrl+C` to gracefully shut down the tester.

## Differences from Production BlueBot

- **No Messages Sent**: The tester only logs responses to console, it never sends messages to Discord
- **All Messages Visible**: You can see all messages the bot processes, even ones it doesn't respond to
- **Structured Logging**: Additional debug information is logged for troubleshooting

## Troubleshooting

### "Discord token not found"
Make sure you've set `BLUEBOT_TESTER_TOKEN` or `DISCORD_TOKEN` in your `.env` file.

### "No messages appearing"
- Verify the bot is in the server
- Check that Message Content Intent is enabled in Discord Developer Portal
- Ensure the bot has permission to read messages in the channels

### "Strategy not matching as expected"
Check the structured logs for detailed information about which strategies were evaluated and why they matched or didn't match.

## Development

The tester uses the same strategy logic as the production BlueBot, so any changes to strategies will automatically be reflected in the tester.

### Build Exclusion

The `tools/` directory is **excluded from production builds**:
- Not compiled by `npm run build`
- Not included in Docker images
- Not part of the TypeScript build pipeline
- Only available for local development and testing

This is configured in:
- `tsconfig.json` - excludes `tools` directory
- `tsconfig.docker.json` - inherits the exclusion

### Key Files

- `tools/tester.ts` - Main tester entry point
- `tools/tsconfig.json` - TypeScript config for tools
- `../src/strategy/strategy-router.ts` - Strategy processing logic (shared with production)
- `../src/strategy/*.ts` - Individual strategy implementations

