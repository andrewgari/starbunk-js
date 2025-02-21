import { CommandInteraction, SlashCommandBuilder } from 'discord.js';

import roleIDs from '../../discord/roleIDs';
import userID from '../../discord/userID';

const enum RaidDay {
  Sunday,
  Monday,
  Tuesday,
  Wednesday,
  Thursday,
  Friday,
  Saturday
}

const getNextRaid = (now: Date): Date => {
  const raidTime = now;
  switch (raidTime.getUTCDay()) {
    case RaidDay.Tuesday:
    case RaidDay.Wednesday: {
      raidTime.setUTCHours(24);
      raidTime.setUTCMinutes(0);
      raidTime.setUTCSeconds(0);
      raidTime.setUTCMilliseconds(0);

      return raidTime;
    }
    default: {
      raidTime.setUTCDate(raidTime.getUTCDate() + 1);

      return getNextRaid(raidTime);
    }
  }
};

export default {
  data: new SlashCommandBuilder()
    .setName('raidwhen')
    .setDescription('how long until raid'),
  permissions: [],
  async execute(interaction: CommandInteraction) {
    const now = new Date(Date.now());
    const nextRaid = getNextRaid(now);
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
