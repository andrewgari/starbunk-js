import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '@starbunk/shared';

export interface CovaMessageExample {
    conversationContext: Array<{
        author: string;
        content: string;
        timestamp: string;
    }>;
    currentMessage: {
        author: string;
        content: string;
    };
    covaResponse: string | null; // null = Cova didn't respond
    metadata: {
        conversationVelocity: 'high' | 'medium' | 'low';
        participantCount: number;
        timeSinceCovaSpoke: number;
        isDirectMention: boolean;
        channelType?: string;
    };
}

interface CovaMessagesData {
    version: string;
    lastUpdated: string;
    examples: CovaMessageExample[];
}

/**
 * Loads and manages Cova's message examples from JSON file
 * 
 * Uses static file approach - all examples are loaded at startup
 * and included in every prompt. No vector search or filtering needed.
 */
export class ExampleLoader {
    private examples: CovaMessageExample[];
    private dataPath: string;

    constructor(dataPath?: string) {
        this.dataPath = dataPath || join(process.cwd(), 'data/covabot/cova-messages.json');
        this.examples = this.loadExamples();
        logger.info(`[ExampleLoader] Loaded ${this.examples.length} examples from ${this.dataPath}`);
    }

    /**
     * Load examples from JSON file
     */
    private loadExamples(): CovaMessageExample[] {
        try {
            const fileContent = readFileSync(this.dataPath, 'utf-8');
            const data: CovaMessagesData = JSON.parse(fileContent);

            if (!data.examples || !Array.isArray(data.examples)) {
                throw new Error('Invalid data format: missing examples array');
            }

            logger.info(`[ExampleLoader] Loaded version ${data.version} (updated: ${data.lastUpdated})`);
            return data.examples;
        } catch (error) {
            logger.error(`[ExampleLoader] Failed to load examples from ${this.dataPath}:`, error);
            throw error;
        }
    }

    /**
     * Get all curated examples
     * 
     * This is the primary method - returns all 50-100 examples
     * to be included in every prompt. Modern LLMs can handle this easily.
     */
    getAllExamples(): CovaMessageExample[] {
        return this.examples;
    }

    /**
     * Get count of examples
     */
    getExampleCount(): number {
        return this.examples.length;
    }

    /**
     * Get count of examples where Cova responded vs. stayed quiet
     */
    getResponseStats(): { responded: number; skipped: number; total: number } {
        const responded = this.examples.filter(ex => ex.covaResponse !== null).length;
        const skipped = this.examples.filter(ex => ex.covaResponse === null).length;

        return {
            responded,
            skipped,
            total: this.examples.length,
        };
    }

    /**
     * Optional: Simple filtering without embeddings
     * 
     * Only use this if token usage becomes a concern (unlikely).
     * Prefer getAllExamples() for maximum behavioral diversity.
     */
    getFilteredExamples(filters?: {
        conversationVelocity?: 'high' | 'medium' | 'low';
        minParticipants?: number;
        includeNullResponses?: boolean;
    }): CovaMessageExample[] {
        if (!filters) {
            return this.examples;
        }

        return this.examples.filter(ex => {
            if (filters.conversationVelocity && ex.metadata.conversationVelocity !== filters.conversationVelocity) {
                return false;
            }

            if (filters.minParticipants && ex.metadata.participantCount < filters.minParticipants) {
                return false;
            }

            if (filters.includeNullResponses === false && ex.covaResponse === null) {
                return false;
            }

            return true;
        });
    }

    /**
     * Optional: Stratified sampling for diversity
     * 
     * If we need to reduce token usage, this ensures we still show
     * diverse examples across different conversation types.
     */
    getStratifiedSample(samplesPerCategory: number = 10): CovaMessageExample[] {
        const highEnergy = this.examples
            .filter(ex => ex.metadata.conversationVelocity === 'high')
            .slice(0, samplesPerCategory);

        const mediumEnergy = this.examples
            .filter(ex => ex.metadata.conversationVelocity === 'medium')
            .slice(0, samplesPerCategory);

        const lowEnergy = this.examples
            .filter(ex => ex.metadata.conversationVelocity === 'low')
            .slice(0, samplesPerCategory);

        const directMentions = this.examples
            .filter(ex => ex.metadata.isDirectMention)
            .slice(0, samplesPerCategory);

        const noResponses = this.examples
            .filter(ex => ex.covaResponse === null)
            .slice(0, samplesPerCategory);

        // Combine and deduplicate
        const combined = [
            ...highEnergy,
            ...mediumEnergy,
            ...lowEnergy,
            ...directMentions,
            ...noResponses,
        ];

        // Remove duplicates (same example might be in multiple categories)
        const unique = Array.from(
            new Map(combined.map(ex => [JSON.stringify(ex), ex])).values()
        );

        logger.debug(`[ExampleLoader] Stratified sample: ${unique.length} examples`);
        return unique;
    }

    /**
     * Reload examples from file
     * Useful for hot-reloading during development
     */
    reload(): void {
        this.examples = this.loadExamples();
        logger.info(`[ExampleLoader] Reloaded ${this.examples.length} examples`);
    }
}

