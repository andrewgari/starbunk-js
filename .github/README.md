# VSCode AI Agents & Commands Reference

## 🎯 **START HERE: Talk to @pm or @tech-guy**

**You only need to talk to one bot.**
- Use `@pm` for product/feature initiatives
- Use `@tech-guy` for devtools, infra, deployment, or AI agent work

```
@pm: [Describe what you want to build]
@tech-guy: [Describe the technical task]
```

### The Flow
```
@pm or @tech-guy (Requirements) → @master-architect (Planning) → Specialists (Execution)
```

**@pm will:**
- ✅ Understand your goal and ask probing questions
- ✅ Work through requirements with you iteratively
- ✅ Create a detailed PRD (Product Requirements Document)
- ✅ Hand off to @master-architect when ready

**@tech-guy will:**
- ✅ Clarify environment and constraints (Docker/SSH/infra/devtools)
- ✅ Define scope, risks, and success criteria
- ✅ Produce a technical execution brief
- ✅ Hand off to @master-architect when ready

**@master-architect will:**
- ✅ Create technical execution plan
- ✅ Delegate to specialists (@ts-sorcerer, @grunt-worker, @test-guard, etc.)
- ✅ Coordinate the work
- ✅ Report back when done

**Strategic Approach**: All work is PRD-driven and references the master documents at `docs/PRD_SYSTEM_IMPLEMENTATION_PLAN.md` and `docs/PLAN.md`

---

## 📋 **Quick Links**

- **[Commands Cheat Sheet](COMMANDS_CHEAT_SHEET.md)** ⭐ Start here for command reference
- **[PM Workflow Guide](PM_WORKFLOW.md)** - How to work with @pm
- **[Operational Guide](OPERATIONAL_GUIDE.md)** - Complete guide
- **[Quick Reference Card](QUICK_REFERENCE.md)** - One-pagers

---

This directory contains specialized AI agents and reusable command templates for VSCode AI workflows, all aligned with active PRD initiatives.

## 🤖 Agent System Overview

The agent system uses a hierarchical structure where each agent has specific expertise, tools, and inter-agent communication protocols.

## 🤖 Agent System Overview

You communicate with **@pm**. They coordinate with **@master-architect**. Architect manages all other agents.

```
YOU
 ↓
@pm (Your Interface - Requirements & PRD Creation)
 ↓
@master-architect (Technical Lead - Planning & Execution)
 ├→ @ts-sorcerer (Type System Design)
 ├→ @data-architect (Database & Schema)
 ├→ @discord-expert (Discord API)
 ├→ @observability-engineer (Tracing & Monitoring)
 ├→ @grunt-worker (Implementation)
 │  ├→ @code-stylist (Code Review)
 │  └→ @test-guard (Testing)
 ├→ @ops-engineer (Infrastructure)
 └→ @github-liaison (Repository)
```

**All delegation happens automatically.** You start with @pm. They handle everything else.

## 📋 Available Agents

### 🏗️ pm
**Role**: Product Manager & Requirements Gatherer
**Expertise**: Initiative planning, PRD creation, scope definition, stakeholder alignment
**Talk to them for**: Defining new features, discussing requirements, clarifying scope

### 🛠️ tech-guy
**Role**: Technical PM for non-product work
**Expertise**: Docker, SSH, infrastructure, deployment, devtools, AI agents
**Talk to them for**: Devtools, CI/CD, infra, deployments, agent creation
**Expertise**: Zero-ambiguity handoffs, security gates, task delegation
**Use when**: Planning multi-step work, coordinating team, architectural decisions

**Key Capabilities**:
- Draft & Refine Planning Protocol
- Task Manifest generation
- Security gate enforcement (Snyk)
- Inter-agent delegation

### 🔮 ts-sorcerer
**Role**: TypeScript System Architect
**Expertise**: Advanced TypeScript patterns, type safety, zero-`any` policy
**Use when**: Type system design, refactoring for type safety, complex types

**Key Capabilities**:
- Discriminated unions
- Template literal types
- Branded types
- Type inference optimization
- Generic constraints

### 🗄️ data-architect (NEW)
**Role**: Database Schema Designer & Migration Specialist
**Expertise**: Schema design, query optimization, migrations
**Use when**: Database changes, performance optimization, data modeling

**Key Capabilities**:
- Schema normalization
- Index design
- Migration strategies (zero-downtime)
- Query optimization
- Data integrity enforcement

### 📊 observability-engineer (NEW)
**Role**: Tracing, Metrics & Monitoring Specialist
**Expertise**: OpenTelemetry, structured logging, alerting
**Use when**: Adding instrumentation, debugging production issues, creating dashboards

**Key Capabilities**:
- Distributed tracing with OpenTelemetry
- Prometheus metrics design
- Grafana dashboard creation
- Alert threshold configuration
- Log correlation

### 💬 discord-expert
**Role**: Discord API Platform Engineer
**Expertise**: Discord.js v14+, Discord API v10+, platform updates
**Use when**: Discord integration, bot commands, platform-specific features

**Key Capabilities**:
- Discord Gateway intents
- Permission management
- Slash commands
- Webhooks & interactions
- API deprecation awareness

### 🛠️ grunt-worker
**Role**: Pragmatic Executioner
**Expertise**: Clean implementation, minimal diffs, pattern application
**Use when**: Implementing features after design is approved

**Key Capabilities**:
- Surgical code changes
- Pattern adherence (Strategy, Pipeline, Observer)
- Minimalist footprint
- Direct manifest execution

### 🎨 code-stylist
**Role**: Code Aesthetics & Organization Specialist
**Expertise**: Naming conventions, folder structure, code elegance
**Use when**: Reviewing code quality, refactoring for clarity

**Key Capabilities**:
- Declarative naming enforcement
- Folder organization ("Zen")
- Import ordering
- Comment minimalism
- Git hygiene

### 🛡️ test-guard
**Role**: QA Lead & TDD Specialist
**Expertise**: Test coverage, testability, edge cases
**Use when**: Writing tests, ensuring quality, TDD workflows

**Key Capabilities**:
- Unit/Integration/E2E test design
- Test data factories
- Coverage enforcement (80%+)
- Flakiness detection
- Edge case identification

### 🚀 ops-engineer
**Role**: Infrastructure & Deployment Specialist
**Expertise**: Docker, CI/CD, Unraid, container orchestration
**Use when**: Deployment issues, infrastructure optimization, DevOps tasks

### 🔗 github-liaison
**Role**: Git Repository Manager
**Expertise**: Branching, PRs, Git workflows
**Use when**: Repository operations, branch management, merge conflicts

---

## ⚡ Quick Commands (PRD-Driven)

Commands are reusable prompts for common workflows. **Every command now requires PRD context** and validates work against PRD acceptance criteria.

### 📖 analyze-architecture.md
**Purpose**: Comprehensive codebase analysis aligned with strategic PRD initiatives
**PRD Dependent**: Yes
**Use when**: Starting new PRD initiatives, tech debt assessment, onboarding

**Required Context**:
- PRD initiative being analyzed
- Acceptance criteria from PRD
- Timeline constraints from PRD

### 🔄 design-refactor.md
**Purpose**: PRD-driven refactoring strategy with risk assessment
**PRD Dependent**: Yes
**Use when**: Planning major refactors tied to PRD acceptance criteria

**Required Context**:
- Related PRD reference
- PRD acceptance criteria
- PRD phase alignment

### 🔒 find-type-errors.md
**Purpose**: TypeScript type safety audit aligned with code quality PRD initiatives
**PRD Dependent**: Yes
**Use when**: Improving type coverage to meet PRD type-safety goals

**Required Context**:
- PRD initiative (e.g., zero-`any` policy)
- Type safety targets from PRD
- Package focus

### 🔐 find-security-issues.md
**Purpose**: PRD-aligned security audit and hardening workflow
**PRD Dependent**: Yes
**Use when**: Security reviews tied to PRD compliance requirements

**Required Context**:
- PRD initiative
- Security compliance targets
- Risk tolerance from PRD

### 🧪 design-tests.md
**Purpose**: PRD-driven test strategy ensuring acceptance criteria validation
**PRD Dependent**: Yes
**Use when**: Setting up testing aligned with PRD acceptance criteria

**Required Context**:
- Related PRD reference
- PRD acceptance criteria
- Coverage requirements from PRD

### ⚡ find-performance-issues.md
**Purpose**: PRD-aligned performance optimization with measurable impact
**PRD Dependent**: Yes
**Use when**: Performance improvements tied to PRD targets

**Required Context**:
- PRD initiative
- Target metrics from PRD
- Baseline from PRD

### 🚩 design-rollout.md
**Purpose**: PRD-driven feature flag strategy for controlled rollouts
**PRD Dependent**: Yes
**Use when**: Implementing controlled rollouts for PRD features

**Required Context**:
- PRD initiative
- Success metrics from PRD
- Rollback triggers from PRD risk assessment

### 📚 generate-api-docs.md
**Purpose**: PRD-aligned API documentation generation
**PRD Dependent**: Yes
**Use when**: Creating API docs for PRD-required endpoints

**Required Context**:
- Related PRD initiative
- API contracts from PRD
- PRD acceptance validation paths

### 🔀 design-migration.md
**Purpose**: PRD-aligned migration planning with acceptance validation
**PRD Dependent**: Yes
**Use when**: Database migrations, API versioning, architecture changes required by PRD

**Required Context**:
- PRD initiative
- Acceptance criteria
- Success validation from PRD

### ✅ fix-all-errors.md
**Purpose**: Iterative error elimination until local + CI are clean
**PRD Dependent**: Yes
**Use when**: CI is red or local checks fail and you want them fully green

**Required Context**:
- PRD initiative (if relevant)
- Required checks (type, lint, test, build)

### ✂️ simplify-codebase.md
**Purpose**: Reduce complexity and code size while staying PRD-aligned
**PRD Dependent**: Yes
**Use when**: Code feels bloated or overly complex

**Required Context**:
- PRD acceptance criteria to preserve
- Target areas for simplification

### 🧪 generate-unit-tests.md
**Purpose**: Generate unit tests from existing code
**PRD Dependent**: Yes
**Use when**: Coverage gaps or new modules lack tests

**Required Context**:
- Target modules/files
- Coverage expectations from PRD

### 📦 complete-github-issue.md
**Purpose**: End-to-end GitHub issue delivery (analysis → implementation → tests)
**PRD Dependent**: Yes
**Use when**: You want a full issue completed and PR-ready

**Required Context**:
- Issue number or link
- Acceptance criteria from issue/PRD

### 🧭 strategic-assessment.md
**Purpose**: High-level assessment with course correction + long-term plan
**PRD Dependent**: Yes
**Use when**: You need strategic direction and roadmap alignment

**Required Context**:
- Active PRDs
- Current priorities and timelines

### 🧠 ralph.md
**Purpose**: Simple, direct execution strategy for completing a task
**PRD Dependent**: Yes
**Use when**: You want the obvious, minimal path to completion

**Required Context**:
- Task to complete
- PRD acceptance criteria

---

## 📋 Usage Patterns

### Pattern 1: Simple Task (Typical)
```
YOU: @master-architect: Add a new Discord command for !version

@master-architect will:
1. Review requirements
2. Ask @discord-expert to validate Discord specifics
3. Ask @ts-sorcerer to design types
4. Ask @grunt-worker to implement
5. Ask @test-guard to write tests
6. Ask @code-stylist to review
7. Report completion to you
```

### Pattern 2: Complex Feature
```
YOU: @master-architect: Implement personality system with database persistence

@master-architect will:
1. Run: analyze-architecture.md
2. Delegate to @ts-sorcerer for type design
3. Delegate to @data-architect for schema
4. Delegate to @grunt-worker for implementation
5. Delegate to @test-guard for testing
6. Delegate to @observability-engineer for monitoring
7. Report with status and next steps
```

### Pattern 3: Bug Investigation
```
YOU: @master-architect: Production error in message processing - 500 errors after deploy

@master-architect will:
1. Ask @observability-engineer to analyze traces
2. Identify root cause
3. Delegate to appropriate specialist for fix
4. Verify fix with tests
5. Coordinate deployment
6. Confirm resolution
```

### Pattern 4: Using Commands (When You Need Specific Analysis)
```
YOU: @master-architect: Run find-type-errors.md on bunkbot package for PRD_INITIATIVE="Type Safety"

@master-architect will:
1. Execute the command with PRD context
2. Analyze results
3. Prioritize findings
4. Create refactoring plan
5. Delegate implementation
6. Report progress
```

## 🚀 PRD Integration

All commands are designed to be **PRD-driven**:

### How It Works
1. **Every command requires PRD context** - Specify which PRD initiative this work supports
2. **Acceptance criteria validation** - Work is validated against PRD acceptance criteria
3. **Timeline alignment** - Work is scheduled according to PRD phases
4. **Success metrics** - Outcomes measured against PRD-defined success criteria

### Command Variables for PRD Context
All commands support these PRD variables:
- `$PRD_INITIATIVE` - The PRD being executed (e.g., "Type Safety Improvement")
- `$ACCEPTANCE_CRITERIA` - Success criteria from the PRD
- `$PRD_REFERENCE` - Link to specific PRD document section
- `$PRD_CRITERIA` - Detailed acceptance criteria
- `$PRD_VALIDATION` - How success will be validated

### Example Invocation
```bash
# Set PRD context
export PRD_INITIATIVE="Personality Parser Type Safety"
export ACCEPTANCE_CRITERIA="No `as` assertions in YAML parsing"
export PRD_REFERENCE="docs/PLAN.md#acceptance-criteria"

# Run command with PRD context
# (VSCode AI will use these variables in the command)
```

---

## 🎓 Best Practices

### Agent Selection
- Use **master-architect** for planning and coordination
- Use **specialists** (ts-sorcerer, data-architect, etc.) for domain-specific tasks
- Use **grunt-worker** for implementation after design is complete
- Use **test-guard** immediately after implementation

### Communication Protocol
1. **Always tag agents** with `@agent-name` for explicit delegation
2. **Wait for handoff signals** before proceeding to next phase
3. **Include context** from previous agents (types, schemas, etc.)
4. **Document decisions** in package-local `TODO.md` files

### Quality Gates
Every change must pass:
- [ ] Type safety (zero `any`)
- [ ] Test coverage (80%+)
- [ ] Security scan (Snyk clean)
- [ ] Style guide (code-stylist approved)
- [ ] Observability (spans and metrics added)
- [ ] Documentation updated

### File Organization
```
.github/
  agents/           # Agent definitions (.agent.md)
  commands/         # Command templates (.md)
  instructions/     # Always-on rules (.instructions.md)
```

---

## 🚀 Quick Start

### 1. Invoke an Agent
```
@master-architect: Plan implementation of new personality system
```

### 2. Run a Command
Select and run a command template from `.github/commands/`

### 3. Follow the Protocol
Let agents hand off work between each other using explicit delegation

---

## � Related Documentation
- [PRD System Implementation Plan](../../docs/PRD_SYSTEM_IMPLEMENTATION_PLAN.md) - Master document for PRD system
- [PLAN - Type Safety Initiative](../../docs/PLAN.md) - Active PRD for personality parser type safety
- [AGENTS.md](../../docs/AGENTS.md) - Legacy n8n agent guidelines
- [SYSTEM_SPEC.md](../../docs/SYSTEM_SPEC.md) - System architecture
- [Snyk Rules](./instructions/snyk_rules.instructions.md) - Security guidelines

---

**Last Updated**: January 30, 2026
**Version**: 2.1.0 (PRD-Driven)
**Strategic Approach**: All work aligned with `docs/PRD_SYSTEM_IMPLEMENTATION_PLAN.md`
**Maintainer**: @master-architect
