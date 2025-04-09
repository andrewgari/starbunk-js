// Import all bots
// Each bot is created using the BotFactory in its own module
// This allows for consistent bot creation and configuration
import attitudeBot from './attitude-bot';
import babyBot from './baby-bot';
import bananaBot from './banana-bot';
import blueBot from './blue-bot';
import botBot from './bot-bot';
import chadBot from './chad-bot';
import chaosBot from './chaos-bot';
import checkBot from './check-bot';
import covaBot from './cova-bot';
import ezioBot from './ezio-bot';
import gundamBot from './gundam-bot';
import guyBot from './guy-bot';
import holdBot from './hold-bot';
import homonymBot from './homonym-bot';
import interruptBot from './interrupt-bot';
import macaroniBot from './macaroni-bot';
import musicCorrectBot from './music-correct-bot';
import niceBot from './nice-bot';
import pickleBot from './pickle-bot';
import sheeshBot from './sheesh-bot';
import sigGreatBot from './sig-great-bot';
import spiderBot from './spider-bot';
import vennBot from './venn-bot';

// Export all bots
// These bots are created using the Factory Pattern via BotFactory
export const replyBots = [
	attitudeBot,
	babyBot,
	bananaBot,
	blueBot,
	botBot,
	chadBot,
	chaosBot,
	checkBot,
	covaBot,
	ezioBot,
	gundamBot,
	guyBot,
	holdBot,
	homonymBot,
	interruptBot,
	macaroniBot,
	musicCorrectBot,
	niceBot,
	pickleBot,
	sheeshBot,
	sigGreatBot,
	spiderBot,
	vennBot,
];

export default replyBots;
