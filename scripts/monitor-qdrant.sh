#!/bin/bash

QDRANT_URL=${1:-"http://localhost:6333"}

echo "📊 Qdrant Performance Metrics"
echo "=============================="

# Collection stats (from PR 248 services)
for collection in covabot_personality covabot_conversations covabot_memory; do
    echo "📁 Collection: $collection"
    curl -s "$QDRANT_URL/collections/$collection" | jq -r '
        .result | 
        "  Vectors: \(.vectors_count // 0)",
        "  Indexed: \(.indexed_vectors_count // 0)",
        "  Points: \(.points_count // 0)",
        "  Segments: \(.segments_count // 0)"
    ' 2>/dev/null || echo "  ❌ Unable to fetch stats"
    echo ""
done

# System metrics
echo "🖥️  System Metrics:"
echo "  Memory usage:"
curl -s "$QDRANT_URL/metrics" | grep -E "(qdrant_collections_total|qdrant_points_total)" || echo "  ❌ Unable to fetch metrics"

# Cluster status
echo ""
echo "🔗 Cluster Status:"
curl -s "$QDRANT_URL/cluster" | jq '.result' 2>/dev/null || echo "  ❌ Unable to fetch cluster info"

echo ""
echo "🎯 Performance Summary:"
total_points=0
for collection in covabot_personality covabot_conversations covabot_memory; do
    points=$(curl -s "$QDRANT_URL/collections/$collection" | jq -r '.result.points_count // 0' 2>/dev/null)
    if [[ "$points" =~ ^[0-9]+$ ]]; then
        total_points=$((total_points + points))
    fi
done
echo "  Total Points: $total_points"
echo "  Collections: 3"
echo "  Status: $(curl -s "$QDRANT_URL/" | jq -r '.title' 2>/dev/null || echo 'Unknown')"
