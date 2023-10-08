import {
  CommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  Webhook,
  time
} from 'discord.js';
import roleIDs from '../discord/roleIDs';
import userID from '../discord/userID';

enum Day {
  Sunday = 0,
  Monday = 1,
  Tuesday = 2,
  Wednesday = 3,
  Thursday = 4,
  Friday = 5,
  Saturday = 6
}

const getNextRaid = (now: Date): Date => {
  let raidTime = now;
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

export default {
  data: new SlashCommandBuilder()
    .setName('raidwhen')
    .setDescription('how long until raid'),
  permissions: [],
  async execute(interaction: CommandInteraction) {
    const now = new Date(Date.now());
    console.log(now);
    const nextRaid = getNextRaid(now);
    console.log(nextRaid);
    const ephemeral = interaction.user.id === userID.Cova ? true : false;
    const tag = ephemeral ? `<@&${roleIDs.RaidTeam}>\n` : '';
    const timestamp = nextRaid.getTime() / 1000;
    const reply = `${tag}The next Raid Time is set for: <t:${timestamp}:f>\nWhich is <t:${timestamp}:R>.`;
    await interaction.reply({
      content: reply,
      fetchReply: false,
      ephemeral: !ephemeral
    });
  }
};
