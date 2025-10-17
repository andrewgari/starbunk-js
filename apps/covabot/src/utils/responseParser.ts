import { logger } from '@starbunk/shared';

export interface ParsedResponse {
    shouldRespond: boolean;
    responseText: string | null;
}

/**
 * Parses LLM output to determine if Cova should respond
 * and extracts the response text
 * 
 * Handles various "no response" signals:
 * - Empty string
 * - "[no response]"
 * - "SKIP"
 * - Very short responses (likely errors)
 */
export class ResponseParser {
    /**
     * Parse LLM response
     */
    static parse(llmOutput: string): ParsedResponse {
        const trimmed = llmOutput.trim();

        // Check for explicit skip signals
        if (this.isSkipSignal(trimmed)) {
            logger.debug('[ResponseParser] Detected skip signal');
            return {
                shouldRespond: false,
                responseText: null,
            };
        }

        // Clean the response
        const cleaned = this.cleanResponse(trimmed);

        // Validate response quality
        if (!this.isValidResponse(cleaned)) {
            logger.debug('[ResponseParser] Invalid response, treating as skip');
            return {
                shouldRespond: false,
                responseText: null,
            };
        }

        return {
            shouldRespond: true,
            responseText: cleaned,
        };
    }

    /**
     * Check if the response is a skip signal
     */
    private static isSkipSignal(text: string): boolean {
        if (text === '') return true;

        const upper = text.toUpperCase();

        // Explicit skip signals
        if (upper === 'SKIP') return true;
        if (upper.startsWith('SKIP')) return true;
        if (upper === '[NO RESPONSE]') return true;
        if (upper === 'NO RESPONSE') return true;

        // Check for annotation-style skip
        if (text.match(/^\[.*no.*response.*\]$/i)) return true;

        return false;
    }

    /**
     * Clean response text
     * 
     * Removes common LLM artifacts:
     * - "Cova:" prefix
     * - Annotations like [thinking], [response], etc.
     * - Extra whitespace
     */
    private static cleanResponse(text: string): string {
        let cleaned = text;

        // Remove "Cova:" prefix (case insensitive)
        cleaned = cleaned.replace(/^Cova:\s*/i, '');

        // Remove annotation-style prefixes
        cleaned = cleaned.replace(/^\[.*?\]\s*/, '');

        // Remove quotes if the entire response is quoted
        if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
            cleaned = cleaned.slice(1, -1);
        }
        if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
            cleaned = cleaned.slice(1, -1);
        }

        // Trim whitespace
        cleaned = cleaned.trim();

        return cleaned;
    }

    /**
     * Validate response meets quality criteria
     */
    private static isValidResponse(text: string): boolean {
        // Too short (likely an error or incomplete)
        if (text.length < 2) {
            return false;
        }

        // Too long (Discord limit is 2000, but Cova is usually concise)
        if (text.length > 2000) {
            logger.warn('[ResponseParser] Response too long, truncating');
            return false;
        }

        // Check for common error patterns
        const errorPatterns = [
            /^error/i,
            /^undefined$/i,
            /^null$/i,
            /^\[object/i,
        ];

        for (const pattern of errorPatterns) {
            if (pattern.test(text)) {
                logger.warn(`[ResponseParser] Detected error pattern: ${text}`);
                return false;
            }
        }

        return true;
    }

    /**
     * Truncate response if too long
     */
    static truncate(text: string, maxLength: number = 1900): string {
        if (text.length <= maxLength) {
            return text;
        }

        // Truncate and add ellipsis
        return text.substring(0, maxLength) + '...';
    }

    /**
     * Format response for Discord
     * 
     * Ensures response meets Discord's requirements
     */
    static formatForDiscord(text: string): string {
        let formatted = text;

        // Truncate if needed
        formatted = this.truncate(formatted, 1900);

        // Escape Discord markdown if needed (optional)
        // formatted = this.escapeMarkdown(formatted);

        return formatted;
    }

    /**
     * Optional: Escape Discord markdown
     * Only use if we want to prevent markdown formatting
     */
    private static escapeMarkdown(text: string): string {
        return text
            .replace(/\*/g, '\\*')
            .replace(/_/g, '\\_')
            .replace(/~/g, '\\~')
            .replace(/`/g, '\\`')
            .replace(/\|/g, '\\|');
    }

    /**
     * Get statistics about parsed responses
     * Useful for monitoring
     */
    static getStats(responses: ParsedResponse[]): {
        total: number;
        responded: number;
        skipped: number;
        responseRate: number;
    } {
        const total = responses.length;
        const responded = responses.filter(r => r.shouldRespond).length;
        const skipped = total - responded;
        const responseRate = total > 0 ? responded / total : 0;

        return {
            total,
            responded,
            skipped,
            responseRate,
        };
    }
}

