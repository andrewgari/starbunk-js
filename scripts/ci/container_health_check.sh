#!/usr/bin/env bash
set -euo pipefail

# Usage: container_health_check.sh <docker-image-tag> [timeout-seconds]
# Example: container_health_check.sh ghcr.io/org/bunkbot:abcd1234 180

IMAGE_TAG=${1:?Docker image tag (e.g. repo/image:tag) required}
TIMEOUT=${2:-180}

# Generate a unique, temporary container name based on the image tag
# Keep only safe characters in the name
base_name="$(echo "${IMAGE_TAG##*/}" | tr -c '[:alnum:]._-' '-')"
CONTAINER_NAME="${base_name}-hc-$(date +%s)-$RANDOM"

cleanup() {
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

echo "Starting health-check container: $CONTAINER_NAME from image: $IMAGE_TAG"

# Run a new detached container for health verification
docker run --rm --name "$CONTAINER_NAME" -d \
  -e CI_SMOKE_MODE=true \
  -e METRICS_PORT=3000 \
  "$IMAGE_TAG" >/dev/null

# Poll for docker health status to become 'healthy'
end=$((SECONDS + TIMEOUT))
STATUS="unknown"
while [ $SECONDS -lt $end ]; do
  STATUS=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$CONTAINER_NAME" || echo none)
  echo "Health status: $STATUS"
  if [[ "$STATUS" == "healthy" ]]; then
    break
  fi
  # If the container has exited, fail fast
  if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "Container exited before becoming healthy" >&2
    docker logs "$CONTAINER_NAME" || true
    exit 1
  fi
  sleep 5
done

if [[ "$STATUS" != "healthy" ]]; then
  echo "Container did not become healthy within ${TIMEOUT}s" >&2
  docker ps -a || true
  docker logs "$CONTAINER_NAME" || true
  exit 1
fi

# Additional in-container health probe using curl
echo "Executing in-container health probe: curl http://127.0.0.1:3000/live"
docker exec "$CONTAINER_NAME" sh -lc "curl -fsS http://127.0.0.1:3000/live" >/dev/null

echo "Health checks passed for $CONTAINER_NAME"
