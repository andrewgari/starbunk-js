description = "PRD-driven feature flag strategy for controlled rollouts"
prompt = """
# Feature Flag Implementation Command

## 🎯 PRD Alignment
**Initiative**: Feature flag system for PRD-driven controlled rollouts
**Reference**: `docs/PRD_SYSTEM_IMPLEMENTATION_PLAN.md` Phase 2-3
**Purpose**: Enable safe, measurable rollout of features tied to PRD success metrics

You are implementing a comprehensive feature flag system for controlled rollouts aligned with PRD initiatives.

## Feature Flag Strategy

### Phase 1: Architecture Design
1. **Flag Types**
   - **Release Flags**: Enable/disable features in production
   - **Experiment Flags**: A/B testing and experimentation
   - **Ops Flags**: Circuit breakers and system controls
   - **Permission Flags**: Role-based feature access

2. **Flag Evaluation Context**
   ```typescript
   interface EvaluationContext {
     userId?: string
     guildId?: string
     environment: 'dev' | 'staging' | 'prod'
     botPersonality?: string
     customProperties?: Record<string, any>
   }
   ```

### Phase 2: Implementation Pattern
```typescript
// Flag definition
interface FeatureFlag {
  key: string
  name: string
  description: string
  type: 'release' | 'experiment' | 'ops' | 'permission'
  enabled: boolean

  // Rollout rules
  rollout?: {
    percentage?: number  // 0-100
    userIds?: string[]
    guildIds?: string[]
    attributes?: Record<string, string[]>
  }

  // Variants for A/B testing
  variants?: {
    key: string
    name: string
    weight: number  // Percentage
    payload?: any
  }[]

  // Metadata
  createdAt: Date
  updatedAt: Date
  createdBy: string
  tags: string[]
}
```

### Phase 3: Feature Flag Service
```typescript
import { FeatureFlag, EvaluationContext } from './types'

class FeatureFlagService {
  private flags: Map<string, FeatureFlag> = new Map()

  /**
   * Check if a feature is enabled for the given context
   */
  async isEnabled(
    flagKey: string,
    context: EvaluationContext,
    defaultValue = false
  ): Promise<boolean> {
    const flag = this.flags.get(flagKey)
    if (!flag) return defaultValue

    // Global kill switch
    if (!flag.enabled) return false

    // Evaluate rollout rules
    return this.evaluateRollout(flag, context)
  }

  /**
   * Get variant for A/B testing
   */
  async getVariant(
    flagKey: string,
    context: EvaluationContext
  ): Promise<string> {
    const flag = this.flags.get(flagKey)
    if (!flag || !flag.variants) return 'control'

    // Consistent hashing for stable variant assignment
    const hash = this.hashContext(flagKey, context.userId)
    const bucket = hash % 100

    let cumulative = 0
    for (const variant of flag.variants) {
      cumulative += variant.weight
      if (bucket < cumulative) {
        return variant.key
      }
    }

    return 'control'
  }

  /**
   * Evaluate rollout rules
   */
  private evaluateRollout(
    flag: FeatureFlag,
    context: EvaluationContext
  ): boolean {
    const { rollout } = flag
    if (!rollout) return true

    // Specific user targeting
    if (rollout.userIds?.includes(context.userId)) {
      return true
    }

    // Guild targeting
    if (rollout.guildIds?.includes(context.guildId)) {
      return true
    }

    // Attribute matching
    if (rollout.attributes) {
      for (const [key, values] of Object.entries(rollout.attributes)) {
        if (!values.includes(context.customProperties?.[key])) {
          return false
        }
      }
    }

    // Percentage rollout
    if (rollout.percentage !== undefined) {
      const hash = this.hashContext(flag.key, context.userId)
      return (hash % 100) < rollout.percentage
    }

    return true
  }

  /**
   * Consistent hash for stable assignments
   */
  private hashContext(flagKey: string, userId?: string): number {
    const input = `${flagKey}:${userId || 'anonymous'}`
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) - hash) + input.charCodeAt(i)
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }
}
```

### Phase 4: Usage Patterns
```typescript
// Simple flag check
if (await flags.isEnabled('new-personality-system', { userId, guildId })) {
  return newPersonalityHandler.handle(message)
} else {
  return legacyPersonalityHandler.handle(message)
}

// A/B testing
const variant = await flags.getVariant('message-formatting', { userId })
switch (variant) {
  case 'rich-embeds':
    return formatAsRichEmbed(content)
  case 'markdown':
    return formatAsMarkdown(content)
  default:
    return formatAsPlainText(content)
}

// Gradual rollout
const rolloutConfig = {
  key: 'ai-command-parser',
  enabled: true,
  rollout: {
    percentage: 10, // Start with 10% of users
    guildIds: ['test-guild-123'], // Always enable for test guild
  }
}

// Circuit breaker pattern
if (!await flags.isEnabled('external-api-calls', { environment })) {
"""
