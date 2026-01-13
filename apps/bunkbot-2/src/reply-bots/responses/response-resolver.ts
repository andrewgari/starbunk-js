// apps/bunkbot/src/core/response-resolver.ts
import { Message } from 'discord.js';

export class ResponseResolver {
  static async resolve(template: string, message: Message): Promise<string> {
    let response = template;

    // Logic for the {start} placeholder
    if (response.includes('{start}')) {
      const words = message.content.split(' ');
      // Take the first 3 words or the first 12 characters
      const startText = words.slice(0, 3).join(' ').substring(0, 15);
      response = response.replace('{start}', `***${startText}...***`);
    }

    return response;
  }
}
