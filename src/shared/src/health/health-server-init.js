"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeHealthServer = initializeHealthServer;
const health_server_1 = require("../observability/health-server");
const logger_1 = require("../observability/logger");
async function initializeHealthServer() {
    const metricsPort = parseInt(process.env.METRICS_PORT || '3000', 10);
    logger_1.logger.info('Starting health and metrics server', { port: metricsPort });
    const healthServer = (0, health_server_1.getHealthServer)(metricsPort);
    await healthServer.start();
    logger_1.logger.info('Health and metrics server started successfully', {
        port: metricsPort,
        endpoints: ['/health', '/ready', '/live', '/metrics'],
    });
    return healthServer;
}
