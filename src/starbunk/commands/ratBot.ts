import {
  Collection,
  CommandInteraction,
  Guild,
  GuildMember,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import roleIDs from '../../discord/roleIDs';

type Rat = {
  member: GuildMember,
  partner: GuildMember,
}

const RatMap = new Map<String, Rat>();

const getRats = async (guild: Guild) => {
  const members = await guild.members.fetch();
  return members.filter(member => member.roles.cache.has(roleIDs.Ratmas));
}

const assignPairs = (members: Collection<string, GuildMember>) => {
  if (members.size < 3) {
    throw new Error('Rats must be at least 2 to assign pairs.');
  }

  const rats1 = Array.from(members.values());
  const rats2 = Array.from(members.values());

  for (let i = 0; i < members.size; i++) {
    const self = rats1.pop();
    const partner = rats2.filter((rat) => rat != self).pop();

    if (!self || !partner) {
      throw new Error('Rats must be at least 2 to assign pairs.');
    }

    const rat = {
      member: self,
      partner: partner
    }

    RatMap.set(self.user.username, rat);
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName('ratmas')
    .setDescription('begins the ratmas process and assigns pairs')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction: CommandInteraction) {
    await interaction.reply({
      content: 'Ratmas has begun. Assigning pairs now.',
      fetchReply: false,
      ephemeral: true
    });
    const rats = await getRats(interaction.guild!);
    assignPairs(rats);

    console.log("Temp RatMas Assigments: ", JSON.stringify(rats));
  }
}
