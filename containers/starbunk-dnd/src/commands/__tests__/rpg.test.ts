import { ChatInputCommandInteraction, GuildMember, GuildChannel } from 'discord.js';
import rpgCommand from '../rpg';
import { CampaignService } from '../../services/campaignService';
import { HelpService } from '../../services/helpService';
import { getCampaignContext, getCampaignPermissions } from '../../utils/campaignChecks';
import { SUPPORTED_SYSTEMS } from '../../types/game';

// Mock dependencies
jest.mock('../../services/campaignService');
jest.mock('../../services/helpService');
jest.mock('../../utils/campaignChecks');
jest.mock('../../../services/logger');

describe('RPG Command', () => {
	let mockInteraction: Partial<ChatInputCommandInteraction>;
	let mockMember: Partial<GuildMember>;
	let mockChannel: Partial<GuildChannel>;
	let mockCampaignService: jest.Mocked<CampaignService>;
	let mockHelpService: jest.Mocked<HelpService>;

	beforeEach(() => {
		jest.clearAllMocks();

		// Mock channel
		mockChannel = {
			id: 'channel123',
			isTextBased: jest.fn().mockReturnValue(true)
		} as any;

		// Mock member
		mockMember = {
			id: 'user123',
			user: { id: 'user123' }
		} as any;

		// Mock interaction
		mockInteraction = {
			options: {
				getSubcommandGroup: jest.fn(),
				getSubcommand: jest.fn(),
				getString: jest.fn(),
				getBoolean: jest.fn(),
				getInteger: jest.fn(),
				getChannel: jest.fn()
			},
			member: mockMember,
			channelId: 'channel123',
			channel: mockChannel,
			user: { id: 'user123' },
			reply: jest.fn().mockResolvedValue(undefined),
			deferReply: jest.fn().mockResolvedValue(undefined),
			editReply: jest.fn().mockResolvedValue(undefined)
		} as any;

		// Mock services
		mockCampaignService = {
			getInstance: jest.fn().mockReturnThis(),
			getCampaignByChannel: jest.fn(),
			createCampaign: jest.fn(),
			listCampaigns: jest.fn(),
			updateCampaign: jest.fn(),
			linkChannels: jest.fn(),
			getCampaignByVoiceChannel: jest.fn()
		} as any;

		mockHelpService = {
			getInstance: jest.fn().mockReturnThis(),
			getRelevantHelp: jest.fn(),
			formatHelpContent: jest.fn().mockReturnValue('Help content')
		} as any;

		// Mock static methods
		(CampaignService.getInstance as jest.Mock).mockReturnValue(mockCampaignService);
		(HelpService.getInstance as jest.Mock).mockReturnValue(mockHelpService);

		// Mock campaign context and permissions
		(getCampaignContext as jest.Mock).mockReturnValue({
			member: mockMember,
			channelId: 'channel123'
		});
		(getCampaignPermissions as jest.Mock).mockResolvedValue({
			canManageCampaign: true,
			campaignId: 'campaign123'
		});
	});

	describe('command data', () => {
		it('should have correct command name and description', () => {
			expect(rpgCommand.data.name).toBe('rpg');
			expect(rpgCommand.data.description).toBe('RPG game management commands');
		});

		it('should have campaign subcommand group', () => {
			const campaignGroup = rpgCommand.data.options?.find(
				(opt: any) => opt.name === 'campaign'
			);
			expect(campaignGroup).toBeDefined();
			expect(campaignGroup?.type).toBe(2); // SubcommandGroup type
		});

		it('should have vector subcommand group', () => {
			const vectorGroup = rpgCommand.data.options?.find(
				(opt: any) => opt.name === 'vector'
			);
			expect(vectorGroup).toBeDefined();
			expect(vectorGroup?.type).toBe(2); // SubcommandGroup type
		});
	});

	describe('campaign create', () => {
		beforeEach(() => {
			(mockInteraction.options!.getSubcommandGroup as jest.Mock).mockReturnValue('campaign');
			(mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('create');
			(mockInteraction.options!.getString as jest.Mock)
				.mockImplementation((name: string) => {
					if (name === 'name') return 'Test Campaign';
					if (name === 'system') return 'dnd5e';
					if (name === 'help') return null;
					return null;
				});
		});

		it('should create a campaign successfully', async () => {
			mockCampaignService.getCampaignByChannel.mockResolvedValue(null);

			await rpgCommand.execute(mockInteraction as ChatInputCommandInteraction);

			expect(mockCampaignService.createCampaign).toHaveBeenCalledWith(
				mockChannel,
				'Test Campaign',
				SUPPORTED_SYSTEMS['dnd5e'],
				'user123'
			);
			expect(mockInteraction.reply).toHaveBeenCalledWith({
				content: expect.stringContaining('Campaign "Test Campaign" created successfully'),
				ephemeral: true
			});
		});

		it('should reject creation if campaign already exists in channel', async () => {
			mockCampaignService.getCampaignByChannel.mockResolvedValue({
				id: 'existing123',
				name: 'Existing Campaign'
			});

			await rpgCommand.execute(mockInteraction as ChatInputCommandInteraction);

			expect(mockCampaignService.createCampaign).not.toHaveBeenCalled();
			expect(mockInteraction.reply).toHaveBeenCalledWith({
				content: expect.stringContaining('There is already a campaign'),
				ephemeral: true
			});
		});

		it('should reject creation if user lacks permissions', async () => {
			(getCampaignPermissions as jest.Mock).mockResolvedValue({
				canManageCampaign: false,
				campaignId: null
			});

			await rpgCommand.execute(mockInteraction as ChatInputCommandInteraction);

			expect(mockInteraction.reply).toHaveBeenCalledWith({
				content: 'You do not have permission to create campaigns.',
				ephemeral: true
			});
		});

		it('should reject invalid system ID', async () => {
			(mockInteraction.options!.getString as jest.Mock)
				.mockImplementation((name: string) => {
					if (name === 'name') return 'Test Campaign';
					if (name === 'system') return 'invalid_system';
					if (name === 'help') return null;
					return null;
				});

			await rpgCommand.execute(mockInteraction as ChatInputCommandInteraction);

			expect(mockInteraction.reply).toHaveBeenCalledWith({
				content: expect.stringContaining('Invalid system ID'),
				ephemeral: true
			});
		});
	});

	describe('campaign list', () => {
		beforeEach(() => {
			(mockInteraction.options!.getSubcommandGroup as jest.Mock).mockReturnValue('campaign');
			(mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('list');
			(mockInteraction.options!.getString as jest.Mock).mockReturnValue(null);
		});

		it('should list campaigns successfully', async () => {
			const mockCampaigns = [
				{ name: 'Campaign 1', system: { name: 'D&D 5e' } },
				{ name: 'Campaign 2', system: { name: 'Pathfinder' } }
			];
			mockCampaignService.listCampaigns.mockResolvedValue(mockCampaigns as any);

			await rpgCommand.execute(mockInteraction as ChatInputCommandInteraction);

			expect(mockInteraction.reply).toHaveBeenCalledWith({
				content: expect.stringContaining('**Available Campaigns:**'),
				ephemeral: true
			});
		});

		it('should handle empty campaign list', async () => {
			mockCampaignService.listCampaigns.mockResolvedValue([]);

			await rpgCommand.execute(mockInteraction as ChatInputCommandInteraction);

			expect(mockInteraction.reply).toHaveBeenCalledWith({
				content: 'No campaigns found. Use `/rpg campaign create` to create one.',
				ephemeral: true
			});
		});
	});

	describe('help functionality', () => {
		beforeEach(() => {
			(mockInteraction.options!.getSubcommandGroup as jest.Mock).mockReturnValue('campaign');
			(mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('create');
			(mockInteraction.options!.getString as jest.Mock)
				.mockImplementation((name: string) => {
					if (name === 'help') return 'campaign create';
					return null;
				});
		});

		it('should show help when help option is provided', async () => {
			await rpgCommand.execute(mockInteraction as ChatInputCommandInteraction);

			expect(mockHelpService.getRelevantHelp).toHaveBeenCalledWith(
				'campaign create',
				true
			);
			expect(mockInteraction.reply).toHaveBeenCalledWith({
				content: 'Help content',
				ephemeral: true
			});
		});
	});

	describe('campaign requirement check', () => {
		beforeEach(() => {
			(mockInteraction.options!.getSubcommandGroup as jest.Mock).mockReturnValue('game');
			(mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('ask');
			(mockInteraction.options!.getString as jest.Mock).mockReturnValue(null);
		});

		it('should require active campaign for non-create/list commands', async () => {
			mockCampaignService.getCampaignByChannel.mockResolvedValue(null);

			await rpgCommand.execute(mockInteraction as ChatInputCommandInteraction);

			expect(mockInteraction.reply).toHaveBeenCalledWith({
				content: expect.stringContaining('This channel is not associated with any active campaign'),
				ephemeral: true
			});
		});
	});
});
