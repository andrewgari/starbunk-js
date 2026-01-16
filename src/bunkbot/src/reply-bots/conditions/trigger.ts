import { Message } from 'discord.js';


export interface Trigger {
  name?: string;
  condition: (message: Message) => boolean | Promise<boolean>;
  responseGenerator: (message: Message) => string; // Returns a random string from the trigger or master pool
}
