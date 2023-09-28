import { Client, Events, Message } from "discord.js";

export default (client: Client): void => {
    client.on(Events.MessageCreate, async(message: Message) => {
        if (message.content.includes('blue')) {
            handleMessage(client, message);
        }
    });
}

const handleMessage = (_client: Client, message: Message) => {
    message.channel.send('lol somebody definitely said blu');
};
