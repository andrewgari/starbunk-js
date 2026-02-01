# Agent Workflow & Task Management

This document describes the AI agent workflow for coordinating development tasks on the StarBunk project.

## Task Coordination

Use standardized manifests for zero-ambiguity work:

- Scoped manifests:
    - [src/bluebot/TODO.md](../src/bluebot/TODO.md)
    - [src/bunkbot/TODO.md](../src/bunkbot/TODO.md)
    - [src/covabot/TODO.md](../src/covabot/TODO.md)

Each manifest entry must define:
- Context (Issue/User Story link)
- File scope (absolute paths)
- The change (logic + pattern references)
- Validation gates:
    - Tests with `vitest` in the affected package
    - Repo validations via [run-all-validations.sh](../scripts/validation/run-all-validations.sh)
    - Tracing per [TRACING.md](observability/TRACING.md)
    - Security Snyk scan per [snyk_rules.instructions.md](../.github/instructions/snyk_rules.instructions.md)

## Agent Coordination Protocol

See the [master-architect.agent.md](../.github/agents/master-architect.agent.md) for delegation protocol and lifecycle.

## Multi-Agent System

For information on how AI agents coordinate on this project, including:
- Architecture decisions
- Implementation strategy
- Testing approach
- Quality validation
- Infrastructure & deployment

See [agent_coordination.instructions.md](../.github/instructions/agent_coordination.instructions.md)

## Security & Code Generation

For security standards and best practices in code generation, see:
- [snyk_rules.instructions.md](../.github/instructions/snyk_rules.instructions.md)
