import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import roleIDs from '../../discord/roleIDs';
import userID from '../../discord/userID';

// Define day enum for better readability
export enum Day {
	Sunday = 0,
	Monday = 1,
	Tuesday = 2,
	Wednesday = 3,
	Thursday = 4,
	Friday = 5,
	Saturday = 6,
}

// Interface for raid schedule strategy
export interface RaidScheduleStrategy {
	getNextRaidDate(currentDate: Date): Date;
}

// Implementation for Tuesday/Wednesday raid schedule
export class TuesdayWednesdayRaidSchedule implements RaidScheduleStrategy {
	getNextRaidDate(currentDate: Date): Date {
		const raidTime = new Date(currentDate);

		switch (raidTime.getUTCDay()) {
			case Day.Tuesday:
			case Day.Wednesday:
				// Set to next day at midnight UTC
				raidTime.setUTCHours(24);
				raidTime.setUTCMinutes(0);
				raidTime.setUTCSeconds(0);
				raidTime.setUTCMilliseconds(0);
				return raidTime;
			default:
				// Increment day and recurse until we find a raid day
				raidTime.setUTCDate(raidTime.getUTCDate() + 1);
				return this.getNextRaidDate(raidTime);
		}
	}
}

// Interface for response formatter
export interface ResponseFormatter {
	formatResponse(nextRaid: Date, shouldTagTeam: boolean): string;
}

// Implementation for Discord timestamp formatter
export class DiscordTimestampFormatter implements ResponseFormatter {
	private readonly raidTeamRoleId: string;

	constructor(raidTeamRoleId: string = roleIDs.RaidTeam) {
		this.raidTeamRoleId = raidTeamRoleId;
	}

	formatResponse(nextRaid: Date, shouldTagTeam: boolean): string {
		const timestamp = Math.floor(nextRaid.getTime() / 1000);
		const tag = shouldTagTeam ? `<@&${this.raidTeamRoleId}>\n` : '';

		return `${tag}The next Raid Time is set for: <t:${timestamp}:f>\nWhich is <t:${timestamp}:R>.`;
	}
}

// Service for raid time operations
export class RaidTimeService {
	private readonly scheduleStrategy: RaidScheduleStrategy;
	private readonly responseFormatter: ResponseFormatter;

	constructor(scheduleStrategy: RaidScheduleStrategy, responseFormatter: ResponseFormatter) {
		this.scheduleStrategy = scheduleStrategy;
		this.responseFormatter = responseFormatter;
	}

	getNextRaidInfo(currentDate: Date, userId: string): {
		message: string;
		isPublic: boolean;
	} {
		const nextRaid = this.scheduleStrategy.getNextRaidDate(currentDate);
		const isCovaUser = userId === userID.Cova;
		const shouldTagTeam = isCovaUser;

		return {
			message: this.responseFormatter.formatResponse(nextRaid, shouldTagTeam),
			isPublic: shouldTagTeam
		};
	}
}

// For backward compatibility
export const getNextRaid = (now: Date): Date => {
	const scheduler = new TuesdayWednesdayRaidSchedule();
	return scheduler.getNextRaidDate(now);
};

// Command definition
export default {
	data: new SlashCommandBuilder().setName('raidwhen').setDescription('how long until raid'),
	permissions: [],

	async execute(interaction: CommandInteraction) {
		const currentDate = new Date(Date.now());
		const userId = interaction.user.id;

		// Create service with default implementations
		const scheduleStrategy = new TuesdayWednesdayRaidSchedule();
		const responseFormatter = new DiscordTimestampFormatter();
		const raidTimeService = new RaidTimeService(scheduleStrategy, responseFormatter);

		try {
			const { message, isPublic } = raidTimeService.getNextRaidInfo(currentDate, userId);

			await interaction.reply({
				content: message,
				fetchReply: false,
				ephemeral: !isPublic,
			});
		} catch (error) {
			console.error('Error getting raid time:', error);
			await interaction.reply({
				content: 'An error occurred while calculating raid time',
				ephemeral: true
			});
		}
	},
};
