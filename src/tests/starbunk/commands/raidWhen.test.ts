import {
	Day,
	DiscordTimestampFormatter,
	RaidScheduleStrategy,
	RaidTimeService,
	ResponseFormatter,
	TuesdayWednesdayRaidSchedule
} from '../../../starbunk/commands/raidWhen';

describe('RaidWhen Command', () => {
	describe('TuesdayWednesdayRaidSchedule', () => {
		let schedule: RaidScheduleStrategy;

		beforeEach(() => {
			schedule = new TuesdayWednesdayRaidSchedule();
		});

		it('should return next day when current day is Wednesday', () => {
			// Mock Wednesday (day 3)
			const mockDate = new Date('2023-08-09'); // A Wednesday
			const nextRaid = schedule.getNextRaidDate(mockDate);

			// The implementation sets to next day at midnight UTC
			const expectedDate = new Date(mockDate);
			expectedDate.setUTCDate(expectedDate.getUTCDate() + 1);
			expectedDate.setUTCHours(0, 0, 0, 0);

			expect(nextRaid.getUTCDate()).toBe(expectedDate.getUTCDate());
			expect(nextRaid.getUTCDay()).toBe(expectedDate.getUTCDay());
		});

		it('should find next raid day when current day is after Wednesday', () => {
			// Mock Friday (day 5)
			const mockDate = new Date('2023-08-11'); // A Friday
			const nextRaid = schedule.getNextRaidDate(mockDate);

			// The implementation should find the next Tuesday or Wednesday
			// Based on the implementation, it will find the next day that is either Tuesday or Wednesday
			// and then set it to the next day at midnight
			expect([Day.Tuesday, Day.Wednesday]).toContain(nextRaid.getUTCDay());
		});

		it('should return next day when current day is Tuesday after raid time', () => {
			// Mock Tuesday (day 2) at 9:30 PM (after raid time)
			const mockDate = new Date('2023-08-08T21:30:00'); // A Tuesday after raid
			const nextRaid = schedule.getNextRaidDate(mockDate);

			// The implementation sets to next day at midnight UTC
			const expectedDate = new Date(mockDate);
			expectedDate.setUTCDate(expectedDate.getUTCDate() + 1);
			expectedDate.setUTCHours(0, 0, 0, 0);

			expect(nextRaid.getUTCDate()).toBe(expectedDate.getUTCDate());
			expect(nextRaid.getUTCDay()).toBe(expectedDate.getUTCDay());
		});

		it('should return next day when current day is Tuesday before raid time', () => {
			// Mock Tuesday (day 2) at 6:30 PM (before raid time)
			const mockDate = new Date('2023-08-08T18:30:00'); // A Tuesday before raid
			const nextRaid = schedule.getNextRaidDate(mockDate);

			// The implementation sets to next day at midnight UTC
			const expectedDate = new Date(mockDate);
			expectedDate.setUTCDate(expectedDate.getUTCDate() + 1);
			expectedDate.setUTCHours(0, 0, 0, 0);

			expect(nextRaid.getUTCDate()).toBe(expectedDate.getUTCDate());
			expect(nextRaid.getUTCDay()).toBe(expectedDate.getUTCDay());
		});
	});

	describe('DiscordTimestampFormatter', () => {
		let formatter: ResponseFormatter;

		beforeEach(() => {
			formatter = new DiscordTimestampFormatter();
		});

		it('should format response with timestamp and no tag', () => {
			const date = new Date('2023-08-08T20:00:00');
			const timestamp = Math.floor(date.getTime() / 1000);

			const response = formatter.formatResponse(date, false);

			expect(response).toContain(`<t:${timestamp}:f>`);
			expect(response).toContain(`<t:${timestamp}:R>`);
			expect(response).not.toContain('<@&');
		});

		it('should format response with timestamp and tag', () => {
			const date = new Date('2023-08-08T20:00:00');
			const timestamp = Math.floor(date.getTime() / 1000);

			const response = formatter.formatResponse(date, true);

			expect(response).toContain(`<t:${timestamp}:f>`);
			expect(response).toContain(`<t:${timestamp}:R>`);
			expect(response).toContain('<@&');
		});
	});

	describe('RaidTimeService', () => {
		let mockSchedule: RaidScheduleStrategy;
		let mockFormatter: ResponseFormatter;
		let service: RaidTimeService;

		beforeEach(() => {
			mockSchedule = {
				getNextRaidDate: jest.fn()
			};

			mockFormatter = {
				formatResponse: jest.fn()
			};

			service = new RaidTimeService(mockSchedule, mockFormatter);
		});

		it('should get next raid info for regular user', () => {
			const mockDate = new Date('2023-08-08T20:00:00');
			const mockNextRaid = new Date('2023-08-15T20:00:00');
			const mockResponse = 'Next raid is Tuesday at 8 PM';
			const regularUserId = '123456789';

			(mockSchedule.getNextRaidDate as jest.Mock).mockReturnValue(mockNextRaid);
			(mockFormatter.formatResponse as jest.Mock).mockReturnValue(mockResponse);

			const result = service.getNextRaidInfo(mockDate, regularUserId);

			expect(mockSchedule.getNextRaidDate).toHaveBeenCalledWith(mockDate);
			expect(mockFormatter.formatResponse).toHaveBeenCalledWith(mockNextRaid, false);
			expect(result).toEqual({
				message: mockResponse,
				isPublic: false
			});
		});

		it('should get next raid info for Cova user with team tag', () => {
			const mockDate = new Date('2023-08-08T20:00:00');
			const mockNextRaid = new Date('2023-08-15T20:00:00');
			const mockResponse = 'Next raid is Tuesday at 8 PM @RaidTeam';
			const covaUserId = '139592376443338752'; // This matches userID.Cova

			(mockSchedule.getNextRaidDate as jest.Mock).mockReturnValue(mockNextRaid);
			(mockFormatter.formatResponse as jest.Mock).mockReturnValue(mockResponse);

			const result = service.getNextRaidInfo(mockDate, covaUserId);

			expect(mockSchedule.getNextRaidDate).toHaveBeenCalledWith(mockDate);
			expect(mockFormatter.formatResponse).toHaveBeenCalledWith(mockNextRaid, true);
			expect(result).toEqual({
				message: mockResponse,
				isPublic: true
			});
		});
	});
});
