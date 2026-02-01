description = "PRD-aligned migration planning with acceptance validation"
prompt = """
# Migration Planner & Executor

## 🎯 PRD-Driven Migration
**Strategic Goal**: Execute migrations required by PRD acceptance criteria
**Reference**: `docs/PRD_SYSTEM_IMPLEMENTATION_PLAN.md` Phase 1-3, `docs/PLAN.md`

Migration must achieve PRD acceptance criteria, follow PRD timeline, and validate success against PRD metrics.

You are planning and executing a complex migration with zero downtime and minimal risk aligned with PRD requirements.

## Migration Planning Protocol

### Phase 1: Migration Assessment
1. **Classify Migration Type**
   - **Database Migration**: Schema changes, data transformations
   - **API Migration**: Versioning, breaking changes, deprecation
   - **Architecture Migration**: Monolith → Microservices, framework changes
   - **Infrastructure Migration**: Cloud provider, hosting, container orchestration
   - **Dependency Migration**: Library upgrades, language version changes

2. **Impact Analysis**
   ```markdown
   ## Impact Assessment
   - **Affected Systems**: [List all impacted services/components]
   - **Breaking Changes**: [Y/N and details]
   - **Downtime Required**: [Expected minutes]
   - **Rollback Complexity**: [Easy/Moderate/Hard]
   - **Risk Level**: [Low/Medium/High/Critical]
   - **Stakeholder Impact**: [Users affected, % of functionality]
   ```

### Phase 2: Database Migration Strategy

#### Schema Change Patterns
```typescript
// ✅ SAFE: Additive changes (no downtime)
// 1. Add new column (nullable or with default)
await db.schema.alterTable('users', (table) => {
  table.string('email').nullable()
})

// 2. Deploy code that writes to both old and new columns
// 3. Backfill data
await db('users').update({
  email: db.raw('CONCAT(username, "@example.com")')
})

// 4. Make column non-nullable (after backfill complete)
await db.schema.alterTable('users', (table) => {
  table.string('email').notNullable().alter()
})

// 5. Deploy code that only uses new column
// 6. Drop old column (in future migration)

// ❌ UNSAFE: Destructive changes (causes downtime)
await db.schema.alterTable('users', (table) => {
  table.dropColumn('old_field') // Data loss!
  table.renameColumn('old', 'new') // Breaks existing code!
})
```

#### Expand-Contract Pattern
```markdown
## Phase 1: EXPAND (Add new schema)
- Add new tables/columns
- Deploy code that writes to BOTH old and new
- Old code continues reading from old schema
- New code reads from new schema

## Phase 2: MIGRATE (Data transformation)
- Backfill historical data
- Validate data integrity
- Run in parallel (old and new)
- Monitor for discrepancies

## Phase 3: CONTRACT (Remove old schema)
- Stop writing to old schema
- Deploy code using only new schema
- After stabilization, drop old tables/columns
- Update documentation
```

### Phase 3: API Migration Strategy

#### API Versioning Patterns
```typescript
// URL-based versioning
app.use('/api/v1', v1Router)
app.use('/api/v2', v2Router)

// Header-based versioning
app.use((req, res, next) => {
  const version = req.headers['api-version'] || 'v1'
  req.apiVersion = version
  next()
})

// Gradual rollout with feature flags
if (await featureFlags.isEnabled('use-v2-api', { userId })) {
  return v2Handler(req, res)
} else {
  return v1Handler(req, res)
}
```

#### Deprecation Timeline
```markdown
## API Deprecation Process

### Week 1-2: Announcement
- [ ] Add deprecation warnings to responses
- [ ] Update documentation with migration guide
- [ ] Email affected users
- [ ] Add sunset header: `Sunset: Sat, 1 Jan 2027 23:59:59 GMT`

### Week 3-6: Transition Period
- [ ] Log usage of deprecated endpoints
- [ ] Reach out to high-usage consumers
- [ ] Provide migration assistance
- [ ] Monitor adoption of new endpoints

### Week 7-8: Enforcement
- [ ] Return 410 Gone for deprecated endpoints
- [ ] Provide clear error messages with migration path
- [ ] Offer grace period for critical users

### Week 9+: Cleanup
- [ ] Remove deprecated code
- [ ] Archive documentation
- [ ] Update SDKs
```

### Phase 4: Data Migration Scripts

#### Safe Data Transformation
```typescript
// Migration script with safety checks
import { db } from '@/database'
import { logger } from '@/logger'

interface MigrationResult {
  success: boolean
  processed: number
  failed: number
  errors: Array<{ id: string; error: string }>
}

async function migrateUserEmails(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    processed: 0,
    failed: 0,
    errors: []
  }

  // 1. Count total records
  const total = await db('users').where('email', null).count('* as count')
  logger.info(`Starting migration of ${total} users`)

  // 2. Process in batches
  const batchSize = 1000
  let offset = 0

  while (offset < total) {
    const users = await db('users')
      .where('email', null)
      .limit(batchSize)
      .offset(offset)

    for (const user of users) {
      try {
        // 3. Transform data
        const email = generateEmailFromUsername(user.username)

        // 4. Validate
        if (!isValidEmail(email)) {
          throw new Error('Invalid email generated')
        }

        // 5. Update
        await db('users')
          .where('id', user.id)
          .update({ email })

        result.processed++
      } catch (error) {
        result.failed++
        result.errors.push({
          id: user.id,
          error: error.message
        })
        logger.error('Migration failed for user', { userId: user.id, error })
      }
    }

    offset += batchSize
    logger.info(`Progress: ${offset}/${total}`)
"""
