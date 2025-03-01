/**
 * BlueBot Responses
 *
 * Centralized collection of all responses used by BlueBot
 * Organizing these in one place makes them easier to maintain and update
 */

export const BLUEBOT_NAME = 'BlueBot';

// Avatar URLs
export const AVATAR_URLS = {
	DEFAULT: 'https://imgur.com/WcBRCWn.png',
	CHEEKY: 'https://i.imgur.com/dO4a59n.png',
	MURDER: 'https://imgur.com/Tpo8Ywd.jpg', // For Navy Seal copypasta
	MEAN: 'https://imgur.com/Tpo8Ywd.jpg', // For "mean about venn" response
};

// State persistence keys
export const STATE_KEYS = {
	TIMESTAMP: 'bluebot_last_initial_message_time',
	LAST_AVATAR: 'bluebot_last_avatar',
};

// Default responses
export const DEFAULT_RESPONSES = {
	INITIAL: "Did somebody say Blu",
	NICE_ABOUT_VENN: "No way, Venn can suck my blu cane",
};

// Nice response template
export const NICE_RESPONSE_TEMPLATE = "{name}, I think you're really blu! :wink:";

/**
 * Collection of cheeky responses for when someone mentions "blu" after the initial message
 */
export const CHEEKY_RESPONSES = [
	"Somebody definitely said blu!",
	"I HEARD THAT! Someone said BLU!",
	"Did I hear BLU? I definitely heard BLU!",
	"BLU! BLU! BLU! I knew I heard it!",
	"Oh my stars, was that a BLU I heard?!",
	"*excitedly* BLU! Someone said BLU!",
	"You can't hide it from me - I heard BLU!",
	"My blu-dar is going off the charts!",
	"That's right! Keep saying BLU!",
	"BLU is my favorite word and you just said it!",
	"*gasps dramatically* Was that... BLU?!",
	"I'm 100% certain someone mentioned BLU!",
	"The bluest of words has been spoken!",
	"My ears are perfectly tuned to detect BLU!",
	"BLU! BLU! The magical word has been uttered!",
	"*jumps up and down* BLU! BLU! BLU!",
	"Did you just say the B-word?! The BLU word?!",
	"My blu-senses are tingling!",
	"BLUUUUUUUUUUUUUUUUUUU!",
	"*falls out of chair* Someone said BLU again!",
	"The sacred word has been spoken: BLU!",
	"*puts on sunglasses* That's what I call a BLU moment",
	"Stop the presses! Someone said BLU!",
	"*does a little dance* B-L-U! B-L-U!",
	"Blu-tiful! Simply blu-tiful!",
	"*rings bell* ATTENTION EVERYONE! SOMEONE SAID BLU!",
	"I live for these blu moments!",
	"*pretends to faint* The power of BLU is overwhelming!",
	"That's the bluest thing I've heard all day!",
	"*nods vigorously* Yes! Yes! BLU! BLU!",
	"Once you go blu, you never go back!",
	"*points excitedly* I HEARD BLU! RIGHT THERE!",
	"The prophecy is true - someone said BLU!",
	"*adjusts bow tie* Did someone mention my favorite color?",
	"Blu-ming marvelous! Someone said it!",
	"*spins in circles* BLU! BLU! BLU! BLU!",
	"That's what I'm talking about! BLU!",
	"*raises eyebrows* Oh? Oh! BLU! BLU!",
	"Blu-per duper! You said the magic word!",
	"*throws confetti* CONGRATULATIONS! YOU SAID BLU!"
];

/**
 * Navy Seal copypasta for responding to mean messages from Venn
 */
export const NAVY_SEAL_RESPONSE = "What the fuck did you just fucking say about me, you little bitch? I'll have you know I graduated top of my class in the Academia d'Azul, and I've been involved in numerous secret raids on Western La Noscea, and I have over 300 confirmed kills. I've trained with gorillas in warfare and I'm the top bombardier in the entire Eorzean Alliance. You are nothing to me but just another target. I will wipe you the fuck out with precision the likes of which has never been seen before on this Shard, mark my fucking words. You think you can get away with saying that shit to me over the Internet? Think again, fucker. As we speak I am contacting my secret network of tonberries across Eorzea and your IP is being traced right now so you better prepare for the storm, macaroni boy. The storm that wipes out the pathetic little thing you call your life. You're fucking dead, kid. I can be anywhere, anytime, and I can kill you in over seven hundred ways, and that's just with my bear-hands. Not only am I extensively trained in unarmed combat, but I have access to the entire arsenal of the Eorzean Blue Brigade and I will use it to its full extent to wipe your miserable ass off the face of the continent, you little shit. If only you could have known what unholy retribution your little \"clever\" comment was about to bring down upon you, maybe you would have held your fucking tongue. But you couldn't, you didn't, and now you're paying the price, you goddamn idiot. I will fucking cook you like the little macaroni boy you are. You're fucking dead, kiddo.";
