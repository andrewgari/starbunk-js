import { logger } from '@starbunk/shared';
import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import WebSocket from 'ws';

export interface LogEntry {
  id: string;
  timestamp: Date;
  container: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  metadata?: Record<string, any>;
  source: 'stdout' | 'stderr';
}

export interface LogFilter {
  containers?: string[];
  levels?: string[];
  since?: Date;
  until?: Date;
  search?: string;
  limit?: number;
}

export class LogAggregationService extends EventEmitter {
  private static instance: LogAggregationService;
  private logs: LogEntry[] = [];
  private maxLogs = 10000; // Keep last 10k logs in memory
  private logProcesses: Map<string, ChildProcess> = new Map();
  private wsServer: WebSocket.Server | null = null;
  private clients: Set<WebSocket> = new Set();

  // Container names for log collection
  private readonly containers = [
    'starbunk-bunkbot-latest',
    'starbunk-djcova-latest', 
    'starbunk-dnd-latest',
    'starbunk-snowbunk-latest',
    'starbunk-covabot-latest'
  ];

  private constructor() {
    super();
  }

  public static getInstance(): LogAggregationService {
    if (!LogAggregationService.instance) {
      LogAggregationService.instance = new LogAggregationService();
    }
    return LogAggregationService.instance;
  }

  public startLogCollection(): void {
    logger.info('Starting log aggregation service');
    
    // Start collecting logs from each container
    this.containers.forEach(container => {
      this.startContainerLogCollection(container);
    });

    this.emit('log-collection-started');
  }

  public stopLogCollection(): void {
    logger.info('Stopping log aggregation service');
    
    // Stop all log collection processes
    this.logProcesses.forEach((process, container) => {
      logger.debug(`Stopping log collection for ${container}`);
      process.kill('SIGTERM');
    });
    
    this.logProcesses.clear();
    this.emit('log-collection-stopped');
  }

  private startContainerLogCollection(containerName: string): void {
    try {
      // Use docker logs with follow flag to stream logs
      const logProcess = spawn('docker', [
        'logs',
        '--follow',
        '--timestamps',
        '--tail', '100', // Start with last 100 lines
        containerName
      ]);

      this.logProcesses.set(containerName, logProcess);

      logProcess.stdout.on('data', (data) => {
        this.processLogData(containerName, data.toString(), 'stdout');
      });

      logProcess.stderr.on('data', (data) => {
        this.processLogData(containerName, data.toString(), 'stderr');
      });

      logProcess.on('error', (error) => {
        logger.error(`Log collection error for ${containerName}:`, error as Error);
        // Retry after 30 seconds
        setTimeout(() => {
          if (!this.logProcesses.has(containerName)) {
            this.startContainerLogCollection(containerName);
          }
        }, 30000);
      });

      logProcess.on('exit', (code) => {
        logger.warn(`Log collection process exited for ${containerName} with code ${code}`);
        this.logProcesses.delete(containerName);
        
        // Retry after 10 seconds if not intentionally stopped
        setTimeout(() => {
          if (!this.logProcesses.has(containerName)) {
            this.startContainerLogCollection(containerName);
          }
        }, 10000);
      });

      logger.debug(`Started log collection for ${containerName}`);

    } catch (error) {
      logger.error(`Failed to start log collection for ${containerName}:`, error as Error);
    }
  }

  private processLogData(container: string, data: string, source: 'stdout' | 'stderr'): void {
    const lines = data.trim().split('\n');
    
    lines.forEach(line => {
      if (!line.trim()) return;

      const logEntry = this.parseLogLine(container, line, source);
      if (logEntry) {
        this.addLogEntry(logEntry);
      }
    });
  }

  private parseLogLine(container: string, line: string, source: 'stdout' | 'stderr'): LogEntry | null {
    try {
      // Docker log format: TIMESTAMP MESSAGE
      const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)\s+(.*)$/);
      
      let timestamp: Date;
      let message: string;
      
      if (timestampMatch) {
        timestamp = new Date(timestampMatch[1]);
        message = timestampMatch[2];
      } else {
        timestamp = new Date();
        message = line;
      }

      // Try to parse log level from message
      const level = this.extractLogLevel(message);

      // Try to parse JSON metadata if present
      let metadata: Record<string, any> | undefined;
      try {
        if (message.includes('{') && message.includes('}')) {
          const jsonMatch = message.match(/\{.*\}/);
          if (jsonMatch) {
            metadata = JSON.parse(jsonMatch[0]);
          }
        }
      } catch {
        // Ignore JSON parse errors
      }

      const logEntry: LogEntry = {
        id: `${container}-${timestamp.getTime()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp,
        container: container.replace('starbunk-', '').replace('-latest', ''),
        level,
        message,
        metadata,
        source
      };

      return logEntry;

    } catch (error) {
      logger.debug(`Failed to parse log line from ${container}:`, error);
      return null;
    }
  }

  private extractLogLevel(message: string): 'debug' | 'info' | 'warn' | 'error' {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('error') || lowerMessage.includes('err:')) {
      return 'error';
    } else if (lowerMessage.includes('warn') || lowerMessage.includes('warning')) {
      return 'warn';
    } else if (lowerMessage.includes('debug') || lowerMessage.includes('dbg:')) {
      return 'debug';
    } else {
      return 'info';
    }
  }

  private addLogEntry(logEntry: LogEntry): void {
    this.logs.unshift(logEntry);
    
    // Maintain max log limit
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Emit to event listeners
    this.emit('log-entry', logEntry);

    // Send to WebSocket clients
    this.broadcastToClients({
      type: 'log-entry',
      data: logEntry
    });

    // Log high-severity entries
    if (logEntry.level === 'error') {
      logger.warn(`Container ${logEntry.container} error: ${logEntry.message}`);
    }
  }

  public getLogs(filter: LogFilter = {}): LogEntry[] {
    let filteredLogs = [...this.logs];

    // Filter by containers
    if (filter.containers && filter.containers.length > 0) {
      filteredLogs = filteredLogs.filter(log => 
        filter.containers!.includes(log.container)
      );
    }

    // Filter by levels
    if (filter.levels && filter.levels.length > 0) {
      filteredLogs = filteredLogs.filter(log => 
        filter.levels!.includes(log.level)
      );
    }

    // Filter by time range
    if (filter.since) {
      filteredLogs = filteredLogs.filter(log => 
        log.timestamp >= filter.since!
      );
    }

    if (filter.until) {
      filteredLogs = filteredLogs.filter(log => 
        log.timestamp <= filter.until!
      );
    }

    // Filter by search term
    if (filter.search) {
      const searchTerm = filter.search.toLowerCase();
      filteredLogs = filteredLogs.filter(log => 
        log.message.toLowerCase().includes(searchTerm) ||
        log.container.toLowerCase().includes(searchTerm)
      );
    }

    // Apply limit
    if (filter.limit && filter.limit > 0) {
      filteredLogs = filteredLogs.slice(0, filter.limit);
    }

    return filteredLogs;
  }

  public setupWebSocketServer(server: any): void {
    this.wsServer = new WebSocket.Server({ server, path: '/ws/logs' });
    
    this.wsServer.on('connection', (ws) => {
      logger.debug('New WebSocket client connected for logs');
      this.clients.add(ws);

      // Send recent logs to new client
      const recentLogs = this.getLogs({ limit: 100 });
      ws.send(JSON.stringify({
        type: 'initial-logs',
        data: recentLogs
      }));

      ws.on('close', () => {
        logger.debug('WebSocket client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error:', error as Error);
        this.clients.delete(ws);
      });

      // Handle client messages for log filtering
      ws.on('message', (message) => {
        try {
          const request = JSON.parse(message.toString());
          if (request.type === 'filter-logs') {
            const filteredLogs = this.getLogs(request.filter);
            ws.send(JSON.stringify({
              type: 'filtered-logs',
              data: filteredLogs
            }));
          }
        } catch (error) {
          logger.error('Error processing WebSocket message:', error as Error);
        }
      });
    });

    logger.info('WebSocket server setup for log streaming');
  }

  private broadcastToClients(message: any): void {
    const messageStr = JSON.stringify(message);
    
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr);
        } catch (error) {
          logger.error('Error sending WebSocket message:', error as Error);
          this.clients.delete(client);
        }
      }
    });
  }

  public getLogStats(): { totalLogs: number; containerCounts: Record<string, number>; levelCounts: Record<string, number> } {
    const containerCounts: Record<string, number> = {};
    const levelCounts: Record<string, number> = {};

    this.logs.forEach(log => {
      containerCounts[log.container] = (containerCounts[log.container] || 0) + 1;
      levelCounts[log.level] = (levelCounts[log.level] || 0) + 1;
    });

    return {
      totalLogs: this.logs.length,
      containerCounts,
      levelCounts
    };
  }
}
