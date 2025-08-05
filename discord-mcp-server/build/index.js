#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ErrorCode, McpError, } from '@modelcontextprotocol/sdk/types.js';
import { Client, GatewayIntentBits } from 'discord.js';
// Discord MCP Server
class DiscordMCPServer {
    server;
    discordClient;
    constructor() {
        this.server = new Server({
            name: 'discord-mcp-server',
            version: '1.0.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.discordClient = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.DirectMessages,
            ],
        });
        this.setupToolHandlers();
        this.setupErrorHandling();
    }
    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: 'send_discord_message',
                        description: 'Send a message to a Discord channel',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                channelId: {
                                    type: 'string',
                                    description: 'The Discord channel ID to send the message to',
                                },
                                message: {
                                    type: 'string',
                                    description: 'The message content to send',
                                },
                            },
                            required: ['channelId', 'message'],
                        },
                    },
                    {
                        name: 'get_discord_messages',
                        description: 'Get recent messages from a Discord channel',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                channelId: {
                                    type: 'string',
                                    description: 'The Discord channel ID to get messages from',
                                },
                                limit: {
                                    type: 'number',
                                    description: 'Number of messages to retrieve (default: 10, max: 100)',
                                    minimum: 1,
                                    maximum: 100,
                                },
                            },
                            required: ['channelId'],
                        },
                    },
                    {
                        name: 'get_discord_servers',
                        description: 'Get list of Discord servers the bot is in',
                        inputSchema: {
                            type: 'object',
                            properties: {},
                        },
                    },
                    {
                        name: 'get_discord_channels',
                        description: 'Get list of channels in a Discord server',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                serverId: {
                                    type: 'string',
                                    description: 'The Discord server ID to get channels from',
                                },
                            },
                            required: ['serverId'],
                        },
                    },
                ],
            };
        });
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            if (!this.discordClient.isReady()) {
                throw new McpError(ErrorCode.InternalError, 'Discord client is not ready. Please ensure the bot token is valid and the bot is connected.');
            }
            switch (request.params.name) {
                case 'send_discord_message':
                    return await this.sendMessage(request.params.arguments?.channelId, request.params.arguments?.message);
                case 'get_discord_messages':
                    return await this.getMessages(request.params.arguments?.channelId, request.params.arguments?.limit);
                case 'get_discord_servers':
                    return await this.getServers();
                case 'get_discord_channels':
                    return await this.getChannels(request.params.arguments?.serverId);
                default:
                    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
            }
        });
    }
    async sendMessage(channelId, message) {
        try {
            const channel = await this.discordClient.channels.fetch(channelId);
            if (!channel || (!channel.isTextBased())) {
                throw new Error(`Channel ${channelId} not found or is not a text channel`);
            }
            const textChannel = channel;
            const sentMessage = await textChannel.send(message);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Message sent successfully to channel ${channelId}. Message ID: ${sentMessage.id}`,
                    },
                ],
            };
        }
        catch (error) {
            throw new McpError(ErrorCode.InternalError, `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getMessages(channelId, limit = 10) {
        try {
            const channel = await this.discordClient.channels.fetch(channelId);
            if (!channel || !channel.isTextBased()) {
                throw new Error(`Channel ${channelId} not found or is not a text channel`);
            }
            const textChannel = channel;
            const messages = await textChannel.messages.fetch({ limit: Math.min(limit, 100) });
            const messageList = messages.map(msg => ({
                id: msg.id,
                author: {
                    username: msg.author.username,
                    displayName: msg.author.displayName,
                    bot: msg.author.bot,
                },
                content: msg.content,
                timestamp: msg.createdAt.toISOString(),
                attachments: msg.attachments.size > 0 ? msg.attachments.map(att => ({
                    name: att.name,
                    url: att.url,
                    size: att.size,
                })) : [],
            })).reverse(); // Reverse to show oldest first
            return {
                content: [
                    {
                        type: 'text',
                        text: `Retrieved ${messageList.length} messages from channel ${channelId}:\n\n${JSON.stringify(messageList, null, 2)}`,
                    },
                ],
            };
        }
        catch (error) {
            throw new McpError(ErrorCode.InternalError, `Failed to get messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getServers() {
        try {
            const guilds = this.discordClient.guilds.cache.map(guild => ({
                id: guild.id,
                name: guild.name,
                memberCount: guild.memberCount,
                description: guild.description,
            }));
            return {
                content: [
                    {
                        type: 'text',
                        text: `Bot is in ${guilds.length} servers:\n\n${JSON.stringify(guilds, null, 2)}`,
                    },
                ],
            };
        }
        catch (error) {
            throw new McpError(ErrorCode.InternalError, `Failed to get servers: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getChannels(serverId) {
        try {
            const guild = this.discordClient.guilds.cache.get(serverId);
            if (!guild) {
                throw new Error(`Server ${serverId} not found`);
            }
            const channels = guild.channels.cache
                .filter(channel => channel.isTextBased())
                .map(channel => ({
                id: channel.id,
                name: channel.name,
                type: channel.type,
            }));
            return {
                content: [
                    {
                        type: 'text',
                        text: `Found ${channels.length} text channels in server ${guild.name}:\n\n${JSON.stringify(channels, null, 2)}`,
                    },
                ],
            };
        }
        catch (error) {
            throw new McpError(ErrorCode.InternalError, `Failed to get channels: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    setupErrorHandling() {
        this.server.onerror = (error) => {
            console.error('[MCP Error]', error);
        };
        process.on('SIGINT', async () => {
            await this.cleanup();
            process.exit(0);
        });
        process.on('SIGTERM', async () => {
            await this.cleanup();
            process.exit(0);
        });
    }
    async cleanup() {
        if (this.discordClient.isReady()) {
            this.discordClient.destroy();
        }
        await this.server.close();
    }
    async start() {
        const token = process.env.DISCORD_TOKEN;
        if (!token) {
            console.error('DISCORD_TOKEN environment variable is required');
            process.exit(1);
        }
        // Connect to Discord
        try {
            await this.discordClient.login(token);
            console.log('Discord client connected successfully');
        }
        catch (error) {
            console.error('Failed to connect to Discord:', error);
            process.exit(1);
        }
        // Start MCP server
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.log('Discord MCP Server running on stdio');
    }
}
// Start the server
const server = new DiscordMCPServer();
server.start().catch(console.error);
//# sourceMappingURL=index.js.map