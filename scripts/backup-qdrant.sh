#!/bin/bash
set -euo pipefail

BACKUP_DIR=${1:-"/mnt/user/appdata/qdrant/backups"}
QDRANT_URL=${2:-"http://localhost:6333"}
STORAGE_PATH=${3:-${QDRANT_STORAGE_PATH:-"/mnt/user/appdata/qdrant/storage"}}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="qdrant_backup_$TIMESTAMP"

echo "🔄 Starting Qdrant backup..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create snapshots via API for each collection from PR 248
echo "📸 Creating collection snapshots..."
for collection in covabot_personality covabot_conversations covabot_memory; do
    echo "  Creating snapshot for $collection..."
    http_code=$(curl -s -o /dev/null -w '%{http_code}' \
        -X POST "$QDRANT_URL/collections/$collection/snapshots" \
        -H "Content-Type: application/json" \
        -d '{}')
    if [ "$http_code" = "200" ]; then
        echo "  ✅ Snapshot created for $collection"
    else
        echo "  ⚠️  Failed to create snapshot for $collection (HTTP $http_code)"
    fi
done

# Copy storage directory (if accessible)
if [ -d "$STORAGE_PATH" ]; then
    echo "📦 Creating storage backup..."
    tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" -C "$(dirname "$STORAGE_PATH")" "$(basename "$STORAGE_PATH")" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✅ Storage backup completed: $BACKUP_NAME.tar.gz"
    else
        echo "⚠️  Storage backup failed"
    fi
else
    echo "⚠️  Storage directory not accessible, skipping file backup"
fi

# Create metadata file
cat > "$BACKUP_DIR/$BACKUP_NAME.metadata" << EOF
{
  "timestamp": "$TIMESTAMP",
  "qdrant_version": "$(command -v jq >/dev/null 2>&1 && \
      curl -s "$QDRANT_URL/" | jq -r '.version' 2>/dev/null || echo 'unknown')",
  "collections": ["covabot_personality", "covabot_conversations", "covabot_memory"],
  "backup_type": "full",
  "created_by": "backup-qdrant.sh"
}
EOF

echo "📋 Backup metadata created: $BACKUP_NAME.metadata"

# Cleanup old backups (keep last 7 days)
echo "🧹 Cleaning up old backups..."
find "$BACKUP_DIR" -name "qdrant_backup_*.tar.gz" -mtime +7 -delete 2>/dev/null
find "$BACKUP_DIR" -name "qdrant_backup_*.metadata" -mtime +7 -delete 2>/dev/null

echo "✅ Backup process completed!"
echo "   Backup location: $BACKUP_DIR"
echo "   Backup name: $BACKUP_NAME"
