export declare class HealthServer {
    private server;
    private port;
    private startTime;
    constructor(port?: number);
    start(): Promise<void>;
    stop(): Promise<void>;
    private handleRequest;
    private handleMetrics;
    private handleHealth;
    private handleLiveness;
    private handle404;
}
export declare function getHealthServer(port?: number): HealthServer;
//# sourceMappingURL=health-server.d.ts.map