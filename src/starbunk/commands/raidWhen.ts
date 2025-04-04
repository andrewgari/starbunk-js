import { isDebugMode } from '@/environment';
import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import roleIds from '../../discord/roleIds';
import userId from '../../discord/userId';

enum Day {
	Sunday = 0,
	Monday = 1,
	Tuesday = 2,
	Wednesday = 3,
	Thursday = 4,
	Friday = 5,
	Saturday = 6,
}

const getNextRaid = (now: Date): Date => {
	const raidTime = now;
	switch (raidTime.getUTCDay()) {
		case Day.Tuesday:
		case Day.Wednesday:
			raidTime.setUTCHours(24);
			raidTime.setUTCMinutes(0);
			raidTime.setUTCSeconds(0);
			raidTime.setUTCMilliseconds(0);
			return raidTime;
		default:
			raidTime.setUTCDate(raidTime.getUTCDate() + 1);
			return getNextRaid(raidTime);
	}
};

const commandBuilder = new SlashCommandBuilder()
	.setName('raidwhen')
	.setDescription('how long until raid');

export default {
	data: commandBuilder.toJSON(),
	permissions: [],
	async execute(interaction: CommandInteraction) {
		const now = new Date(Date.now());
		const nextRaid = getNextRaid(now);
		const targetUserId = isDebugMode() ? userId.Cova : userId.Cova;
		const ephemeral = interaction.user.id === targetUserId ? true : false;
		const tag = ephemeral ? `<@&${roleIds.RaidTeam}>\n` : '';
		const timestamp = nextRaid.getTime() / 1000;
		const reply = `${tag}The next Raid Time is set for: <t:${timestamp}:f>\nWhich is <t:${timestamp}:R>.`;
		await interaction.reply({
			content: reply,
			fetchReply: false,
			ephemeral: !ephemeral,
		});
	},
};
