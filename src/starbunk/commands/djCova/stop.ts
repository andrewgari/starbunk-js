import { getVoiceConnection } from '@discordjs/voice'
import {
    CommandInteraction,
    SlashCommandBuilder,
} from 'discord.js'
import guildIDs from 'src/discord/guildIDs';
import { getStarbunkClient } from 'src/starbunk/starbunkClient'

export default {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop playing and leave channel'),
    async execute(interaction: CommandInteraction) {
        const client = getStarbunkClient(interaction);
        if (client) {
            client.musicPlayer.stop();
            const connection = getVoiceConnection(interaction.guild?.id ?? guildIDs.StarbunkCrusaders);
            connection?.disconnect();
        }
    }
}