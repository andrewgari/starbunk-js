import { ResponseGenerator } from "@/starbunk/bots/botTypes";
import { SPIDERMAN_CORRECTION } from "../spiderBotModel";

/**
 * Response generator that provides a correction for "spiderman" spelling
 */
export class SpiderManCorrectionGenerator implements ResponseGenerator {
	async generateResponse(): Promise<string> {
		return SPIDERMAN_CORRECTION;
	}
}
