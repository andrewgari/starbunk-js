import {entersState, joinVoiceChannel, VoiceConnection, VoiceConnectionStatus} from "@discordjs/voice";

export default async function connectToChannel(channelId: string, guildId: string, adapterCreator: any): Promise<VoiceConnection> {
    const connection = joinVoiceChannel({
        channelId,
        guildId,
        adapterCreator,
        selfDeaf: true,
    });

    connection.on('stateChange', (oldState, newState) => {
        console.log(`Connection state changed from ${oldState.status} to ${newState.status}`);
    });

    try {
        await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
        console.log(`Connected to channel ${channelId}`);
        return connection;
    } catch (error) {
        console.error('Failed to connect to the voice channel', error);
        connection.destroy();
        throw error;
    }
}