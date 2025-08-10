# Production Monitoring & Remote Debugging Guide

## Overview

This guide provides comprehensive production monitoring and remote debugging capabilities for the Discord bot containers running on your Unraid server (192.168.50.3). The solution integrates with the existing CovaBot web interface to provide real-time visibility into container health, logs, and system status.

## Features

### 🔍 **Real-time Container Health Monitoring**
- Automated health checks for all 5 Discord bot containers
- Container status tracking (healthy/unhealthy/starting/unknown)
- Response time monitoring and performance metrics
- System-wide health assessment (healthy/degraded/critical)

### 📊 **Live Log Aggregation & Streaming**
- Real-time log collection from all containers
- WebSocket-based log streaming to web interface
- Log filtering by container, level, and search terms
- Historical log storage and downloadable exports
- Log statistics and analytics

### 🚨 **Production Alerting System**
- Automated alert generation for container failures
- Severity-based alert classification (info/warning/error/critical)
- Alert resolution tracking and management
- System-wide health status monitoring

### 🌐 **Web-based Monitoring Dashboard**
- Integrated with existing CovaBot web interface (port 7080)
- Real-time updates via WebSocket connections
- Container-specific health details and metrics
- Log viewing with filtering and search capabilities
- Quick action buttons for common operations

## Deployment Instructions

### 1. **Update Container Images**

Ensure all container images are built with the latest monitoring capabilities:

```bash
# Build and push updated CovaBot image with monitoring
cd containers/covabot
docker build -t ghcr.io/andrewgari/covabot:latest .
docker push ghcr.io/andrewgari/covabot:latest
```

### 2. **Deploy Monitoring-Enabled Stack**

Use the enhanced Docker Compose file for production deployment:

```bash
# Stop existing containers
docker-compose -f docker-compose.latest.yml down

# Deploy with monitoring capabilities
docker-compose -f docker-compose.monitoring.yml up -d

# Verify all containers are running
docker-compose -f docker-compose.monitoring.yml ps
```

### 3. **Access Monitoring Dashboard**

Navigate to the CovaBot web interface with the new monitoring tab:

```
http://192.168.50.3:7080
```

Click on the **"Production Monitor"** tab to access:
- System health overview
- Real-time container status
- Live log streaming
- Alert management
- Quick action controls

## Monitoring Capabilities

### **Container Health Monitoring**

The system continuously monitors all 5 Discord bot containers:

- **bunkbot** (Reply bots + admin commands) - Port 3000
- **djcova** (Music service) - Port 3001  
- **starbunk-dnd** (D&D features) - Port 3002
- **snowbunk** (Message bridge, production only) - Port 3004
- **covabot** (LLM Discord bot) - Port 7080

Health checks run every 30 seconds with:
- HTTP endpoint validation
- Response time measurement
- Error detection and logging
- Automatic retry mechanisms

### **Log Aggregation**

Real-time log collection includes:
- Container stdout/stderr streams
- Structured log parsing with levels (debug/info/warn/error)
- Timestamp normalization and formatting
- Metadata extraction (container, source, level)
- Automatic log rotation and cleanup

### **Alert Management**

Automated alerting for:
- Container health check failures
- System-wide degraded performance
- Critical service outages
- Resource usage anomalies

## Remote Debugging Workflow

### **For Production Issues:**

1. **Access Monitoring Dashboard**
   ```
   http://192.168.50.3:7080 → Production Monitor tab
   ```

2. **Check System Health**
   - Review overall system status
   - Identify unhealthy containers
   - Check response times and errors

3. **Analyze Real-time Logs**
   - Filter logs by problematic container
   - Search for error messages or patterns
   - Monitor live log stream for ongoing issues

4. **Download Logs for Analysis**
   - Use "Download Recent Logs" button
   - Export filtered logs for detailed analysis
   - Share log files for remote debugging

5. **Force Health Checks**
   - Trigger immediate health validation
   - Verify container recovery after fixes
   - Monitor system status changes

### **For Remote Assistance:**

When providing remote debugging support:

1. **Request Monitoring Dashboard Access**
   - Ask user to navigate to monitoring tab
   - Review system health overview
   - Identify specific container issues

2. **Analyze Log Patterns**
   - Guide user through log filtering
   - Identify error patterns and timestamps
   - Correlate issues across containers

3. **Validate Fixes**
   - Monitor health status after changes
   - Verify log patterns return to normal
   - Confirm alert resolution

## Security Considerations

### **Network Security**
- Monitoring dashboard accessible only on local network (192.168.50.3)
- No external ports exposed beyond existing CovaBot interface
- Docker socket mounted read-only for container monitoring

### **Data Privacy**
- Log data stored temporarily in memory (max 10,000 entries)
- No persistent log storage on disk
- Automatic log rotation and cleanup

### **Access Control**
- Monitoring integrated with existing CovaBot web interface
- No additional authentication required
- Rate limiting applied to API endpoints

## Troubleshooting

### **Common Issues:**

**WebSocket Connection Failed**
```
- Check if CovaBot container is running
- Verify port 7080 is accessible
- Refresh browser page to reconnect
```

**No Log Data Appearing**
```
- Verify Docker socket is mounted correctly
- Check container names match configuration
- Ensure containers are generating logs
```

**Health Checks Failing**
```
- Verify container health endpoints are responding
- Check network connectivity between containers
- Review container resource limits
```

### **Manual Verification:**

```bash
# Check container health manually
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# View container logs directly
docker logs starbunk-covabot-latest --tail 50

# Test health endpoints
curl http://192.168.50.3:7080/api/health
curl http://localhost:3000/health  # From within container network
```

## API Endpoints

The monitoring system exposes these API endpoints:

```
GET  /api/monitoring/health              # System health overview
POST /api/monitoring/health/check        # Force health check
GET  /api/monitoring/containers/:name    # Container-specific health
GET  /api/monitoring/logs                # Filtered log retrieval
GET  /api/monitoring/logs/stats          # Log statistics
GET  /api/monitoring/alerts              # Active alerts
POST /api/monitoring/alerts/:id/resolve  # Resolve specific alert
```

WebSocket endpoint for real-time logs:
```
WS   /ws/logs                            # Real-time log streaming
```

## Maintenance

### **Regular Tasks:**

- Monitor system health dashboard weekly
- Review and resolve alerts promptly  
- Download and archive logs monthly
- Update container images as needed

### **Performance Optimization:**

- Adjust log retention limits if needed
- Monitor memory usage of monitoring services
- Optimize log filtering for better performance
- Review alert thresholds periodically

This monitoring solution provides comprehensive visibility into your Discord bot production environment while maintaining security and performance standards.
