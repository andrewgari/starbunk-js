import * as http from 'http';
import { BotRegistry } from '@/reply-bots/bot-registry';
import { BotStateManager } from '@/reply-bots/services/bot-state-manager';
import CommentConfigService from '@/reply-bots/services/comment-config-service';
import { logger } from '@/observability/logger';

export class ConfigServer {
  private server: http.Server | null = null;
  private readonly port: number;

  constructor(port: number = 7081) {
    this.port = port;
  }

  async start(): Promise<void> {
    if (this.server) return;
    this.server = http.createServer((req, res) => this.handle(req, res));
    return new Promise((resolve, reject) => {
      this.server!.on('error', err => {
        logger.withError(err).error('[ConfigServer] Server error');
        reject(err);
      });
      this.server!.listen(this.port, () => {
        logger.withMetadata({ port: this.port }).info('[ConfigServer] Listening');
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.server) return;
    return new Promise(resolve => {
      this.server!.close(() => {
        logger.info('[ConfigServer] Stopped');
        resolve();
      });
    });
  }

  private handle(req: http.IncomingMessage, res: http.ServerResponse) {
    const url = req.url || '/';
    if (url === '/config' || url === '/bots') {
      this.json(res, this.snapshot());
      return;
    }
    if (url === '/ui') {
      this.html(res, this.renderHtml());
      return;
    }
    if (url === '/health') {
      this.json(res, { status: 'ok', timestamp: new Date().toISOString() });
      return;
    }
    this.json(res, { error: 'Not Found', endpoints: ['/ui', '/config', '/bots', '/health'] }, 404);
  }

  private snapshot() {
    const registry = BotRegistry.getInstance();
    const state = BotStateManager.getInstance();
    const commentSvc = CommentConfigService.getInstance();

    const bots = registry.getBotNames().map(name => ({
      name,
      enabled: state.isBotEnabled(name),
      comments: commentSvc.getComments(name) || [],
      commentCount: (commentSvc.getComments(name) || []).length,
    }));

    return {
      service: 'bunkbot',
      timestamp: new Date().toISOString(),
      totalBots: bots.length,
      bots,
    };
  }

  private renderHtml() {
    const data = this.snapshot();
    const rows = data.bots
      .map(
        b => `
      <tr>
        <td>${b.name}</td>
        <td>${b.enabled ? '✅' : '❌'}</td>
        <td>${b.commentCount}</td>
        <td>${b.comments.map(c => this.escape(c)).join('<br/>')}</td>
      </tr>
    `,
      )
      .join('');

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <title>Starbunk - BunkBot Config</title>
          <style>
            body { font-family: system-ui, Arial, sans-serif; margin: 2rem; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; vertical-align: top; }
            th { background: #f5f5f5; text-align: left; }
            .header { margin-bottom: 1rem; }
            .muted { color: #666; font-size: 0.9rem; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>BunkBot Configuration</h1>
            <div class="muted">Updated: ${data.timestamp} • Bots: ${data.totalBots}</div>
          </div>
          <table>
            <thead>
              <tr><th>Bot</th><th>Enabled</th><th>Comments (#)</th><th>Comments</th></tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `;
  }

  private escape(s: string) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private json(res: http.ServerResponse, body: unknown, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
    res.end(JSON.stringify(body));
  }

  private html(res: http.ServerResponse, body: string, status = 200) {
    res.writeHead(status, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    });
    res.end(body);
  }
}

export default ConfigServer;
