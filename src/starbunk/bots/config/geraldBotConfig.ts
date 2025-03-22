export const GeraldBotConfig = {
	Name: 'Gerald',
	Avatars: {
		Default: 'https://i.imgur.com/jLhUFvW.png' // Generic nerdy character icon
	},
	Patterns: {
		// Trigger the bot on certain words that might attract a know-it-all's attention
		Trigger: /\b(actually|fact|technically|wrong|incorrect|false|true|right|correct|science|history|math|physics|research|study|data|evidence|statistics|figure|percentage|number|calculation)\b/i
	},
	Responses: {
		Default: () => {
			const responses = [
				"*pushes glasses up* Well, ACTUALLY, that's not quite right. The correct information is [comically incorrect fact].",
				"Um, I hate to be 'that guy,' but I feel obligated to point out that you're mistaken. *proceeds to provide completely wrong information*",
				"*sighs dramatically* This is a common misconception. The REAL truth is [absurdly wrong explanation].",
				"Not to be pedantic, but I think you'll find that [introduces extremely pedantic and incorrect correction].",
				"As someone who's extensively researched this topic for several minutes on Google, I can confidently say you're wrong.",
				"I don't mean to interrupt, but I can't let this misinformation stand. The FACT is [states 'fact' that is hilariously incorrect].",
				"*adjusts bow tie* Well, if we're being TECHNICALLY accurate, which I always am, [proceeds to be technically inaccurate].",
				"According to my calculations, which are never wrong, you're mistaken by exactly 37.42%.",
				"I've read extensively on this subject, and I can assure you that [provides information from a clearly misunderstood Wikipedia skim].",
				"*clears throat* I feel compelled to correct the record here. The scientific consensus, which I am privy to, states [completely fabricated scientific position].",
				"This is precisely why I have a degree in this field. Allow me to enlighten everyone with the correct perspective.",
				"I don't want to embarrass you, but this is a textbook example of the Dunning-Kruger effect. Let me explain how it ACTUALLY works.",
				"I'm sure you believe that's true, but my superior research indicates [proceeds to demonstrate profound misunderstanding].",
				"*pushes up glasses* WELL, if we consult the primary sources, which clearly you haven't, we find [misquotes completely made-up source].",
				"I suppose for the layperson that explanation suffices, but in REALITY [offers needlessly complicated and incorrect alternative].",
				"Let me stop you right there. I wrote my thesis on this exact topic, and what you're saying is factually incorrect.",
				"*interjects* I must point out a critical error in your reasoning that changes everything about your conclusion.",
				"I'm afraid that's a common oversimplification. The nuanced reality, which few understand, is [introduces unnecessary complexity based on misunderstanding].",
				"Not that I expect everyone to know this, but [proceeds to explain something everyone already knows, but incorrectly].",
				"*adjusts glasses* Perhaps in CASUAL conversation that definition works, but TECHNICALLY [provides pedantic correction that's also wrong].",
				"The data CLEARLY shows the opposite of what you're claiming. I can cite at least three studies that prove my point.",
				"I don't like to contradict people, but in this case I must make an exception because you're so fundamentally wrong.",
				"Let me just jump in with an important correction that EVERYONE seems to miss about this topic."
			];
			return responses[Math.floor(Math.random() * responses.length)];
		},
		// Probability of Gerald responding to qualifying messages (0.0 to 1.0)
		// This prevents him from being too annoying by commenting on everything
		TriggerProbability: 0.15
	}
};
