description = "PRD-aligned security audit and hardening workflow"
prompt = """
# Security Hardening Command

## 🎯 PRD Alignment
**Governance**: Reference `docs/PRD_SYSTEM_IMPLEMENTATION_PLAN.md` Phase 1-4

Security audits must align with PRD compliance requirements and risk tolerance definitions.

You are performing a comprehensive security audit and implementing hardening measures aligned with PRD security acceptance criteria.

## Security Protocol

### Phase 1: Vulnerability Assessment
1. **Dependency Scanning**
   ```bash
   # Run Snyk scan
   snyk test --all-projects

   # Check for outdated packages
   npm outdated

   # Audit npm packages
   npm audit
   ```

2. **Code Scanning**
   - Use Snyk Code for SAST
   - Check for hardcoded secrets
   - Identify injection vulnerabilities
   - Find insecure deserialization

3. **Configuration Review**
   - Docker security (non-root users, minimal base images)
   - Environment variable exposure
   - CORS policies
   - Rate limiting
   - Authentication/Authorization

### Phase 2: Secret Detection
1. **Scan for Hardcoded Secrets**
   ```bash
   # Search for potential secrets
   rg -i "password|api_key|secret|token" --type env
   rg "sk-[a-zA-Z0-9]{20,}" --type ts  # API keys
   rg "ghp_[a-zA-Z0-9]{36}" --type ts  # GitHub tokens
   ```

2. **Git History Scan**
   - Check if secrets ever committed
   - Document rotation requirements
   - Verify .gitignore coverage

### Phase 3: Input Validation
1. **API Endpoints**
   - Identify all user input points
   - Check validation schemas (Zod)
   - Test for injection attacks
   - Verify sanitization

2. **Discord Bot Inputs**
   - Command argument validation
   - Message content sanitization
   - File upload restrictions
   - Rate limiting per user

### Phase 4: Access Control
1. **Principle of Least Privilege**
   - Review Discord bot permissions
   - Check database user privileges
   - Audit file system access
   - Container capabilities

2. **Authentication Flow**
   - Token management
   - Session handling
   - JWT validation
   - Refresh token rotation

### Phase 5: Infrastructure Security
1. **Docker Hardening**
   - Non-root users
   - Read-only filesystems where possible
   - Security options (no-new-privileges)
   - Resource limits

2. **Network Security**
   - Minimize exposed ports
   - Internal vs external networks
   - TLS/SSL configuration
   - Firewall rules

### Phase 6: Observability & Incident Response
1. **Security Logging**
   - Authentication attempts
   - Authorization failures
   - Rate limit hits
   - Suspicious patterns

2. **Monitoring & Alerts**
   - Failed login attempts
   - Unusual API usage
   - Error rate spikes
   - Resource exhaustion

## Remediation Priority Matrix

| Severity | CVSS Score | Time to Fix |
|----------|------------|-------------|
| Critical | 9.0-10.0   | < 24 hours  |
| High     | 7.0-8.9    | < 1 week    |
| Medium   | 4.0-6.9    | < 1 month   |
| Low      | 0.1-3.9    | Backlog     |

## Output Format

```markdown
# Security Audit Report - [Date]

## Executive Summary
- Critical vulnerabilities: X
- High priority issues: X
- Security score: X/100
- Compliance status: [PASS/FAIL]

## Critical Issues (Immediate Action)
### 1. [Vulnerability Name]
- **Location**: [File:Line]
- **CVSS Score**: X.X
- **Description**: [What's wrong]
- **Exploit Scenario**: [How it could be exploited]
- **Remediation**: [Step-by-step fix]
- **Verification**: [How to confirm fix]

[Repeat for each critical issue]

## Hardening Checklist
- [ ] All dependencies updated
- [ ] Snyk scan passes
- [ ] No hardcoded secrets
- [ ] Input validation on all endpoints
- [ ] Rate limiting configured
- [ ] Docker containers non-root
- [ ] TLS enabled for external connections
- [ ] Security headers configured
- [ ] Audit logging enabled
- [ ] Incident response plan documented

## Compliance Requirements
- [ ] OWASP Top 10 addressed
- [ ] Discord ToS compliance
- [ ] Data privacy (GDPR considerations)
- [ ] Security disclosure policy

## Follow-up Actions
1. [Action] - Owner: [Name] - Due: [Date]
2. [Action] - Owner: [Name] - Due: [Date]
```

## Context
- Scan Scope: !{echo $SCOPE}
- Compliance Requirements: !{echo $COMPLIANCE}
- Risk Tolerance: !{echo $RISK_LEVEL}
- **PRD Initiative**: !{echo $PRD_INITIATIVE}
- **Security Compliance Target**: !{echo $COMPLIANCE_TARGET}

## 📋 PRD Compliance Checklist
- [ ] Audit scope matches PRD security requirements
- [ ] Critical issues resolved before PRD phase completion
- [ ] Risk assessment aligns with PRD risk tolerance
- [ ] Remediation timeline fits PRD phases
"""
