import { logger } from '@/observability/logger';

export class CommentConfigService {
  private static instance: CommentConfigService | null = null;
  private comments: Map<string, string[]> = new Map();

  static getInstance(): CommentConfigService {
    if (!CommentConfigService.instance) {
      CommentConfigService.instance = new CommentConfigService();
      logger.debug('CommentConfigService instance created');
    }
    return CommentConfigService.instance;
  }

  setComments(botName: string, input: string | string[]): void {
    const list = Array.isArray(input) ? input : this.parseInput(input);
    const normalized = list.map(s => s.trim()).filter(s => s.length > 0);
    this.comments.set(botName, normalized);
    logger.withMetadata({ bot_name: botName, count: normalized.length }).info('Comments set');
  }

  appendComments(botName: string, input: string | string[]): void {
    const list = Array.isArray(input) ? input : this.parseInput(input);
    const normalized = list.map(s => s.trim()).filter(s => s.length > 0);
    const existing = this.comments.get(botName) || [];
    const merged = [...existing, ...normalized];
    this.comments.set(botName, merged);
    logger.withMetadata({ bot_name: botName, count: merged.length }).info('Comments appended');
  }

  getComments(botName: string): string[] | undefined {
    return this.comments.get(botName);
  }

  clearComments(botName: string): void {
    this.comments.delete(botName);
    logger.withMetadata({ bot_name: botName }).info('Comments cleared');
  }

  listAll(): Record<string, string[]> {
    const out: Record<string, string[]> = {};
    for (const [name, vals] of this.comments.entries()) {
      out[name] = vals;
    }
    return out;
  }

  private parseInput(input: string): string[] {
    // Split on | or newline and collapse consecutive separators
    return input
      .split(/[\r\n|]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
}

export default CommentConfigService;
