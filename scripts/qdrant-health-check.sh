#!/bin/bash

QDRANT_URL=${1:-"http://localhost:6333"}

echo "🔍 Checking Qdrant health..."

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo "⚠️  jq not found - JSON parsing will be limited"
fi

# Basic health check (using root endpoint since /health doesn't exist in v1.7.4)
if curl -s "$QDRANT_URL/" | grep -q "qdrant"; then
    echo "✅ Qdrant is healthy"
    version=$(curl -s "$QDRANT_URL/" | jq -r '.version' 2>/dev/null || echo "unknown")
    echo "   Version: $version"
else
    echo "❌ Qdrant health check failed"
    exit 1
fi

# Check collections
echo "📊 Checking collections..."
collections=$(curl -s "$QDRANT_URL/collections" | jq -r '.result.collections[].name' 2>/dev/null)

if [ -n "$collections" ]; then
    echo "✅ Collections found:"
    echo "$collections" | sed 's/^/  - /'
else
    echo "⚠️  No collections found (this is normal for new setup)"
fi

# Check cluster info
echo "🖥️  Cluster information:"
curl -s "$QDRANT_URL/cluster" | jq '.result' 2>/dev/null || echo "Unable to fetch cluster info"

echo "🎉 Health check complete!"
