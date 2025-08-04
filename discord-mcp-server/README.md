# Discord MCP Server

A Model Context Protocol (MCP) server that enables AI assistants like Claude to interact with Discord through a secure, controlled interface.

## Features

- **Send Messages**: Send messages to Discord channels
- **Read Messages**: Retrieve recent messages from channels
- **Server Management**: List Discord servers the bot is in
- **Channel Discovery**: Get channels from Discord servers
- **Secure**: Uses Discord bot tokens with proper permissions

## Setup

### 1. Create a Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section
4. Click "Add Bot"
5. Copy the bot token (you'll need this)
6. Under "Privileged Gateway Intents", enable:
   - Message Content Intent
   - Server Members Intent (optional)

### 2. Invite Bot to Your Server

1. In the Discord Developer Portal, go to "OAuth2" > "URL Generator"
2. Select scopes: `bot`
3. Select bot permissions:
   - Send Messages
   - Read Message History
   - View Channels
4. Copy the generated URL and visit it to invite the bot

### 3. Install and Build

```bash
cd discord-mcp-server
npm install
npm run build
```

### 4. Set Environment Variables

Create a `.env` file or set environment variables:

```bash
export DISCORD_TOKEN="your_bot_token_here"
```

## Usage with Claude Desktop

Add this configuration to your Claude Desktop config file (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "discord": {
      "command": "node",
      "args": ["/absolute/path/to/discord-mcp-server/build/index.js"],
      "env": {
        "DISCORD_TOKEN": "your_bot_token_here"
      }
    }
  }
}
```

### Alternative: Using npx

You can also run it directly with npx:

```json
{
  "mcpServers": {
    "discord": {
      "command": "npx",
      "args": ["discord-mcp-server"],
      "env": {
        "DISCORD_TOKEN": "your_bot_token_here"
      }
    }
  }
}
```

## Available Tools

### send_discord_message
Send a message to a Discord channel.

**Parameters:**
- `channelId` (string): The Discord channel ID
- `message` (string): The message content

### get_discord_messages
Get recent messages from a Discord channel.

**Parameters:**
- `channelId` (string): The Discord channel ID
- `limit` (number, optional): Number of messages (1-100, default: 10)

### get_discord_servers
Get list of Discord servers the bot is in.

**Parameters:** None

### get_discord_channels
Get list of channels in a Discord server.

**Parameters:**
- `serverId` (string): The Discord server ID

## Finding Channel and Server IDs

1. Enable Developer Mode in Discord (Settings > Advanced > Developer Mode)
2. Right-click on channels/servers and select "Copy ID"

## Development

```bash
# Build the project
npm run build

# Run in development mode (builds and runs)
npm run dev

# Clean build directory
npm run clean
```

## Security Notes

- Never share your Discord bot token
- The bot only has access to servers where it's been invited
- MCP provides a secure interface - the AI can only use the tools you've defined
- Consider using environment variables or secure secret management for tokens

## Troubleshooting

1. **Bot not responding**: Check that the bot token is correct and the bot is online
2. **Permission errors**: Ensure the bot has proper permissions in your Discord server
3. **Channel not found**: Verify you're using the correct channel ID and the bot can access that channel

## License

ISC