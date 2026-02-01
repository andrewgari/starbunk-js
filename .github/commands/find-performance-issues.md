description = "PRD-aligned performance optimization with measurable impact"
prompt = """
# Performance Optimization Command

## 🎯 Strategic Context
**PRD Reference**: Performance requirements from active initiatives
**Success Definition**: Meet or exceed PRD-defined performance targets

Optimization must address PRD performance acceptance criteria and measure impact against PRD baseline metrics.

You are conducting a comprehensive performance audit and implementing optimizations aligned with PRD targets.

## Profiling Protocol

### Phase 1: Baseline Measurement
1. **Response Time Analysis**
   ```bash
   # Run load tests
   k6 run load-tests/baseline.js

   # Profile Node.js
   node --prof src/index.js
   node --prof-process isolate-*.log > profile.txt
   ```

2. **Key Metrics to Capture**
   - Request throughput (req/sec)
   - Response time (p50, p95, p99, max)
   - Memory usage (heap, RSS)
   - CPU usage
   - Event loop lag
   - Database query times

### Phase 2: Bottleneck Identification
1. **CPU Profiling**
   ```typescript
   // Use clinic.js
   clinic doctor -- node src/index.js
   clinic flame -- node src/index.js
   clinic bubbleprof -- node src/index.js
   ```

2. **Memory Profiling**
   ```bash
   # Heap snapshots
   node --inspect src/index.js
   # Chrome DevTools: Memory -> Take snapshot

   # Track memory leaks
   clinic heapprofiler -- node src/index.js
   ```

3. **Database Performance**
   ```sql
   -- PostgreSQL slow query log
   SELECT
     calls,
     mean_exec_time,
     max_exec_time,
     query
   FROM pg_stat_statements
   ORDER BY mean_exec_time DESC
   LIMIT 20;
   ```

### Phase 3: Optimization Strategies

#### Algorithm Optimization
```typescript
// ❌ Inefficient O(n²)
for (const user of users) {
  for (const message of messages) {
    if (message.userId === user.id) {
      user.messages.push(message)
    }
  }
}

// ✅ Optimized O(n)
const messagesByUser = groupBy(messages, 'userId')
for (const user of users) {
  user.messages = messagesByUser[user.id] || []
}
```

#### Caching Strategy
```typescript
import { LRUCache } from 'lru-cache'

// Cache expensive computations
const cache = new LRUCache<string, Result>({
  max: 500,
  ttl: 1000 * 60 * 5, // 5 minutes
  updateAgeOnGet: true
})

async function getExpensiveData(key: string): Promise<Result> {
  const cached = cache.get(key)
  if (cached) return cached

  const result = await expensiveOperation(key)
  cache.set(key, result)
  return result
}
```

#### Database Optimization
```typescript
// ❌ N+1 queries
const users = await db.users.findMany()
for (const user of users) {
  user.profile = await db.profiles.findUnique({
    where: { userId: user.id }
  })
}

// ✅ Single query with JOIN
const users = await db.users.findMany({
  include: { profile: true }
})
```

#### Async Optimization
```typescript
// ❌ Sequential (slow)
const result1 = await fetchFromAPI1()
const result2 = await fetchFromAPI2()
const result3 = await fetchFromAPI3()

// ✅ Parallel (fast)
const [result1, result2, result3] = await Promise.all([
  fetchFromAPI1(),
  fetchFromAPI2(),
  fetchFromAPI3()
])
```

#### Memory Optimization
```typescript
// ❌ Memory leak - event listeners not cleaned
class Service {
  constructor() {
    eventEmitter.on('data', this.handleData)
  }
}

// ✅ Proper cleanup
class Service {
  private controller = new AbortController()

  constructor() {
    eventEmitter.on('data', this.handleData, {
      signal: this.controller.signal
    })
  }

  destroy() {
    this.controller.abort()
  }
}
```

### Phase 4: Concurrency & Batching
```typescript
// Rate limiting with p-limit
import pLimit from 'p-limit'

const limit = pLimit(10) // Max 10 concurrent requests

const results = await Promise.all(
  items.map(item => limit(() => processItem(item)))
)

// Batching for bulk operations
import pMap from 'p-map'

await pMap(
  largeArray,
  async (item) => await process(item),
  { concurrency: 5 }
)
```

### Phase 5: Bundle Size Optimization
```bash
# Analyze bundle
npx vite-bundle-visualizer

# Check for duplicate dependencies
npx depcheck

# Tree-shaking check
npm ls [package-name]
```

### Phase 6: Load Testing
```javascript
// k6 load test script
import http from 'k6/http';
import { check, sleep } from 'k6';
```
"""
