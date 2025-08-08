# Starbunk Bot Observability Stack

This document describes the comprehensive observability integration for the Starbunk bot ecosystem, including Prometheus metrics, Grafana dashboards, and Loki logging.

## Features

### 📊 Metrics Collection
- **Message Flow Tracking**: Every message is tracked with bot responses, triggers, and skip reasons
- **Bot-Specific Labels**: Separate metrics for bunkbot, covabot, djcova, and starbunk-dnd
- **Channel Activity**: Messages per minute, active users, bot vs human ratios
- **Circuit Breaker Monitoring**: Track bot failures and circuit breaker activations
- **System Metrics**: Memory usage, uptime, request counts

### 📝 Structured Logging
- **JSON Formatted Logs**: All logs are structured for easy parsing
- **Correlation IDs**: Track message processing across the entire pipeline
- **Event-Based Logging**: Message received, bot triggered, bot responded, errors
- **Loki Integration**: Centralized log aggregation with searchable labels

### 🎯 Channel Activity Analytics
- **Real-time Activity**: Track message volume and user engagement
- **Bot Response Analytics**: Success rates, response times, activity patterns
- **Server-wide Metrics**: Cross-channel activity monitoring

## Environment Configuration

Update your `.env` file with your observability stack URLs:

```bash
# Observability Stack URLs (update with your LAN IPs)
PROMETHEUS_URL=http://192.168.1.100:9090
GRAFANA_URL=http://192.168.1.100:3000
LOKI_URL=http://192.168.1.100:3100
PROMETHEUS_PUSHGATEWAY_URL=http://192.168.1.100:9091

# Health check ports for Prometheus scraping
BUNKBOT_HEALTH_PORT=3002
COVABOT_HEALTH_PORT=3003
DJCOVA_HEALTH_PORT=3004
STARBUNK_DND_HEALTH_PORT=3005

# Observability features
ENABLE_METRICS=true
ENABLE_STRUCTURED_LOGGING=true
METRICS_PUSH_INTERVAL=30000
LOG_FORMAT=json
```

## Quick Start

This observability integration is designed to work with your **existing Grafana/Prometheus/Loki server** at `192.168.50.3`.

### 1. Configure Prometheus Scraping

Add these scrape targets to your existing Prometheus configuration:

```yaml
scrape_configs:
  # BunkBot metrics
  - job_name: 'bunkbot'
    static_configs:
      - targets: ['192.168.50.3:3002']  # Or your bot server IP
    scrape_interval: 30s
    metrics_path: '/metrics'

  # CovaBot metrics  
  - job_name: 'covabot'
    static_configs:
      - targets: ['192.168.50.3:3003']
    scrape_interval: 30s
    metrics_path: '/metrics'

  # DJCova metrics
  - job_name: 'djcova'
    static_configs:
      - targets: ['192.168.50.3:3004']
    scrape_interval: 30s
    metrics_path: '/metrics'

  # Starbunk-DND metrics
  - job_name: 'starbunk-dnd'
    static_configs:
      - targets: ['192.168.50.3:3005']
    scrape_interval: 30s
    metrics_path: '/metrics'
```

### 2. Access Your Existing Dashboards

- **Grafana**: http://192.168.50.3:3030
- **Prometheus**: http://192.168.50.3:9090  
- **Loki**: http://192.168.50.3:3100

### 3. Start Your Bots

```bash
# Start all bot containers - they will automatically expose metrics and send logs
docker-compose up -d
```

## Metrics Available

### Message Flow Metrics
- `discord_messages_processed_total{service, bot, user_id, channel_id}` - Total messages processed
- `bot_triggers_total{service, bot, condition, channel_id}` - Bot trigger events
- `bot_responses_total{service, bot, condition}` - Successful bot responses
- `bot_skips_total{service, bot, reason, condition}` - Messages skipped by bots
- `bot_response_duration_ms{service, bot, condition}` - Response latency histogram

### Channel Activity Metrics
- `channel_messages_per_minute{service, channel_id, channel_name, guild_id}` - Message rate per channel
- `channel_active_users{service, channel_id, channel_name}` - Active user count
- `channel_bot_message_ratio{service, channel_id}` - Ratio of bot to human messages

### System Health Metrics
- `circuit_breaker_open{service, bot}` - Circuit breaker status (1=open, 0=closed)
- `circuit_breaker_activations_total{service, bot, reason}` - Circuit breaker triggers
- `memory_usage_bytes{service, type}` - Memory usage by type
- `bot_instances_loaded{service}` - Number of loaded bot instances

## Log Structure

### Message Flow Logs
```json
{
  "event": "bot_responded",
  "bot_name": "attitude-bot",
  "condition_name": "attitude_trigger",
  "message_text": "wow that's amazing",
  "user_id": "123456789",
  "user_name": "username",
  "channel_id": "987654321",
  "channel_name": "general",
  "guild_id": "555666777",
  "response_text": "That's the spirit! 🎉",
  "response_latency_ms": 45,
  "circuit_breaker_open": false,
  "timestamp": "2025-01-01T12:00:00.000Z",
  "service": "bunkbot",
  "level": "info"
}
```

### Channel Activity Logs
```json
{
  "event": "channel_activity",
  "channel_id": "987654321",
  "channel_name": "general",
  "guild_id": "555666777",
  "message_count": 15,
  "user_count": 5,
  "bot_message_count": 3,
  "human_message_count": 12,
  "active_users": ["user1", "user2", "user3"],
  "timestamp": "2025-01-01T12:00:00.000Z",
  "service": "bunkbot",
  "level": "info"
}
```

## Dashboard Queries

### Bot Trigger Success Rate
```promql
rate(bot_triggers_total{service="bunkbot"}[5m]) / rate(discord_messages_processed_total{service="bunkbot"}[5m])
```

### Top Active Channels
```promql
topk(10, rate(channel_messages_per_minute[5m]))
```

### Bot Response Time P95
```promql
histogram_quantile(0.95, rate(bot_response_duration_ms_bucket{service="bunkbot"}[5m]))
```

### Circuit Breaker Status
```promql
circuit_breaker_open{service="bunkbot"}
```

## Health Endpoints

Each bot container exposes health endpoints:

- `GET /health` - Overall health status with detailed metrics
- `GET /ready` - Readiness check (Discord connection status)
- `GET /live` - Liveness check (process uptime)
- `GET /metrics` - Prometheus metrics endpoint
- `GET /status` - Detailed status including observability data

## Troubleshooting

### No Metrics Appearing
1. Check bot health endpoints: `curl http://192.168.50.3:3002/metrics`
2. Verify Prometheus targets: Check http://192.168.50.3:9090/targets
3. Ensure ENABLE_METRICS=true in .env
4. Check that your bot containers are running and accessible from the Prometheus server

### Missing Logs in Loki
1. Verify LOG_FORMAT=json in .env
2. Check Loki ingestion: http://192.168.50.3:3100/ready
3. Verify LOKI_URL is accessible from bot containers to your Loki server

### High Memory Usage
1. Monitor memory metrics: `memory_usage_bytes{type="heap_used"}`
2. Check for memory leaks in channel activity cache
3. Adjust METRICS_PUSH_INTERVAL if needed

## Advanced Configuration

### Custom Metrics
```typescript
import { getMetrics } from '@starbunk/shared';

const metrics = getMetrics();
metrics.incrementCounter('custom_events_total', { type: 'special_action' });
metrics.setGauge('custom_gauge', 42, { instance: 'bot1' });
```

### Custom Logging
```typescript
import { getStructuredLogger } from '@starbunk/shared';

const logger = getStructuredLogger();
logger.logBotInteraction('my-bot', 'custom_event', {
  custom_field: 'value',
  importance: 'high'
});
```

## Data Retention

- **Prometheus**: 15 days (configurable in prometheus.yml)
- **Loki**: Configurable in loki.yml (default: no retention limit)
- **Channel Activity Cache**: 24 hours of inactivity

## Performance Impact

- **CPU**: ~1-2% additional CPU usage per container
- **Memory**: ~10-50MB additional memory per container
- **Network**: ~1-5KB/minute of metrics traffic
- **Storage**: ~100MB/day of time series data (varies with activity)

This observability stack provides comprehensive insight into your bot ecosystem's performance, user engagement, and system health.