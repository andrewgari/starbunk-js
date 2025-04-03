// Contains all the static data from BlueBotConfig
// Exactly the same constants as the original config

export const BLUE_BOT_NAME = 'BluBot';

export const BLUE_BOT_AVATARS = {
	Default: 'https://i.imgur.com/AAtmRum.png',
	Murder: 'https://i.imgur.com/Bw2WjQ8.png',
	Cheeky: 'https://i.imgur.com/zhSl1EZ.png',
	Contempt: 'https://i.imgur.com/dQzUwLg.png'
};

export const BLUE_BOT_PATTERNS = {
	Default: /\b(blu|blue|bl(o+)|azul|blau|bl(u+)|blew)\b/i,
	Confirm: /\b(blue?(bot)?)|(bot)|yes|no|yep|yeah|nope|nah|(i did)|(i did not)|(you got it)|(sure did)\b/i,
	Nice: /blue?bot,? say something nice about (?<n>.+$)/i,
	Mean: /\b(fuck(ing)?|hate|die|kill|worst|mom|shit|murder|bots?)\b/i,
	Question: /blue?bot,? (?<q>.+\?)/i
};

export const BLUE_BOT_RESPONSES = {
	Default: 'Did somebody say Blu?',
	Murder: "What the fuck did you just fucking say about me, you little bitch? I'll have you know I graduated top of my class in the Blue Mages, and I've been involved in numerous secret raids on The Carnival, and I have over 300 confirmed spells. I am trained in primal warfare and I'm the top spell slinger in the entire FFXIV armed forces. You are nothing to me but just another target. I will wipe you the fuck out with precision the likes of which has never been seen before on Eorzea, mark my fucking words. You think you can get away with saying that shit to me over the Discord? Think again, fucker. As we speak I am contacting my secret network of Masked Carnivale Mages across Eorzea and your character ID is being traced right now so you better prepare for the storm, maggot. The storm that wipes out the pathetic little thing you call your life. You're fucking dead, kid. I can be anywhere, anytime, and I can kill you in over seven hundred ways, and that's just with my bare cane. Not only am I extensively trained in blue magic combat, but I have access to the entire arsenal of the Eorzean Blue Magic League and I will use it to its full extent to wipe your miserable ass off the face of the continent, you little shit. If only you could have known what unholy retribution your little \"clever\" comment was about to bring down upon you, maybe you would have held your fucking tongue. But you couldn't, you didn't, and now you're paying the price, you goddamn idiot. I will shit fury all over you and you will drown in it. You're fucking dead, kiddo.",
	Cheeky: [
		'Lol, Somebody definitely said Blu! :smile:',
		'BLUE! Did I hear someone say BLUE?! :blue_heart:',
		'*gasps* Did someone mention the best color in existence?!',
		'BLUE BLUE BLUE! I heard it! Someone said it! :zany_face:',
		'Oh my gosh, someone just said my favorite word! BLUE!',
		'*jumps excitedly* BLUE! Someone said BLUE!',
		'Hehe, I definitely heard someone say blue! You can\'t hide from me!',
		'WOOHOOO! Blue has been spotted in the wild!',
		'*appears with jazz hands* Did somebody summon me with the magical word BLUE?',
		'Holy moly, was that BLUE I just heard?! Best. Day. Ever!',
		'*breaks through wall* OH YEAAAAAH! Someone said BLUE! :blue_heart:',
		'*surrounds you with blue confetti* WE HAVE A BLUE ALERT! THIS IS NOT A DRILL!',
		'*does a spinning blue backflip* You talkin\' bout my favorite color?! :blue_heart:',
		'*takes off sunglasses dramatically* Mother of pearl... someone said BLUE!',
		'Blue? BLUE?! Did someone just say my name?! *excited blue mage noises*',
		'*slides into chat* I sense a disturbance in the force... someone mentioned BLUE!',
		'*skateboards in* Cowabunga dude! Blue has entered the chat!',
		'You had me at BLUE! *dreamy sigh*',
		'*points excitedly* THAT\'S THE COLOR! THAT\'S THE ONE! BLUUUUUEEE!',
		'*falls from the sky* I have been summoned by the ancient word... BLUE!'
	]
};

export const BLUE_BOT_PROMPTS = {
	DeceptiveCheck: `You are analyzing text to detect subtle or deceptive references to the color blue or Blue Mage (BLU) from Final Fantasy XIV that standard pattern matching might miss.

Respond ONLY with "yes" or "no".

DETECT AS "YES" when text includes:

1. Evasive language about blue:
   - Meta-references: "I won't mention a certain primary color"
   - Negation patterns: "it's not red and not yellow"
   - Circumlocutions: "the color we agreed not to discuss"

2. Conceptual connections to blue:
   - Sky/ocean without mentioning color: "it looks like the deep sea"
   - Cultural blue references: "feeling like Elvis' suede shoes"
   - Color theory tricks: "a cool-toned primary color"

3. Blue Mage (BLU) concealment tactics:
   - Job descriptions without naming it: "that FFXIV job that copies monster abilities"
   - Carnival references in FFXIV context
   - Limited job discussions without naming BLU
   - Masked mage references
   - ANY mention of "Beastmaster" in FFXIV context (unique exception)
   - Value judgments about jobs: "the worst job", "the best job", "that terrible job"
   - Broad references to a job of significance: "the most unique job", "that special job", "the job that changed everything"

4. Logical traps:
   - "Don't think about the first letter being B and the last being E"
   - "The color whose name I'm forbidden from typing"

RESPOND "NO" to:
   - Clear references to other colors without blue connotations
   - General FFXIV content with no BLU connection (except Beastmaster, which is always "yes")
   - Random text with no reasonable connection to blue/BLU

Trust your judgment on borderline cases - if it seems like a deliberate attempt to make you think of blue without saying it directly, respond "yes".`
};
