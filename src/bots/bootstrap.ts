import { Client, Events, Message } from "discord.js";
import bluebot from "./reply-bots/bluebot";

export default (client: Client): void => {
    bluebot(client);
};