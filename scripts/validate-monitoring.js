#!/usr/bin/env node

/**
 * Production Monitoring Validation Script
 * 
 * This script validates that the production monitoring system is working correctly
 * by testing all monitoring endpoints, WebSocket connections, and container health checks.
 */

const axios = require('axios');
const WebSocket = require('ws');

const MONITORING_BASE_URL = process.env.MONITORING_URL || 'http://192.168.50.3:7080';
const API_BASE = `${MONITORING_BASE_URL}/api`;

class MonitoringValidator {
    constructor() {
        this.results = {
            healthEndpoints: {},
            logEndpoints: {},
            alertEndpoints: {},
            webSocketConnection: false,
            containerHealth: {},
            overallStatus: 'unknown'
        };
    }

    async validateAll() {
        console.log('🔍 Starting Production Monitoring Validation...\n');
        console.log(`📍 Monitoring URL: ${MONITORING_BASE_URL}\n`);

        try {
            // Test basic connectivity
            await this.testBasicConnectivity();
            
            // Test health monitoring endpoints
            await this.testHealthEndpoints();
            
            // Test log monitoring endpoints
            await this.testLogEndpoints();
            
            // Test alert endpoints
            await this.testAlertEndpoints();
            
            // Test WebSocket connection
            await this.testWebSocketConnection();
            
            // Test container health checks
            await this.testContainerHealth();
            
            // Generate final report
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Validation failed:', error.message);
            this.results.overallStatus = 'failed';
            process.exit(1);
        }
    }

    async testBasicConnectivity() {
        console.log('🌐 Testing basic connectivity...');
        
        try {
            const response = await axios.get(`${API_BASE}/health`, { timeout: 10000 });
            if (response.status === 200) {
                console.log('✅ CovaBot web interface is accessible');
                return true;
            }
        } catch (error) {
            console.error('❌ Cannot connect to CovaBot web interface');
            console.error(`   Error: ${error.message}`);
            throw new Error('Basic connectivity test failed');
        }
    }

    async testHealthEndpoints() {
        console.log('\n💓 Testing health monitoring endpoints...');
        
        const healthEndpoints = [
            { name: 'System Health Overview', path: '/monitoring/health' },
            { name: 'Force Health Check', path: '/monitoring/health/check', method: 'POST' }
        ];

        for (const endpoint of healthEndpoints) {
            try {
                const method = endpoint.method || 'GET';
                const response = await axios({
                    method,
                    url: `${API_BASE}${endpoint.path}`,
                    timeout: 15000
                });

                if (response.status === 200 && response.data.success) {
                    console.log(`✅ ${endpoint.name}: Working`);
                    this.results.healthEndpoints[endpoint.name] = 'working';
                    
                    // Store health data for analysis
                    if (endpoint.path === '/monitoring/health') {
                        this.results.systemHealth = response.data.data;
                    }
                } else {
                    console.log(`⚠️  ${endpoint.name}: Unexpected response`);
                    this.results.healthEndpoints[endpoint.name] = 'warning';
                }
            } catch (error) {
                console.log(`❌ ${endpoint.name}: Failed (${error.message})`);
                this.results.healthEndpoints[endpoint.name] = 'failed';
            }
        }
    }

    async testLogEndpoints() {
        console.log('\n📋 Testing log monitoring endpoints...');
        
        const logEndpoints = [
            { name: 'Log Retrieval', path: '/monitoring/logs?limit=10' },
            { name: 'Log Statistics', path: '/monitoring/logs/stats' }
        ];

        for (const endpoint of logEndpoints) {
            try {
                const response = await axios.get(`${API_BASE}${endpoint.path}`, { timeout: 10000 });
                
                if (response.status === 200 && response.data.success) {
                    console.log(`✅ ${endpoint.name}: Working`);
                    this.results.logEndpoints[endpoint.name] = 'working';
                    
                    // Store log stats for analysis
                    if (endpoint.path.includes('stats')) {
                        this.results.logStats = response.data.data;
                    }
                } else {
                    console.log(`⚠️  ${endpoint.name}: Unexpected response`);
                    this.results.logEndpoints[endpoint.name] = 'warning';
                }
            } catch (error) {
                console.log(`❌ ${endpoint.name}: Failed (${error.message})`);
                this.results.logEndpoints[endpoint.name] = 'failed';
            }
        }
    }

    async testAlertEndpoints() {
        console.log('\n🚨 Testing alert monitoring endpoints...');
        
        try {
            const response = await axios.get(`${API_BASE}/monitoring/alerts`, { timeout: 10000 });
            
            if (response.status === 200 && response.data.success) {
                console.log('✅ Alert Retrieval: Working');
                this.results.alertEndpoints['Alert Retrieval'] = 'working';
                this.results.activeAlerts = response.data.data;
                
                console.log(`   📊 Found ${response.data.data.length} active alerts`);
            } else {
                console.log('⚠️  Alert Retrieval: Unexpected response');
                this.results.alertEndpoints['Alert Retrieval'] = 'warning';
            }
        } catch (error) {
            console.log(`❌ Alert Retrieval: Failed (${error.message})`);
            this.results.alertEndpoints['Alert Retrieval'] = 'failed';
        }
    }

    async testWebSocketConnection() {
        console.log('\n🔌 Testing WebSocket connection...');
        
        return new Promise((resolve) => {
            const wsUrl = `${MONITORING_BASE_URL.replace('http', 'ws')}/ws/logs`;
            const ws = new WebSocket(wsUrl);
            
            const timeout = setTimeout(() => {
                console.log('❌ WebSocket connection: Timeout');
                this.results.webSocketConnection = false;
                ws.close();
                resolve();
            }, 10000);

            ws.on('open', () => {
                console.log('✅ WebSocket connection: Working');
                this.results.webSocketConnection = true;
                clearTimeout(timeout);
                ws.close();
                resolve();
            });

            ws.on('error', (error) => {
                console.log(`❌ WebSocket connection: Failed (${error.message})`);
                this.results.webSocketConnection = false;
                clearTimeout(timeout);
                resolve();
            });
        });
    }

    async testContainerHealth() {
        console.log('\n🐳 Testing individual container health...');
        
        const containers = ['bunkbot', 'djcova', 'starbunk-dnd', 'snowbunk', 'covabot'];
        
        for (const container of containers) {
            try {
                const response = await axios.get(`${API_BASE}/monitoring/containers/${container}`, { timeout: 10000 });
                
                if (response.status === 200 && response.data.success) {
                    const health = response.data.data;
                    const status = health.status;
                    const statusIcon = status === 'healthy' ? '✅' : status === 'unhealthy' ? '❌' : '⚠️';
                    
                    console.log(`${statusIcon} ${container}: ${status} (${health.responseTime || 'N/A'}ms)`);
                    this.results.containerHealth[container] = health;
                } else {
                    console.log(`⚠️  ${container}: Unknown status`);
                    this.results.containerHealth[container] = { status: 'unknown' };
                }
            } catch (error) {
                if (error.response?.status === 404) {
                    console.log(`⚠️  ${container}: Not found (may not be running)`);
                    this.results.containerHealth[container] = { status: 'not_found' };
                } else {
                    console.log(`❌ ${container}: Failed (${error.message})`);
                    this.results.containerHealth[container] = { status: 'error', error: error.message };
                }
            }
        }
    }

    generateReport() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 PRODUCTION MONITORING VALIDATION REPORT');
        console.log('='.repeat(60));

        // Overall system health
        if (this.results.systemHealth) {
            const systemStatus = this.results.systemHealth.systemHealth;
            const statusIcon = systemStatus === 'healthy' ? '✅' : systemStatus === 'degraded' ? '⚠️' : '❌';
            console.log(`\n🏥 System Health: ${statusIcon} ${systemStatus.toUpperCase()}`);
            console.log(`   Last Update: ${new Date(this.results.systemHealth.lastUpdate).toLocaleString()}`);
        }

        // Container health summary
        console.log('\n🐳 Container Health Summary:');
        const healthyContainers = Object.values(this.results.containerHealth).filter(c => c.status === 'healthy').length;
        const totalContainers = Object.keys(this.results.containerHealth).length;
        console.log(`   Healthy: ${healthyContainers}/${totalContainers} containers`);

        // Endpoint status summary
        console.log('\n🔗 Endpoint Status Summary:');
        const allEndpoints = { ...this.results.healthEndpoints, ...this.results.logEndpoints, ...this.results.alertEndpoints };
        const workingEndpoints = Object.values(allEndpoints).filter(status => status === 'working').length;
        const totalEndpoints = Object.keys(allEndpoints).length;
        console.log(`   Working: ${workingEndpoints}/${totalEndpoints} endpoints`);

        // WebSocket status
        const wsStatus = this.results.webSocketConnection ? '✅ Connected' : '❌ Failed';
        console.log(`\n🔌 WebSocket Status: ${wsStatus}`);

        // Log statistics
        if (this.results.logStats) {
            console.log('\n📋 Log Statistics:');
            console.log(`   Total Logs: ${this.results.logStats.totalLogs}`);
            console.log(`   Active Containers: ${Object.keys(this.results.logStats.containerCounts).length}`);
        }

        // Active alerts
        if (this.results.activeAlerts) {
            console.log(`\n🚨 Active Alerts: ${this.results.activeAlerts.length}`);
            if (this.results.activeAlerts.length > 0) {
                this.results.activeAlerts.forEach(alert => {
                    console.log(`   - ${alert.severity.toUpperCase()}: ${alert.message}`);
                });
            }
        }

        // Determine overall status
        const criticalIssues = Object.values(allEndpoints).filter(status => status === 'failed').length;
        const unhealthyContainers = Object.values(this.results.containerHealth).filter(c => c.status === 'unhealthy').length;
        
        if (criticalIssues === 0 && unhealthyContainers === 0 && this.results.webSocketConnection) {
            this.results.overallStatus = 'excellent';
            console.log('\n🎉 Overall Status: ✅ EXCELLENT - All systems operational');
        } else if (criticalIssues <= 1 && unhealthyContainers <= 1) {
            this.results.overallStatus = 'good';
            console.log('\n👍 Overall Status: ⚠️  GOOD - Minor issues detected');
        } else {
            this.results.overallStatus = 'needs_attention';
            console.log('\n⚠️  Overall Status: ❌ NEEDS ATTENTION - Multiple issues detected');
        }

        console.log('\n📖 Next Steps:');
        console.log('   1. Access monitoring dashboard: ' + MONITORING_BASE_URL);
        console.log('   2. Click "Production Monitor" tab for real-time monitoring');
        console.log('   3. Review any failed endpoints or unhealthy containers');
        console.log('   4. Check logs for detailed error information');
        
        console.log('\n' + '='.repeat(60));
    }
}

// Run validation if called directly
if (require.main === module) {
    const validator = new MonitoringValidator();
    validator.validateAll().catch(error => {
        console.error('Validation script failed:', error);
        process.exit(1);
    });
}

module.exports = MonitoringValidator;
