declare global {
	namespace NodeJS {
		interface ProcessEnv {
			STARBUNK_TOKEN: string;
			SNOWBUNK_TOKEN: string;
			CLIENT_ID: string;
			GUILD_ID: string;
			WEBHOOK_URL?: string;
			OPENAI_API_KEY: string;
		}
	}
}

export { };

