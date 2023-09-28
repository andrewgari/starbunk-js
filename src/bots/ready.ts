import { Client, Events } from 'discord.js'

export default (client: Client): void => {
    client.on(Events.ClientReady, async () => {
        if (!client.user || !client.application) {
            return;
        };
        console.log(`${client.user.username} is online`);
    })
}