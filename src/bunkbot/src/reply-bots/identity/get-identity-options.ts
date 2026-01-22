import { Message } from 'discord.js';

export interface GetBotIdentityOptions {
  userId?: string;
  fallbackName: string;
  useRandomMember?: boolean;
  message: Message; // For server context
  forceRefresh?: boolean; // Force fresh data from Discord API
}
