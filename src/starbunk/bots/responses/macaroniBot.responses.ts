/**
 * MacaroniBot Responses
 *
 * Centralized collection of all responses used by MacaroniBot
 * Organizing these in one place makes them easier to maintain and update
 */

// Avatar URL for the bot
export const AVATAR_URL = 'https://i.imgur.com/Jx5v7bZ.png';

// Response when someone mentions "venn"
export const VENN_CORRECTION = "Correction: you mean Venn \"Tyrone \"The \"Macaroni\" Man\" Johnson\" Caelum";

// Response when someone mentions "macaroni"
export const MACARONI_MENTION = (userMention: string): string => `Are you trying to reach ${userMention}`;
