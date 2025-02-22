declare global {
	namespace NodeJS {
		interface ProcessEnv {
			STARBUNK_TOKEN: string;
			SNOWBUNK_TOKEN: string;
			CLIENT_ID: string;
			GUILD_ID: string;
		}
	}
}

export {};
