import { logger } from '@starbunk/shared';
import axios from 'axios';
import { EventEmitter } from 'events';

export interface ContainerHealth {
  name: string;
  status: 'healthy' | 'unhealthy' | 'starting' | 'unknown';
  uptime: number;
  lastCheck: Date;
  endpoint: string;
  responseTime?: number;
  error?: string;
  version?: string;
  memoryUsage?: number;
  cpuUsage?: number;
}

export interface ProductionMetrics {
  containers: ContainerHealth[];
  systemHealth: 'healthy' | 'degraded' | 'critical';
  lastUpdate: Date;
  alerts: ProductionAlert[];
}

export interface ProductionAlert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  container?: string;
  timestamp: Date;
  resolved: boolean;
}

export class ProductionMonitoringService extends EventEmitter {
  private static instance: ProductionMonitoringService;
  private containers: Map<string, ContainerHealth> = new Map();
  private alerts: ProductionAlert[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly checkInterval = 30000; // 30 seconds
  private readonly timeout = 10000; // 10 seconds

  // Container configuration for production monitoring
  private readonly containerConfigs = [
    { name: 'bunkbot', endpoint: 'http://starbunk-bunkbot-latest:3000/health', port: 3000 },
    { name: 'djcova', endpoint: 'http://starbunk-djcova-latest:3001/health', port: 3001 },
    { name: 'starbunk-dnd', endpoint: 'http://starbunk-dnd-latest:3002/health', port: 3002 },
    { name: 'snowbunk', endpoint: 'http://starbunk-snowbunk-latest:3004/health', port: 3004 },
    { name: 'covabot', endpoint: 'http://localhost:7080/api/health', port: 7080 }
  ];

  private constructor() {
    super();
    this.initializeContainers();
  }

  public static getInstance(): ProductionMonitoringService {
    if (!ProductionMonitoringService.instance) {
      ProductionMonitoringService.instance = new ProductionMonitoringService();
    }
    return ProductionMonitoringService.instance;
  }

  private initializeContainers(): void {
    this.containerConfigs.forEach(config => {
      this.containers.set(config.name, {
        name: config.name,
        status: 'unknown',
        uptime: 0,
        lastCheck: new Date(),
        endpoint: config.endpoint
      });
    });
  }

  public startMonitoring(): void {
    if (this.monitoringInterval) {
      return;
    }

    logger.info('Starting production monitoring service');
    
    // Initial check
    this.performHealthChecks();
    
    // Set up periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.checkInterval);

    this.emit('monitoring-started');
  }

  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('Production monitoring service stopped');
      this.emit('monitoring-stopped');
    }
  }

  private async performHealthChecks(): Promise<void> {
    const checkPromises = Array.from(this.containers.keys()).map(containerName => 
      this.checkContainerHealth(containerName)
    );

    await Promise.allSettled(checkPromises);
    this.updateSystemHealth();
    this.emit('health-check-complete', this.getMetrics());
  }

  private async checkContainerHealth(containerName: string): Promise<void> {
    const container = this.containers.get(containerName);
    if (!container) return;

    const startTime = Date.now();
    
    try {
      const response = await axios.get(container.endpoint, {
        timeout: this.timeout,
        validateStatus: (status) => status < 500 // Accept 4xx as "healthy" but not 5xx
      });

      const responseTime = Date.now() - startTime;
      const healthData = response.data;

      // Update container health
      const updatedContainer: ContainerHealth = {
        ...container,
        status: response.status === 200 ? 'healthy' : 'unhealthy',
        lastCheck: new Date(),
        responseTime,
        error: undefined,
        version: healthData?.version,
        memoryUsage: healthData?.memory,
        cpuUsage: healthData?.cpu,
        uptime: healthData?.uptime || 0
      };

      this.containers.set(containerName, updatedContainer);

      // Clear any existing alerts for this container if now healthy
      if (updatedContainer.status === 'healthy') {
        this.resolveAlertsForContainer(containerName);
      }

      logger.debug(`Health check passed for ${containerName}: ${responseTime}ms`);

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Update container as unhealthy
      const updatedContainer: ContainerHealth = {
        ...container,
        status: 'unhealthy',
        lastCheck: new Date(),
        responseTime,
        error: errorMessage
      };

      this.containers.set(containerName, updatedContainer);

      // Create alert for unhealthy container
      this.createAlert({
        severity: 'error',
        message: `Container ${containerName} health check failed: ${errorMessage}`,
        container: containerName
      });

      logger.warn(`Health check failed for ${containerName}: ${errorMessage}`);
    }
  }

  private updateSystemHealth(): void {
    const containers = Array.from(this.containers.values());
    const healthyCount = containers.filter(c => c.status === 'healthy').length;
    const totalCount = containers.length;

    let systemHealth: 'healthy' | 'degraded' | 'critical';

    if (healthyCount === totalCount) {
      systemHealth = 'healthy';
    } else if (healthyCount >= totalCount * 0.5) {
      systemHealth = 'degraded';
    } else {
      systemHealth = 'critical';
    }

    // Create system-level alerts
    if (systemHealth === 'critical') {
      this.createAlert({
        severity: 'critical',
        message: `System health critical: ${healthyCount}/${totalCount} containers healthy`
      });
    } else if (systemHealth === 'degraded') {
      this.createAlert({
        severity: 'warning',
        message: `System health degraded: ${healthyCount}/${totalCount} containers healthy`
      });
    }
  }

  private createAlert(alertData: Omit<ProductionAlert, 'id' | 'timestamp' | 'resolved'>): void {
    const alert: ProductionAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      resolved: false,
      ...alertData
    };

    this.alerts.unshift(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(0, 100);
    }

    this.emit('alert-created', alert);
    logger.warn(`Production alert: ${alert.message}`);
  }

  private resolveAlertsForContainer(containerName: string): void {
    this.alerts
      .filter(alert => alert.container === containerName && !alert.resolved)
      .forEach(alert => {
        alert.resolved = true;
        this.emit('alert-resolved', alert);
      });
  }

  public getMetrics(): ProductionMetrics {
    const containers = Array.from(this.containers.values());
    const healthyCount = containers.filter(c => c.status === 'healthy').length;
    const totalCount = containers.length;

    let systemHealth: 'healthy' | 'degraded' | 'critical';
    if (healthyCount === totalCount) {
      systemHealth = 'healthy';
    } else if (healthyCount >= totalCount * 0.5) {
      systemHealth = 'degraded';
    } else {
      systemHealth = 'critical';
    }

    return {
      containers,
      systemHealth,
      lastUpdate: new Date(),
      alerts: this.alerts.filter(alert => !alert.resolved).slice(0, 20) // Recent unresolved alerts
    };
  }

  public getContainerHealth(containerName: string): ContainerHealth | undefined {
    return this.containers.get(containerName);
  }

  public getAllAlerts(): ProductionAlert[] {
    return [...this.alerts];
  }

  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      this.emit('alert-resolved', alert);
      return true;
    }
    return false;
  }

  public async forceHealthCheck(): Promise<ProductionMetrics> {
    await this.performHealthChecks();
    return this.getMetrics();
  }
}
