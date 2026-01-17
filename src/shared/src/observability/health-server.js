"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthServer = void 0;
exports.getHealthServer = getHealthServer;
const http = __importStar(require("http"));
const metrics_service_1 = require("./metrics-service");
class HealthServer {
    server = null;
    port;
    startTime;
    constructor(port = 3000) {
        this.port = port;
        this.startTime = Date.now();
    }
    start() {
        return new Promise((resolve, reject) => {
            this.server = http.createServer((req, res) => {
                this.handleRequest(req, res);
            });
            this.server.on('error', (error) => {
                console.error('[HealthServer] Server error:', error);
                reject(error);
            });
            this.server.listen(this.port, () => {
                console.log(`[HealthServer] Listening on port ${this.port}`);
                resolve();
            });
        });
    }
    stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    console.log('[HealthServer] Server stopped');
                    resolve();
                });
            }
            else {
                resolve();
            }
        });
    }
    handleRequest(req, res) {
        const url = req.url || '/';
        if (process.env.DEBUG_MODE === 'true') {
            console.log(`[HealthServer] ${req.method} ${url}`);
        }
        if (url === '/metrics') {
            this.handleMetrics(req, res);
        }
        else if (url === '/health' || url === '/ready') {
            this.handleHealth(req, res);
        }
        else if (url === '/live') {
            this.handleLiveness(req, res);
        }
        else {
            this.handle404(req, res);
        }
    }
    async handleMetrics(req, res) {
        try {
            const metrics = await (0, metrics_service_1.getMetricsService)().getMetrics();
            res.writeHead(200, {
                'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
            });
            res.end(metrics);
        }
        catch (error) {
            console.error('[HealthServer] Error getting metrics:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to get metrics' }));
        }
    }
    handleHealth(req, res) {
        const uptime = Date.now() - this.startTime;
        const health = {
            status: 'healthy',
            uptime: uptime,
            timestamp: new Date().toISOString(),
            service: 'bunkbot',
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(health));
    }
    handleLiveness(req, res) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'alive' }));
    }
    handle404(req, res) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            error: 'Not Found',
            availableEndpoints: ['/metrics', '/health', '/ready', '/live'],
        }));
    }
}
exports.HealthServer = HealthServer;
let healthServerInstance;
function getHealthServer(port) {
    if (!healthServerInstance) {
        const serverPort = port || parseInt(process.env.METRICS_PORT || '3000', 10);
        healthServerInstance = new HealthServer(serverPort);
    }
    return healthServerInstance;
}
