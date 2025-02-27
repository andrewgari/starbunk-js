/**
 * Pattern constants for various message patterns
 *
 * This contains regular expressions used by condition classes to match
 * specific patterns in Discord messages
 */
export const Patterns = {
	/** Matches any form of "blue" or variations like blu, bloo, azul etc */
	BLUE: /\b(blu|blue|bloo|azul|blau|bl(u+)|blew|blö|синий|青|ブルー|블루|כחול|नीला|蓝)\b/i,

	/** Matches various negative/mean words */
	BLUE_MEAN: /\b(fuck(ing)?|hate|die|kill|worst|mom|shit|murder|bots?)\b/i,

	/** Matches requests for blue bot to say something nice */
	BLUE_REQUEST: /blue?bot,? say something nice about/i,

	/** Matches acknowledgments to blue bot */
	BLUE_ACKNOWLEDGMENT: /\\b(blue?(bot)?)|(bot)|yes|no|yep|yeah|(i did)|(you got it)|(sure did)\b\b/i,

	/** Matches references to macaroni or pasta */
	MACARONI: /\b(mac(aroni)?|pasta)\b/i,

	/** Matches mentions of Venn as a standalone word */
	VENN_MENTION: /\bvenn\b/i,

	/** Matches the word "guy" as a standalone word */
	GUY_MENTION: /\bguys?\b/i,

	/** Matches any reference to "banana" */
	BANANA: /banana/i,

	/** Matches any reference to "gremlin" */
	GREMLIN: /gremlin/i,

	/** Matches references to "czech" as a standalone word */
	CZECH: /\bczech\b/i,

	/** Matches references to "check" as a standalone word (misspelling) */
	CHECK: /\bcheck\b/i,

	/** Matches references to "sheesh" as a standalone word */
	SHEESH: /\bsh(e)+sh\b/i,

	/** Matches references to "spider-man" or "spiderman" */
	SPIDER_MAN: /\bspider[-\s]?man\b/i,

	/** Matches references to "gundam" with possible misspellings */
	GUNDAM: /\b(g(u|a)ndam)\b/i,

	/** Matches references to "chaos" as a standalone word */
	CHAOS: /\bchaos\b/i,

	/** Matches references to "baby" as a standalone word */
	BABY: /\bbaby\b/i,

	/** Matches Discord music bot commands starting with !play */
	MUSIC_COMMAND: /^[!?]play\b/,

	/** Matches references to "ezio" or "assassin" */
	EZIO: /\bezio|h?assassin.*\b/i,

	/** Matches references to the number 69 or "sixty-nine" */
	NICE_NUMBER: /\b69|(sixty-?nine)\b/i,

	/** Matches references to "hold" as a standalone word */
	HOLD: /\bhold\b/i,

	/** Matches phrases praising Sig as the best or greatest */
	SIG_GREAT: /\bsig\s+(?:best|greatest)\b/i,

	/** Matches phrases expressing a negative attitude with "can't" */
	ATTITUDE: /(you|I|they|we) can'?t/mi,

	/** Matches "bluebot, say something nice about [name]" */
	BLUE_NICE_REQUEST: /blue?bot,? say something nice about (?<n>.+$)/i,

	/** Matches "bluebot, say something mean about [name]" */
	BLUE_VENN_REQUEST: /blue?bot,? say something mean about (?<n>.+$)/i,
};
