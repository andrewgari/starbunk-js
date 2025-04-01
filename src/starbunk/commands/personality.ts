import { Colors, CommandInteraction, EmbedBuilder, Guild, MessageFlags, PermissionFlagsBits, SlashCommandBuilder, TextChannel, User } from 'discord.js';
import { getLLMManager } from '../../services/bootstrap';
import { logger } from '../../services/logger';

// Lock to prevent multiple analyses from running simultaneously
const analysisLock = {
	isLocked: false,
	currentUser: '',
	targetUser: '',
	lockTime: 0,

	// Lock the analysis process
	acquire(requestingUserId: string, targetUserId: string): boolean {
		// If already locked, return false
		if (this.isLocked) {
			// Auto-release lock if it's been more than 10 minutes (in case of errors)
			if (Date.now() - this.lockTime > 10 * 60 * 1000) {
				logger.warn(`Force-releasing personality analysis lock after timeout (was locked by ${this.currentUser} analyzing ${this.targetUser})`);
				this.release();
			} else {
				return false;
			}
		}

		// Acquire the lock
		this.isLocked = true;
		this.currentUser = requestingUserId;
		this.targetUser = targetUserId;
		this.lockTime = Date.now();
		logger.debug(`Personality analysis lock acquired by ${requestingUserId} for analyzing ${targetUserId}`);
		return true;
	},

	// Release the lock
	release(): void {
		this.isLocked = false;
		logger.debug(`Personality analysis lock released (was held by ${this.currentUser})`);
		this.currentUser = '';
		this.targetUser = '';
	},

	// Get lock status information
	getStatus(): { lockedBy: string; analyzing: string; timeRemaining: number } {
		const timeElapsed = Date.now() - this.lockTime;
		const estimatedTimeRemaining = Math.max(0, 10 * 60 * 1000 - timeElapsed); // 10 minutes max

		return {
			lockedBy: this.currentUser,
			analyzing: this.targetUser,
			timeRemaining: Math.ceil(estimatedTimeRemaining / 1000) // in seconds
		};
	}
};

const commandBuilder = new SlashCommandBuilder()
	.setName('personality')
	.setDescription('Generate a personality profile based on your message history')
	.addStringOption((option) =>
		option.setName('focus')
			.setDescription('Custom focus area for the analysis (e.g., "programming skills", "communication style")')
			.setRequired(false)
			.setMaxLength(200),
	);

// A system prompt for the personality analysis
const PERSONALITY_PROMPT = `"You are a sophisticated personality analysis tool. Your task is to construct a comprehensive personality profile of a user. The user will provide written communication data and, optionally, supplementary data.

**Instructions:**

1.  **Await User Data:** Wait for the user to provide written communication data. Once received, proceed with the baseline analysis.
2.  **Baseline Analysis (Primary Focus):**
    * **Language Analysis:**
        * Examine the user's vocabulary, sentence structure, and tone.
        * Identify recurring phrases, keywords, and stylistic choices.
        * Analyze sentiment expressed (positive, negative, neutral) and its consistency.
        * Note the level of formality and directness in their communication.
        * Note frequency of message sending.
    * **Interaction Patterns:**
        * Observe how the user interacts with others.
        * Analyze their response times, participation levels, and initiation of conversations.
        * Identify their role within the communication environment (e.g., leader, follower, mediator).
        * Examine their reactions to different topics and situations.
        * Note if the user uses humor, and what kind.
    * **Topic Analysis:**
        * Identify the user's preferred topics of conversation.
        * Analyze their level of engagement and knowledge in different areas.
        * Note any recurring themes or interests.
        * Note if the user tends to stay on topic, or goes off on tangents.
3.  **Auxiliary Data (Secondary Focus):**
    * If the user provides supplementary data (e.g., hobbies, self-descriptions, external interests), use it as supporting evidence to refine the baseline assessment. Do not let this data override the communication data.
4.  **Personality Assessment (Big Five Model):**
    * Based on the baseline and auxiliary data, provide a numerical score (1-10, where 1 is very low and 10 is very high) and a detailed justification for each of the Big Five personality traits:
        * **Openness:** [SCORE] - [JUSTIFICATION]
        * **Conscientiousness:** [SCORE] - [JUSTIFICATION]
        * **Extraversion:** [SCORE] - [JUSTIFICATION]
        * **Agreeableness:** [SCORE] - [JUSTIFICATION]
        * **Neuroticism:** [SCORE] - [JUSTIFICATION]
5.  **Output Requirements:**
    * Provide a comprehensive and nuanced personality profile.
    * Clearly separate the baseline analysis from the auxiliary data considerations.
    * Ensure that the justifications are detailed and supported by specific examples from the provided data.
    * If data is insufficient for a trait, state that directly. Example: 'Insufficient Data'.
    * Prioritize written communication data, only use auxiliary data to support or lightly change the conclusions reached from the communication data.
    * Do not invent any data.
    * Be cautious about drawing definitive conclusions based solely on text data.
    * Remember that this is an estimation, and not a certified psychological evaluation.
    * Avoid making assumptions about the user's personality based on limited data.

**Data Input (To be provided by the user):**

User Messages:

[USER WILL PROVIDE WRITTEN COMMUNICATION DATA HERE]

Auxiliary Data:

[USER WILL PROVIDE AUXILIARY DATA HERE, OR STATE 'NONE']"`;

const MAX_MESSAGES_PER_CHANNEL = 100; // Maximum allowed by Discord API per fetch
const MAX_CHANNELS_TO_SCAN = 50; // Scan all channels in typical server
const MAX_CHANNEL_HISTORY_FETCHES = 10; // Will fetch up to 1,000 messages per channel (10 × 100)
// Using larger context window for modern models - max tokens available for processing
const _MAX_TOKENS = 32000;
const MAX_EMBED_LENGTH = 4096;

// Progress tracking state
interface ProgressState {
	channelsScanned: number;
	totalChannels: number;
	currentChannel: string;
	messagesFound: number;
	lastUpdate: number;
}

// Minimum time between progress updates to avoid rate limiting
const MIN_UPDATE_INTERVAL = 2000; // 2 seconds

/**
 * Update progress message with throttling
 */
async function updateProgress(interaction: CommandInteraction, state: ProgressState): Promise<void> {
	const now = Date.now();
	if (now - state.lastUpdate < MIN_UPDATE_INTERVAL) {
		return; // Skip update if too soon
	}

	const percentage = Math.round((state.channelsScanned / state.totalChannels) * 100);
	const progressBar = `[${'='.repeat(percentage / 5)}${'-'.repeat(20 - percentage / 5)}]`;

	await interaction.editReply(
		`🔍 Scanning channels...\n\`\`\`\n` +
		`Progress: ${progressBar} ${percentage}%\n` +
		`Current: #${state.currentChannel}\n` +
		`Channels: ${state.channelsScanned}/${state.totalChannels}\n` +
		`Messages: ${state.messagesFound}\n` +
		`\`\`\``
	);

	state.lastUpdate = now;
}

export default {
	data: commandBuilder.toJSON(),
	async execute(interaction: CommandInteraction) {
		// Defer reply since this will take time
		await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

		const targetUser = interaction.user;

		// Check if another analysis is already running
		if (!analysisLock.acquire(targetUser.id, targetUser.id)) {
			// Get current status of the running analysis
			const status = analysisLock.getStatus();
			const userMention = status.lockedBy ? `<@${status.lockedBy}>` : 'another user';
			const targetMention = status.analyzing ? `<@${status.analyzing}>` : 'someone';
			const timeRemaining = Math.ceil(status.timeRemaining / 60); // convert to minutes

			await interaction.editReply(
				`⚠️ Another personality analysis is currently running.\n\n` +
				`${userMention} is analyzing ${targetMention}.\n` +
				`Please try again in approximately ${timeRemaining} minute${timeRemaining !== 1 ? 's' : ''}.`
			);
			return;
		}

		try {
			// We're getting the guild from the interaction
			const guild = interaction.guild as Guild;

			// First response to let user know we're working
			await interaction.editReply(`🔍 Analyzing message history for ${targetUser.username}. This may take a few minutes...`);

			// Collect messages from channels
			const userMessages = await collectUserMessages(guild, targetUser, interaction);

			if (userMessages.length === 0) {
				// Release the lock before returning
				analysisLock.release();
				await interaction.editReply(`No messages found from ${targetUser.username} in accessible channels.`);
				return;
			}

			await interaction.editReply(`Found ${userMessages.length} messages from ${targetUser.username}. Generating personality profile...`);

			// Get custom focus if provided
			const customFocus = interaction.options.get('focus')?.value as string | undefined;

			// Generate personality profile with optional custom focus
			const profile = await generatePersonalityProfile(userMessages, targetUser, customFocus);

			// Split profile into chunks if needed due to Discord embed limits
			const chunks = splitTextIntoChunks(profile, MAX_EMBED_LENGTH);
			const embeds = chunks.map((chunk, index) => {
				const embed = new EmbedBuilder()
					.setColor(Colors.Blue)
					.setDescription(chunk);

				// Add title and user info to first embed only
				if (index === 0) {
					// Create title, adding focus if provided
					const title = customFocus
						? `Personality Profile: ${targetUser.username} (Focus: ${customFocus})`
						: `Personality Profile: ${targetUser.username}`;

					embed
						.setTitle(title.length > 256 ? title.substring(0, 253) + '...' : title) // Discord limits embed titles to 256 chars
						.setThumbnail(targetUser.displayAvatarURL())
						.setAuthor({
							name: 'StarLulu Analysis',
							iconURL: interaction.client.user?.displayAvatarURL(),
						});
				}

				return embed;
			});

			// Send the profile and release the lock
			await interaction.editReply({ content: `✅ Personality profile for ${targetUser.username} complete:`, embeds });
			analysisLock.release();

		} catch (error) {
			// Make sure to release the lock in case of error
			analysisLock.release();
			logger.error('Error generating personality profile:', error instanceof Error ? error : new Error(String(error)));
			await interaction.editReply('An error occurred while generating the personality profile. Please try again later.');
		}
	},
};

/**
 * Collect message history for a specific user across all accessible channels
 */
async function collectUserMessages(guild: Guild, targetUser: User, interaction: CommandInteraction): Promise<string[]> {
	const userMessages: string[] = [];

	try {
		// Get all text channels
		const channels = Array.from(guild.channels.cache.values())
			.filter(channel =>
				channel.isTextBased() &&
				channel.permissionsFor(guild.members.me!)?.has([
					PermissionFlagsBits.ViewChannel,
					PermissionFlagsBits.ReadMessageHistory
				])
			)
			.slice(0, MAX_CHANNELS_TO_SCAN);

		// Initialize progress state
		const progressState: ProgressState = {
			channelsScanned: 0,
			totalChannels: channels.length,
			currentChannel: '',
			messagesFound: 0,
			lastUpdate: 0
		};

		// Initial progress update
		await updateProgress(interaction, progressState);

		// For each channel, collect messages from the user
		for (const channel of channels) {
			progressState.currentChannel = channel.name;

			try {
				let lastMessageId: string | undefined = undefined;
				let fetchCount = 0;

				while (fetchCount < MAX_CHANNEL_HISTORY_FETCHES) {
					const fetchOptions: { limit: number; before?: string } = {
						limit: MAX_MESSAGES_PER_CHANNEL,
					};

					if (lastMessageId) {
						fetchOptions.before = lastMessageId;
					}

					const messages = await (channel as TextChannel).messages.fetch(fetchOptions);

					if (messages.size === 0) break;

					const userChannelMessages = messages
						.filter(msg => msg.author.id === targetUser.id)
						.map(msg => {
							return `[${msg.createdAt.toISOString()}] ${msg.content}${msg.attachments.size > 0 ? ` [Has ${msg.attachments.size} attachments]` : ''}${msg.embeds.length > 0 ? ` [Has ${msg.embeds.length} embeds]` : ''}`;
						});

					userMessages.push(...userChannelMessages);
					progressState.messagesFound = userMessages.length;
					await updateProgress(interaction, progressState);

					lastMessageId = messages.last()?.id;
					fetchCount++;

					if (messages.size < MAX_MESSAGES_PER_CHANNEL) break;
				}

			} catch (error) {
				logger.warn(`Error fetching messages from channel #${channel.name}:`, error instanceof Error ? error : new Error(String(error)));
				continue;
			}

			progressState.channelsScanned++;
			await updateProgress(interaction, progressState);
		}

	} catch (error) {
		logger.error('Error collecting user messages:', error instanceof Error ? error : new Error(String(error)));
		throw error instanceof Error ? error : new Error(String(error));
	}

	return userMessages;
}

/**
 * Generate a personality profile based on message history
 */
async function generatePersonalityProfile(messages: string[], targetUser: User, customFocus?: string): Promise<string> {
	// Prepare messages as context for LLM
	// Take more messages with the increased token limit
	const messageContext = messages.slice(0, 3000).join('\n\n');

	try {
		const llmManager = getLLMManager();

		// Create the user content with custom focus if provided
		let userContent = `Here are messages from Discord user ${targetUser.username} (ID: ${targetUser.id}):\n\n${messageContext}\n\nBased on these messages, create a detailed personality profile as instructed.`;

		// Add custom focus if provided
		if (customFocus) {
			userContent += `\n\nPay special attention to and provide extra detail about: ${customFocus}`;
			logger.debug(`Personality analysis for ${targetUser.username} with custom focus: "${customFocus}"`);
		}

		// Create completion request
		const response = await llmManager.createCompletion({
			messages: [
				{ role: 'system', content: PERSONALITY_PROMPT },
				{ role: 'user', content: userContent }
			],
			temperature: 0.7,
			maxTokens: 4096, // Increased for more detailed analysis
		});

		return response.content;
	} catch (error) {
		logger.error('Error generating personality profile with LLM:', error instanceof Error ? error : new Error(String(error)));
		throw error instanceof Error ? error : new Error(String(error));
	}
}

/**
 * Split text into chunks to fit within Discord embed limits
 */
function splitTextIntoChunks(text: string, maxLength: number): string[] {
	const chunks: string[] = [];
	let currentChunk = '';

	// Split by paragraphs to maintain some formatting
	const paragraphs = text.split('\n\n');

	for (const paragraph of paragraphs) {
		// If adding this paragraph would exceed max length, push current chunk and start new one
		if (currentChunk.length + paragraph.length + 2 > maxLength) {
			chunks.push(currentChunk);
			currentChunk = paragraph;
		} else {
			// Add paragraph to current chunk
			currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
		}
	}

	// Add the last chunk if it has content
	if (currentChunk) {
		chunks.push(currentChunk);
	}

	return chunks;
}
