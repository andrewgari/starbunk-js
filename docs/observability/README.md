# Observability: Metrics, Health, and Logs

This repo standardizes container health and metrics endpoints so Grafana (Prometheus + Loki) can discover and use them consistently.

## Standard ports and environment

- Internal metrics and health endpoints: `METRICS_PORT` (default: 3000), `HEALTH_PORT` (default: 3000) inside each container
  - These can be configured via environment variables to avoid port conflicts
  - Example: Set `METRICS_PORT=3001` and `HEALTH_PORT=3001` in your `.env` file
- Published host ports (defaults; override as needed):
  - BunkBot: `${BUNKBOT_METRICS_PORT:-9301} -> ${METRICS_PORT:-3000}`
  - CovaBot: `${COVABOT_METRICS_PORT:-9303} -> ${METRICS_PORT:-3000}`
  - DJCova: `${DJCOVA_METRICS_PORT:-9304} -> ${METRICS_PORT:-3000}`
  - Starbunk‑DND: `${STARBUNK_DND_METRICS_PORT:-9305} -> ${METRICS_PORT:-3000}`

All services expose:
- GET /metrics (Prometheus format)
- GET /health (200 OK on healthy, JSON payload)

## Docker labels for discovery

Each service/container includes labels (in Dockerfiles and docker-compose):
- `com.starbunk.service=<name>`
- `prometheus.io/scrape=true`
- `prometheus.io/path=/metrics`
- `prometheus.io/port=3000` (Note: Update this label if you change `METRICS_PORT`)

Prometheus can auto-discover this via docker_sd_configs.

## Prometheus config (Unraid friendly)

See example:
- `docs/observability/prometheus.yml.example`

It includes both Docker discovery and a static target fallback (localhost:9301/9303/9304/9305) if Prometheus is not running in Docker.

## Promtail (Loki) config

See example:
- `docs/observability/promtail.yml.example`

This collects Docker logs and adds useful labels like `service` (from `com.starbunk.service`).

## CI smoke mode recap

In CI, each container can start in `CI_SMOKE_MODE=true` which:
- Skips external connections (e.g., Discord login)
- Serves `GET /health` on `HEALTH_PORT` (CI sets unique ports per container)

For production, the unified HttpEndpointsService serves `/metrics` and `/health` on `METRICS_PORT` (default: 3000) in all services.

