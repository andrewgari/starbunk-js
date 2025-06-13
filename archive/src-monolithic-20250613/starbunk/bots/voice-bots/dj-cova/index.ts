import { VoiceState } from 'discord.js';
import { getStarbunkClient } from '../../../../discord/getStarbunkClient';
import { VoiceBot } from '../../core/voice-bot-builder';

const djCovaBot: VoiceBot = {
	name: 'djCova',
	description: 'Music player bot for playing songs from YouTube',

	getVolume(): number {
		const client = getStarbunkClient();
		const djCova = client.getMusicPlayer();
		// Since DJCova uses 0-100 scale internally, we need to convert to 0-1 scale
		return djCova.getVolume() / 100;
	},

	setVolume(volume: number): void {
		const client = getStarbunkClient();
		const djCova = client.getMusicPlayer();
		// Convert from 0-1 scale to 0-100 scale
		djCova.changeVolume(volume * 100);
	},

	async onVoiceStateUpdate(_oldState: VoiceState, _newState: VoiceState): Promise<void> {
		// No special voice state handling needed for djCova
		return;
	}
};

export default djCovaBot;
