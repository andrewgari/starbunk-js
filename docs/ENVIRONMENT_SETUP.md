# Environment Setup Guide

This guide explains how to set up environment variables for the Starbunk Discord Bot system.

## 🔧 Local Development Setup

### 1. Copy the Example File
```bash
cp .env.example .env
```

### 2. Fill in Your Values
Edit the `.env` file with your actual values:

```bash
# Discord Bot Tokens
STARBUNK_TOKEN=your-actual-discord-bot-token
E2E_BOT_TOKEN=your-e2e-testing-bot-token
E2E_WEBHOOK_URL=your-e2e-webhook-url

# Other required values...
```

### 3. Never Commit .env Files
The `.gitignore` is configured to exclude all `.env*` files except examples:
- ✅ `.env.example` - Committed (template)
- ❌ `.env` - Ignored (your local config)
- ❌ `.env.development` - Ignored
- ❌ `.env.production` - Ignored

## 🚀 GitHub Secrets Setup

For CI/CD and E2E testing, add these secrets to your GitHub repository:

### Repository Secrets
Go to **Settings → Secrets and variables → Actions** and add:

#### Discord Bot Tokens
```
STARBUNK_TOKEN=your-production-discord-bot-token
E2E_BOT_TOKEN=your-e2e-testing-bot-token
E2E_WEBHOOK_URL=your-e2e-webhook-url
```

#### Container-Specific Tokens (Optional)
```
BUNKBOT_TOKEN=your-bunkbot-token
COVABOT_TOKEN=your-covabot-token
DJCOVA_TOKEN=your-djcova-token
STARBUNK_DND_TOKEN=your-starbunk-dnd-token
```

#### AI/LLM Configuration
```
OPENAI_API_KEY=your-openai-api-key
OLLAMA_API_URL=http://192.168.50.3:11434
```

#### Database Configuration
```
DATABASE_URL=postgresql://username:password@host:5432/database
QDRANT_URL=http://192.168.50.3:6333
QDRANT_API_KEY=your-qdrant-api-key
```

#### Debug/Testing Configuration
```
DEBUG_MODE=false
TESTING_SERVER_IDS=your-test-server-ids-comma-separated
TESTING_CHANNEL_IDS=your-test-channel-ids-comma-separated
```

## 🤖 Creating Discord Bots

### 1. Main Production Bot
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application called "Starbunk Bot"
3. Go to the "Bot" section
4. Generate a bot token
5. Copy the token to `STARBUNK_TOKEN`

### 2. E2E Testing Bot
1. Create another application called "E2E Test Bot"
2. Generate a separate bot token
3. Copy the token to `E2E_BOT_TOKEN`
4. Create a webhook in your test Discord server
5. Copy the webhook URL to `E2E_WEBHOOK_URL`

### 3. Bot Permissions
Both bots need these permissions:
- Send Messages
- Read Message History
- Use Slash Commands
- Manage Messages (for some features)
- Connect & Speak (for music bot features)

## 🔒 Security Best Practices

### ✅ Do This
- Use separate bots for production and testing
- Store secrets in GitHub Secrets for CI/CD
- Use environment variables for all sensitive data
- Rotate tokens periodically
- Use minimal required permissions

### ❌ Never Do This
- Commit `.env` files to git
- Share bot tokens in chat/email
- Use production tokens for testing
- Hardcode secrets in source code
- Give bots unnecessary permissions

## 🧪 E2E Testing Setup

The enhanced E2E testing system requires:

1. **E2E Bot Token**: Separate Discord bot for testing
2. **E2E Webhook URL**: Webhook in your test Discord server
3. **Test Server/Channel IDs**: Whitelisted servers and channels for testing

### Test Server Setup
1. Create a dedicated Discord server for testing
2. Add both your main bot and E2E bot to the server
3. Create a test channel
4. Create a webhook in the test channel
5. Add the server and channel IDs to your environment variables

## 🐳 Production Deployment

For production deployment (Docker/Unraid):

1. Use the `docker-compose.latest.yml` file
2. Set environment variables in your container orchestration system
3. Use external PostgreSQL via `DATABASE_URL`
4. Mount persistent volumes for data storage

Example Docker environment:
```bash
STARBUNK_TOKEN=your-production-token
DATABASE_URL=postgresql://user:pass@postgres:5432/starbunk
QDRANT_URL=http://qdrant:6333
```

## 🆘 Troubleshooting

### Token Issues
- **"Invalid token"**: Check the token is correct and the bot exists
- **"Missing permissions"**: Ensure the bot has required permissions in your server
- **"Token revoked"**: GitHub may revoke tokens found in commits - generate a new one

### E2E Testing Issues
- **"E2E tests failing"**: Check `E2E_BOT_TOKEN` and `E2E_WEBHOOK_URL` are set
- **"Bot not responding"**: Verify the E2E bot is in your test server
- **"Webhook errors"**: Ensure the webhook URL is valid and accessible

### Environment Loading
- **"Environment variables not found"**: Check your `.env` file exists and has correct syntax
- **"Wrong values loaded"**: Ensure no spaces around `=` in `.env` files
- **"Production issues"**: Verify all required secrets are set in GitHub/production environment
