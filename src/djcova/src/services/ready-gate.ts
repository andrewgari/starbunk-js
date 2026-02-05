import { Client } from 'discord.js';

export function waitForConnectionRead(client: Client): Promise<void> {
  client.voice?.connections.forEach(connection => {
    if (connection.dispatcher && connection.dispatcher.paused) {
      connection.dispatcher.resume();
    }
  });
}
