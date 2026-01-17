declare class Logger {
    private serviceName;
    private structuredLogging;
    constructor(serviceName?: string);
    debug(message: string, context?: Record<string, unknown>): void;
    info(message: string, context?: Record<string, unknown>): void;
    warn(message: string, context?: Record<string, unknown>): void;
    error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void;
    success(message: string, context?: Record<string, unknown>): void;
    setServiceName(serviceName: string): void;
    enableStructuredLogging(enabled: boolean): void;
    private log;
    private logStructured;
    private logFormatted;
}
export declare function getLogger(): Logger;
export declare const logger: Logger;
export {};
//# sourceMappingURL=logger.d.ts.map