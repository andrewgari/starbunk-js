import {
    CommandInteraction,
    GuildMember, PermissionFlagsBits,
    SlashCommandBuilder, TextChannel
} from 'discord.js';
import webhookService from '../../webhooks/webhookService';

export default {
    data: new SlashCommandBuilder()
            .setName('monkeysay')
            .setDescription('monkeydo')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addUserOption(option =>
                option
                    .setName('user')
                    .setDescription('the monkey you want to make speak')
                    .setRequired(true))
            .addStringOption(option =>
                option 
                    .setName('message')
                    .setDescription('what you want the monkey to say')
                    .setRequired(true)),
    async execute(interaction: CommandInteraction) {
        const user = interaction.options.get('user')?.user;
        const member = interaction.options.get('user')?.member as GuildMember;
        const message = interaction.options.get('message')?.value as string;

        if (user && member && message) {
            const nickname = member.nickname ?? user.username;
            const avatar = member.displayAvatarURL() ?? user.displayAvatarURL();
            const channel = interaction.channel as TextChannel;
            await webhookService.writeMessage(channel, {
                username: nickname,
                avatarURL: avatar,
                content: message,
                embeds: []
            });
            await interaction.reply({ content: 'Message sent!', ephemeral: true });
        }
    }
}
