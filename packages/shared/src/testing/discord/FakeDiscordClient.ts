import { EventEmitter } from 'events';
import { Events, Message, User, Guild, TextChannel, Collection } from 'discord.js';

/**
 * Fake Discord Client for testing
 * Mimics the discord.js Client interface without actually connecting to Discord
 */
export class FakeDiscordClient extends EventEmitter {
	public user: User | null = null;
	public users: Collection<string, User> = new Collection();
	public guilds: Collection<string, Guild> = new Collection();
	public channels: Collection<string, TextChannel> = new Collection();
	private _isReady = false;

	constructor() {
		super();
	}

	/**
	 * Simulates the login process
	 * @param token - Discord bot token (ignored in fake client)
	 */
	async login(token: string): Promise<string> {
		// Simulate async login
		await new Promise((resolve) => setTimeout(resolve, 10));

		// Set the bot user
		this.user = this.createFakeUser('fake-bot-id', 'FakeBot', true);
		this.users.set(this.user.id, this.user);

		// Mark as ready
		this._isReady = true;

		// Emit ClientReady event
		setImmediate(() => {
			this.emit(Events.ClientReady, this);
		});

		return token;
	}

	/**
	 * Check if client is ready
	 */
	get isReady(): boolean {
		return this._isReady;
	}

	/**
	 * Simulate receiving a message from Discord
	 * This triggers the MessageCreate event
	 * Errors thrown in event handlers are caught and emitted as Error events
	 */
	simulateMessage(message: Message): void {
		// Get all listeners for MessageCreate
		const listeners = this.listeners(Events.MessageCreate);

		// Call each listener and catch any errors (both sync and async)
		for (const listener of listeners) {
			try {
				// Call the listener as a function
				const result = (listener as (...args: unknown[]) => unknown)(message);

				// If the result is a promise, catch async errors
				if (result && typeof result === 'object' && 'catch' in result) {
					(result as Promise<unknown>).catch((error) => {
						setImmediate(() => {
							this.emit(Events.Error, error);
						});
					});
				}
			} catch (error) {
				// Emit error event if listener throws synchronously
				setImmediate(() => {
					this.emit(Events.Error, error);
				});
			}
		}
	}

	/**
	 * Simulate an error
	 */
	simulateError(error: Error): void {
		this.emit(Events.Error, error);
	}

	/**
	 * Simulate a warning
	 */
	simulateWarning(warning: string): void {
		this.emit(Events.Warn, warning);
	}

	/**
	 * Create a fake user
	 */
	createFakeUser(id: string, username: string, bot: boolean = false): User {
		const user = {
			id,
			username,
			bot,
			discriminator: '0000',
			avatar: null,
			displayName: username,
			tag: `${username}#0000`,
			createdTimestamp: Date.now(),
			defaultAvatarURL: `https://cdn.discordapp.com/embed/avatars/0.png`,
			displayAvatarURL: () => `https://cdn.discordapp.com/avatars/${id}/avatar.png`,
			toString: () => `<@${id}>`,
		} as unknown as User;

		this.users.set(id, user);
		return user;
	}

	/**
	 * Create a fake guild
	 */
	createFakeGuild(id: string, name: string): Guild {
		const guild = {
			id,
			name,
			channels: new Collection(),
			members: new Collection(),
			roles: new Collection(),
		} as unknown as Guild;

		this.guilds.set(id, guild);
		return guild;
	}

	/**
	 * Create a fake text channel
	 */
	createFakeTextChannel(id: string, name: string, guild: Guild): TextChannel {
		const channel = {
			id,
			name,
			type: 0, // GUILD_TEXT
			guild,
			// Simple async no-op implementation instead of Jest mock
			send: async (..._args: unknown[]): Promise<void> => {
				return;
			},
			// Return an empty collection of webhooks
			fetchWebhooks: async (): Promise<Collection<unknown, unknown>> => {
				return new Collection();
			},
			// Create a basic fake webhook object with an async no-op send
			createWebhook: async (
				_options?: unknown,
			): Promise<{
				id: string;
				name: string;
				send: (...args: unknown[]) => Promise<void>;
			}> => {
				return {
					id: `webhook-${id}`,
					name: `Webhook for ${name}`,
					send: async (..._args: unknown[]): Promise<void> => {
						return;
					},
				};
			},
		} as unknown as TextChannel;

		this.channels.set(id, channel);
		return channel;
	}

	/**
	 * Destroy the client (cleanup)
	 */
	async destroy(): Promise<void> {
		this._isReady = false;
		this.removeAllListeners();
		this.users.clear();
		this.guilds.clear();
		this.channels.clear();
	}
}
