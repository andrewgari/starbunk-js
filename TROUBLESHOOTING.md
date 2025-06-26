# 🔧 Discord Bot Troubleshooting Guide

This guide helps diagnose and fix common issues when the Discord bot crashes after starting.

## 🚨 Common Crash Causes

### 1. **Invalid Discord Token** (Most Common)

**Symptoms:**
```
Error [TokenInvalid]: An invalid token was provided.
```

**Solutions:**
- **Check your Discord token**: Go to [Discord Developer Portal](https://discord.com/developers/applications)
- **Create a new bot** if you don't have one:
  1. Click "New Application" → Give it a name
  2. Go to "Bot" section → Click "Add Bot"
  3. Copy the token from "Token" section
- **Update your environment variables**:
  ```bash
  # In your .env file or environment
  STARBUNK_TOKEN=your_actual_bot_token_here
  ```
- **Verify token format**: Discord tokens are typically 24+ characters long

### 2. **Missing Environment Variables**

**Symptoms:**
```
Missing required environment variables: STARBUNK_TOKEN
```

**Solutions:**
- **Create .env file** in the container directory:
  ```bash
  # containers/bunkbot/.env
  STARBUNK_TOKEN=your_bot_token_here
  DEBUG_MODE=true
  NODE_ENV=development
  ```
- **Required variables for each container**:
  - **BunkBot**: `STARBUNK_TOKEN`
  - **DJCova**: `STARBUNK_TOKEN` 
  - **Starbunk-DND**: `STARBUNK_TOKEN`, `DATABASE_URL`, `OPENAI_API_KEY`
  - **CovaBot**: `STARBUNK_TOKEN`, `OPENAI_API_KEY`

### 3. **Bot Permissions Issues**

**Symptoms:**
- Bot connects but doesn't respond to commands
- "Missing Access" or "Missing Permissions" errors

**Solutions:**
- **Check bot permissions** in Discord Developer Portal:
  1. Go to "Bot" section
  2. Enable required "Privileged Gateway Intents":
     - ✅ Message Content Intent (required for reading messages)
     - ✅ Server Members Intent (for member-related features)
     - ✅ Presence Intent (optional)
- **Invite bot with correct permissions**:
  1. Go to "OAuth2" → "URL Generator"
  2. Select "bot" scope
  3. Select required permissions:
     - Send Messages
     - Read Message History
     - Use Slash Commands
     - Manage Webhooks (for BunkBot, Starbunk-DND, CovaBot)
     - Connect + Speak (for DJCova)

### 4. **Network/Connectivity Issues**

**Symptoms:**
```
Error: getaddrinfo ENOTFOUND discord.com
```

**Solutions:**
- **Check internet connection**
- **Check firewall settings** - ensure Discord API access (discord.com, gateway.discord.gg)
- **Try different network** if behind corporate firewall
- **Check DNS settings**

### 5. **Node.js Version Issues**

**Symptoms:**
```
SyntaxError: Unexpected token
```

**Solutions:**
- **Use Node.js 18+**: `node --version` should show v18.0.0 or higher
- **Update Node.js** if needed: [nodejs.org](https://nodejs.org/)

## 🔍 Diagnostic Commands

### Quick Health Check
```bash
# Test if bot can start (will fail on invalid token but show other issues)
cd containers/bunkbot
STARBUNK_TOKEN=test npm run build && node dist/index.js
```

### Environment Check
```bash
# Check if environment variables are loaded
cd containers/bunkbot
node -e "
require('dotenv').config();
console.log('STARBUNK_TOKEN:', process.env.STARBUNK_TOKEN ? 'SET' : 'NOT SET');
console.log('Token length:', process.env.STARBUNK_TOKEN?.length || 0);
"
```

### Network Check
```bash
# Test Discord API connectivity
ping discord.com
nslookup discord.com
```

## 🐳 Docker-Specific Issues

### Container Won't Start
```bash
# Check container logs
docker logs <container_name>

# Run container interactively for debugging
docker run -it --rm <image_name> /bin/bash
```

### Environment Variables in Docker
```bash
# Pass environment variables to container
docker run -e STARBUNK_TOKEN=your_token <image_name>

# Or use .env file
docker run --env-file .env <image_name>
```

## 🔧 Step-by-Step Debugging

### 1. Verify Bot Setup
- [ ] Bot created in Discord Developer Portal
- [ ] Bot token copied correctly
- [ ] Bot invited to server with correct permissions
- [ ] Message Content Intent enabled

### 2. Check Environment
- [ ] `.env` file exists in container directory
- [ ] `STARBUNK_TOKEN` is set and correct
- [ ] No extra spaces or quotes around token
- [ ] File permissions allow reading .env

### 3. Test Locally
```bash
# Build and test each container
cd containers/bunkbot
npm run build
STARBUNK_TOKEN=your_token npm start
```

### 4. Check Logs
- Look for specific error messages
- Check if bot connects to Discord
- Verify which step fails during startup

## 📞 Getting Help

If you're still having issues:

1. **Check the logs** for specific error messages
2. **Verify your Discord bot setup** in the Developer Portal
3. **Test with a simple token** to isolate the issue
4. **Check network connectivity** to Discord's servers

### Common Error Patterns

| Error Message | Likely Cause | Solution |
|---------------|--------------|----------|
| `TokenInvalid` | Wrong/expired Discord token | Get new token from Developer Portal |
| `Missing required environment variables` | .env file issues | Create/fix .env file |
| `ENOTFOUND discord.com` | Network/DNS issues | Check internet connection |
| `Missing Access` | Bot permissions | Update bot permissions in server |
| `Unexpected token` | Node.js version | Update to Node.js 18+ |

### Debug Mode

Enable debug mode for more detailed logging:
```bash
DEBUG_MODE=true STARBUNK_TOKEN=your_token npm start
```

This will show:
- Detailed startup process
- Environment variable status
- Network connectivity checks
- Permission verification
