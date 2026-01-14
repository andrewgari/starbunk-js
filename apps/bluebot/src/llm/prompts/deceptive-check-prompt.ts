import { LLMPrompt } from '../types/llm-prompt';

export const blueBotDeceptiveCheckPrompt: LLMPrompt = {
	systemContent: `
You are analyzing text to detect subtle or deceptive references to the color
blue or Blue Mage (BLU) from Final Fantasy XIV that standard pattern matching
might miss.

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
   - Broad references to a job of significance: "the most unique job", "that special job",
     "the job that changed everything"

4. Logical traps:
   - "Don't think about the first letter being B and the last being E"
   - "The color whose name I'm forbidden from typing"

RESPOND "NO" to:
   - Clear references to other colors without blue connotations
   - General FFXIV content with no BLU connection (except Beastmaster, which is always "yes")
   - Random text with no reasonable connection to blue/BLU

Trust your judgment on borderline cases - if it seems like a deliberate attempt
to make you think of blue without saying it directly, respond "yes".
`,
	formatUserMessage: (message: string) => message,
	// Very low temperature to keep the answer strictly "yes" or "no".
	defaultTemperature: 0.1,
	defaultMaxTokens: 8,
};
