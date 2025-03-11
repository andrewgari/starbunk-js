export interface MessageInfo {
	content?: string;
	username?: string;
	avatarURL?: string;
	embeds?: Array<{
		title?: string;
		description?: string;
		color?: number;
		fields?: Array<{
			name: string;
			value: string;
			inline?: boolean;
		}>;
		footer?: {
			text: string;
			icon_url?: string;
		};
		thumbnail?: {
			url: string;
		};
		image?: {
			url: string;
		};
	}>;
}
