# 🚀 CovaBot Production Deployment Strategy

## 📋 Overview

This document outlines the comprehensive production deployment strategy for CovaBot, designed to minimize risk and maximize confidence in the deployment process.

## 🔍 Phase 1: Pre-Deployment Validation

### 1.1 Local Integration Testing

**Run the comprehensive production readiness test suite:**

```bash
# Set up environment variables
export QDRANT_URL="http://192.168.50.3:6333"
export OPENAI_API_KEY="your-openai-key"
export STARBUNK_TOKEN="your-discord-token"

# Run production readiness tests
cd containers/covabot
node scripts/production-readiness-tests.js
```

**Expected Results:**
- ✅ All environment variables configured
- ✅ Qdrant connectivity verified
- ✅ LLM providers accessible
- ✅ Container builds successfully
- ✅ All critical functionality validated

### 1.2 Container Build Verification

```bash
# Build production container
cd containers/covabot
podman build -t covabot-production -f Dockerfile ../../

# Verify container size and layers
podman images covabot-production
podman history covabot-production
```

### 1.3 Security Scan

```bash
# Scan container for vulnerabilities
podman run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image covabot-production
```

## 🎭 Phase 2: Staging Environment Setup

### 2.1 Create Staging Environment

```bash
# Set up staging environment
chmod +x scripts/setup-staging-environment.sh
./scripts/setup-staging-environment.sh
```

### 2.2 Configure Staging Environment

Edit `.env.staging` with your staging configuration:

```bash
# Critical: Use test Discord server/channels
DEBUG_MODE=true
TESTING_SERVER_IDS="your-test-server-id"
TESTING_CHANNEL_IDS="your-test-channel-id"

# Use staging database
DATABASE_URL="postgresql://starbunk_staging:staging_password@postgres_staging:5432/starbunk_staging"

# Same Qdrant instance (safe for testing)
QDRANT_URL="http://192.168.50.3:6333"
```

### 2.3 Deploy to Staging

```bash
# Start staging environment
./start-staging.sh

# Validate staging deployment
./staging/tests/validate-staging.sh

# Run load tests
./staging/tests/load-test.sh
```

### 2.4 Staging Validation Checklist

- [ ] Web interface accessible at http://localhost:8080
- [ ] Health checks passing
- [ ] Database connectivity working
- [ ] Qdrant integration functional
- [ ] Discord bot responding in test channels only
- [ ] LLM responses generating correctly
- [ ] Memory/personality system working
- [ ] Error handling graceful
- [ ] Performance within acceptable limits

## 📊 Phase 3: Production Monitoring Setup

### 3.1 Health Check Configuration

Ensure your production environment includes comprehensive health checks:

```yaml
# In docker-compose.latest.yml
healthcheck:
  test: ["CMD-SHELL", "curl -f http://localhost:7080/api/health || exit 1"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s
```

### 3.2 Logging Configuration

```bash
# Create production logging directory
mkdir -p /mnt/user/appdata/covabot/logs

# Configure log rotation
cat > /mnt/user/appdata/covabot/logrotate.conf << EOF
/mnt/user/appdata/covabot/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}
EOF
```

### 3.3 Monitoring Dashboard

Create a simple monitoring script for Unraid:

```bash
# Create monitoring script
cat > /mnt/user/appdata/covabot/monitor.sh << 'EOF'
#!/bin/bash
while true; do
    echo "=== CovaBot Status $(date) ==="
    docker ps --filter name=covabot --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    docker stats --no-stream covabot --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
    curl -s http://localhost:7080/api/health | jq '.' || echo "Health check failed"
    echo ""
    sleep 60
done
EOF

chmod +x /mnt/user/appdata/covabot/monitor.sh
```

## 🔄 Phase 4: Rollback Strategy

### 4.1 Pre-Deployment Backup

```bash
# Create backup before deployment
./backup-production.sh

# Verify backup integrity
ls -la ./backups/
```

### 4.2 Rollback Procedures

**Quick Rollback (Container Level):**
```bash
# Stop current container
docker-compose -f docker-compose.latest.yml down

# Revert to previous image
docker tag covabot-previous:latest ghcr.io/andrewgari/covabot:latest

# Restart with previous version
docker-compose -f docker-compose.latest.yml up -d
```

**Full Rollback (Data Level):**
```bash
# Stop services
docker-compose -f docker-compose.latest.yml down

# Restore data from backup
cp -r ./backups/latest/data/* /mnt/user/appdata/covabot/

# Restore database if needed
docker exec postgres psql -U starbunk -d starbunk < ./backups/latest/database.sql

# Restart services
docker-compose -f docker-compose.latest.yml up -d
```

### 4.3 Rollback Decision Matrix

| Issue Severity | Response Time | Action |
|----------------|---------------|---------|
| Critical (Bot down) | Immediate | Quick rollback |
| High (Errors > 10%) | < 15 minutes | Quick rollback |
| Medium (Performance) | < 1 hour | Investigate, rollback if needed |
| Low (Minor issues) | Next maintenance | Fix forward |

## 🚀 Phase 5: Gradual Deployment Approach

### 5.1 Deployment Sequence

**Step 1: Deploy Snapshot Version**
```bash
# Use snapshot version first
export COVABOT_IMAGE_TAG="snapshot"
docker-compose -f docker-compose.snapshot.yml up -d
```

**Step 2: Limited Testing**
- Test in restricted Discord channels
- Monitor for 2-4 hours
- Validate all core functionality

**Step 3: Gradual Rollout**
```bash
# If snapshot testing successful, deploy latest
docker-compose -f docker-compose.snapshot.yml down
docker-compose -f docker-compose.latest.yml up -d
```

**Step 4: Full Production**
- Enable all Discord servers
- Monitor closely for first 24 hours
- Gradually increase usage

### 5.2 Feature Flags

Implement feature flags for gradual feature rollout:

```bash
# Environment variables for feature control
ENABLE_ADVANCED_LLM=false
ENABLE_VECTOR_SEARCH=true
ENABLE_WEB_INTERFACE=true
MAX_CONCURRENT_REQUESTS=10
```

## 🚨 Phase 6: Emergency Procedures

### 6.1 Emergency Contacts

- **Primary**: Your contact information
- **Secondary**: Backup administrator
- **Discord Server**: Emergency channel for notifications

### 6.2 Emergency Shutdown

```bash
# Emergency stop all CovaBot services
docker-compose -f docker-compose.latest.yml down
docker stop $(docker ps -q --filter name=covabot)
```

### 6.3 Emergency Recovery

```bash
# Quick recovery procedure
cd /mnt/user/appdata/covabot
./emergency-recovery.sh
```

## 📈 Success Metrics

### 6.1 Deployment Success Criteria

- [ ] Container starts within 60 seconds
- [ ] Health checks pass within 2 minutes
- [ ] Web interface accessible
- [ ] Discord bot responds to test messages
- [ ] No critical errors in logs for first hour
- [ ] Memory usage < 512MB
- [ ] Response time < 5 seconds

### 6.2 Ongoing Monitoring

- **Daily**: Check health status and logs
- **Weekly**: Review performance metrics
- **Monthly**: Update dependencies and security patches

## 🔧 Troubleshooting Guide

### Common Issues and Solutions

**Issue: Container won't start**
```bash
# Check logs
docker logs covabot

# Check environment variables
docker exec covabot env | grep -E "(DISCORD|QDRANT|OPENAI)"

# Verify file permissions
ls -la /mnt/user/appdata/covabot/
```

**Issue: Qdrant connection failed**
```bash
# Test Qdrant connectivity
curl http://192.168.50.3:6333/collections

# Check network connectivity
docker exec covabot ping 192.168.50.3
```

**Issue: High memory usage**
```bash
# Check memory usage
docker stats covabot

# Restart container if needed
docker-compose restart covabot
```

## 📝 Deployment Checklist

### Pre-Deployment
- [ ] Production readiness tests pass
- [ ] Staging environment validated
- [ ] Backup created
- [ ] Rollback plan ready
- [ ] Monitoring configured

### During Deployment
- [ ] Deploy snapshot version first
- [ ] Monitor health checks
- [ ] Test core functionality
- [ ] Check logs for errors
- [ ] Validate performance

### Post-Deployment
- [ ] Full functionality test
- [ ] Performance monitoring
- [ ] Error rate monitoring
- [ ] User feedback collection
- [ ] Documentation updated

---

**Remember**: The goal is zero-downtime deployment with maximum confidence. Take your time, validate each step, and don't hesitate to rollback if anything seems wrong.
