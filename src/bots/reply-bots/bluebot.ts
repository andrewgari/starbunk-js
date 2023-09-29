import { Client, Events, Message, TextChannel } from "discord.js";
import { ReplyBot } from "./ReplyBot";

export class BlueBot extends ReplyBot {
    private botName: string = 'BluBot';

    private readonly defaultAvatarURL = 'https://imgur.com/WcBRCWn.png';
    private readonly murderAvatar = "https://imgur.com/Tpo8Ywd.jpg"
	private readonly cheekyAvatar = "https://i.imgur.com/dO4a59n.png"
    private avatarUrl: string = this.defaultAvatarURL;

    private readonly defaultPattern = /\bblue?\b/

    private readonly defaultResponse = "Did somebody say Blu? For Real!? Im so excited."
	private readonly cheekyResponse  = "Lol, Somebody definitely said Blu! :smile:"
	private readonly friendlyResponse = "%s, I think you're pretty Blu! :wink:"
	private readonly contemptResponse = "No way, Venn can suck my blu cane. :unamused:"
	private readonly murderResponse = "What the fuck did you just fucking say about me, you little bitch? I'll have you know I graduated top of my class in the Academia d'Azul, and I've been involved in numerous secret raids on Western La Noscea, and I have over 300 confirmed kills. I've trained with gorillas in warfare and I'm the top bombardier in the entire Eorzean Alliance. You are nothing to me but just another target. I will wipe you the fuck out with precision the likes of which has never been seen before on this Shard, mark my fucking words. You think you can get away with saying that shit to me over the Internet? Think again, fucker. As we speak I am contacting my secret network of tonberries across Eorzea and your IP is being traced right now so you better prepare for the storm, macaroni boy. The storm that wipes out the pathetic little thing you call your life. You're fucking dead, kid. I can be anywhere, anytime, and I can kill you in over seven hundred ways, and that's just with my bear-hands. Not only am I extensively trained in unarmed combat, but I have access to the entire arsenal of the Eorzean Blue Brigade and I will use it to its full extent to wipe your miserable ass off the face of the continent, you little shit. If only you could have known what unholy retribution your little \"clever\" comment was about to bring down upon you, maybe you would have held your fucking tongue. But you couldn't, you didn't, and now you're paying the price, you goddamn idiot. I will fucking cook you like the little macaroni boy you are. You're fucking dead, kiddo."

    getBotName(): string {
        return this.botName;
    }

    setBotName(name: string): void {
        this.botName = name;
    }

    getAvatarUrl(): string {
        return this.avatarUrl;
    }

    setAvatarUrl(url: string): void {
        this.avatarUrl = url;
    }

    handleMessage(message: Message<boolean>): void {
        console.log(message.content)
        if (message.content.match(this.defaultPattern)) {
            this.sendReply(message.channel as TextChannel, this.defaultResponse);
        }
    }
}

const bluebot = (client: Client): BlueBot => {
    return new BlueBot(client);
}

export default bluebot;