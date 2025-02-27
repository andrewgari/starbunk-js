/**
 * Pattern constants for various message patterns
 *
 * This contains regular expressions used by condition classes to match
 * specific patterns in Discord messages
 */
export const Patterns = {
	// ===== BLUEBOT RELATED PATTERNS =====

	/** Matches various negative/mean words */
	BLUEBOT_MEAN_WORDS: /\b(fuck(ing)?|hate|die|kill|worst|mom|shit|murder|bots?)\b/i,

	/** Matches requests for blue bot to say something nice */
	BLUEBOT_NICE_REQUEST_GENERIC: /blue?bot,? say something nice about/i,

	/** Matches "bluebot, say something nice about [name]" */
	BLUEBOT_NICE_REQUEST_NAMED: /blue?bot,? say something nice about (?<n>.+$)/i,

	/** Matches "bluebot, say something mean about [name]" */
	BLUEBOT_MEAN_REQUEST_NAMED: /blue?bot,? say something mean about (?<n>.+$)/i,

	/** Matches acknowledgments to blue bot */
	BLUEBOT_ACKNOWLEDGMENT: /\b(blue?(bot)?)|(bot)|yes|no|yep|yeah|(i did)|(you got it)|(sure did)\b/i,

	// ===== WORD MENTION PATTERNS =====

	/** Matches any form of "blue" or variations like blu, bloo, azul etc */
	WORD_BLUE: /\b(blu|blue|bloo|azul|blau|bl(u+)|blew|blö|синий|青|ブルー|블루|כחול|नीला|蓝)\b/i,

	/** Matches references to macaroni or pasta */
	WORD_MACARONI: /\b(mac(aroni)?|pasta)\b/i,

	/** Matches mentions of Venn as a standalone word */
	WORD_VENN: /\bvenn\b/i,

	/** Matches the word "guy" as a standalone word */
	WORD_GUY: /\bguys?\b/i,

	/** Matches any reference to "banana" */
	WORD_BANANA: /\bbanana\b/i,

	/** Matches any reference to "gremlin" */
	WORD_GREMLIN: /\bgremlin\b/i,

	/** Matches references to "czech" as a standalone word */
	WORD_CZECH: /\bczech\b/i,

	/** Matches references to "check" as a standalone word (misspelling) */
	WORD_CHECK: /\bcheck\b/i,

	/** Matches references to "sheesh" as a standalone word */
	WORD_SHEESH: /\bsh(e)+sh\b/i,

	/** Matches references to "spider-man" or "spiderman" */
	WORD_SPIDERMAN: /\bspider[-\s]?man\b/i,

	/** Matches references to "gundam" with possible misspellings */
	WORD_GUNDAM: /\b(g(u|a)ndam)\b/i,

	/** Matches references to "chaos" as a standalone word */
	WORD_CHAOS: /\bchaos\b/i,

	/** Matches references to "baby", "babies", "Metroid", "Samus", or "Lucas" */
	WORD_BABY: /\b(bab(y|ies)|metroid|samus(\s+aran)?|lucas)\b/i,

	/** Matches references to "hold" as a standalone word */
	WORD_HOLD: /\bhold\b/i,

	/** Matches references to "ezio" or assassin-related terms and Assassin's Creed characters */
	WORD_ASSASSIN: /\b(ezio|altair|kenway|connor|desmond|kassandra|assassin(at(e|ed|ion))?|h?assassin|put\s+a\s+hit\s+on|assassins?\s+creed)\b/i,

	// ===== PHRASE PATTERNS =====

	/** Matches phrases praising Sig or Siggles */
	PHRASE_SIG_PRAISE: /\b(sig|siggles)\s+(?:is\s+)?(best|greatest|awesome|amazing|cool|fantastic|wonderful|excellent|good|great|brilliant|perfect|the\s+best)\b/i,

	/** Matches phrases expressing a negative attitude with "can't" */
	PHRASE_NEGATIVE_ATTITUDE: /(you|I|they|we) can'?t/mi,

	// ===== SPECIAL PATTERNS =====

	/** Matches references to the number 69 or "sixty-nine" */
	SPECIAL_NICE_NUMBER: /\b69|(sixty-?nine)\b/i,

	/** Matches Discord music bot commands starting with !play */
	COMMAND_MUSIC: /^[!?]play\b/,

	/** Custom pattern for Venn requests - matches both nice and mean requests */
	BLUE_VENN_REQUEST: /blue?bot,? say something (nice|mean) about venn/i,
};
