# Security Policy

## Overview

StarBunk-js implements a comprehensive security scanning and gating policy to protect our homelab infrastructure and Unraid deployment. We use [Snyk](https://snyk.io) for vulnerability scanning of both code dependencies and Docker containers.

## 🛡️ Security Gates

### Pull Request Requirements

All pull requests must pass security validation before merging:

1. **Code Scanning**: Snyk scans all npm workspace dependencies
   - **Enforcement Level**: High and Critical vulnerabilities block PR merges
   - **Scope**: All workspaces (shared package + apps)
   - **Threshold**: `--severity-threshold=high`

2. **Container Scanning**: Snyk scans all Docker images
   - **Containers Scanned**: bunkbot, djcova, covabot, bluebot
   - **Base Image Checks**: Node:20-alpine OS-level vulnerabilities
   - **Enforcement Level**: High and Critical vulnerabilities block PR merges

### Main Branch Monitoring

When code is merged to `main`:
- **Continuous Monitoring**: Snyk Monitor tracks the security posture of deployed code
- **Dashboard**: View real-time vulnerability status at [Snyk Dashboard](https://app.snyk.io)
- **Container Scans**: All production containers are scanned and monitored

## 🔧 Setup Instructions

### 1. Configure SNYK_TOKEN

#### For Repository Maintainers

The `SNYK_TOKEN` must be configured in CircleCI:

1. Go to your Snyk account: https://app.snyk.io/account
2. Navigate to **Account Settings** → **General** → **Auth Token**
3. Copy your API token
4. In CircleCI:
   - Go to **Project Settings** → **Environment Variables**
   - Add a new variable: `SNYK_TOKEN` = `<your-token>`

#### For Contributors

If you see this error in your PR:
```
❌ ERROR: SNYK_TOKEN is not set
```

Contact a repository maintainer to configure the Snyk token in CircleCI.

### 2. Local Development Setup

To run Snyk scans locally before pushing:

```bash
# Install Snyk CLI
npm install -g snyk@latest

# Authenticate (one-time setup)
snyk auth

# Run code scan
snyk test --all-projects --severity-threshold=high

# Run container scan for a specific app
docker build -f src/bunkbot/Dockerfile.ci -t starbunk-bunkbot:local .
snyk container test starbunk-bunkbot:local --file=src/bunkbot/Dockerfile.ci --severity-threshold=high
```

## 📊 Using snyk-to-html for Local Reports

Generate HTML reports for easier vulnerability review:

```bash
# Install snyk-to-html
npm install -g snyk-to-html

# Run scan and save JSON output
snyk test --all-projects --json > snyk-results.json

# Generate HTML report
snyk-to-html -i snyk-results.json -o snyk-report.html

# Open the report
open snyk-report.html  # macOS
xdg-open snyk-report.html  # Linux
```

For container scans:

```bash
# Scan container and generate report
snyk container test starbunk-bunkbot:local --json > container-results.json
snyk-to-html -i container-results.json -o container-report.html
```

## 🔄 The Rescan Loop

### When to Use

Use the rescan workflow after:
- Updating `package-lock.json` to fix vulnerabilities
- Patching container base images
- Applying security fixes to dependencies

### How to Trigger

#### Option 1: GitHub Actions Workflow (Recommended)

1. Go to **Actions** → **Security Rescan (Manual)**
2. Click **Run workflow**
3. Select options:
   - **Scan Type**: Choose what to scan
     - `code-only`: Only scan npm dependencies
     - `containers-only`: Only scan Docker images
     - `full-scan`: Scan both code and containers
   - **Severity Threshold**: Choose minimum severity to report
     - `low`, `medium`, `high`, `critical`
4. Click **Run workflow**
5. View results in the workflow run
6. Download HTML reports from workflow artifacts

#### Option 2: Local Rescan

```bash
# Quick code rescan
npm ci
snyk test --all-projects --severity-threshold=high

# Quick container rescan (example for bunkbot)
npm run build:shared && npm run build:bunkbot
docker build -f src/bunkbot/Dockerfile.ci -t starbunk-bunkbot:local .
snyk container test starbunk-bunkbot:local --severity-threshold=high
```

### Interpreting Scan Results

#### Exit Codes

- **0**: No vulnerabilities found at or above threshold
- **1**: Vulnerabilities found at or above threshold (PR will be blocked)
- **2**: Snyk authentication or configuration error

#### Severity Levels

| Severity | Description | Action Required |
|----------|-------------|-----------------|
| **Critical** | Immediate threat, exploitable | **Fix immediately**, PR blocked |
| **High** | Serious vulnerability, likely exploitable | **Fix before merge**, PR blocked |
| **Medium** | Moderate risk | Review and fix when possible |
| **Low** | Minor risk | Review for awareness |

## 🏥 Remediation Workflow

### 1. Identify Vulnerabilities

When a PR fails security gates:

```
❌ Snyk found High or Critical vulnerabilities
Please review and fix the vulnerabilities before merging
Run 'snyk test' locally to see detailed results
```

### 2. Analyze the Issue

Run locally with detailed output:

```bash
snyk test --all-projects
```

Look for:
- Package name and version
- Vulnerability ID (CVE or Snyk ID)
- Remediation advice (upgrade, patch, etc.)

### 3. Apply Fixes

#### For Direct Dependencies

```bash
# Update a specific package
npm update <package-name>

# Or manually in package.json
npm install <package-name>@latest
```

#### For Transitive Dependencies

```bash
# Use npm overrides in package.json
{
  "overrides": {
    "vulnerable-package": "^safe-version"
  }
}

# Then run
npm install
```

#### For Container Vulnerabilities

```dockerfile
# Update base image in Dockerfile
FROM node:20-alpine  # Old
FROM node:20.x-alpine  # Use latest patch version
```

### 4. Verify Fix

```bash
# Rescan code
snyk test --all-projects --severity-threshold=high

# Rescan containers
docker build -f src/<app>/Dockerfile.ci -t starbunk-<app>:test .
snyk container test starbunk-<app>:test --severity-threshold=high
```

### 5. Push Changes

```bash
git add package-lock.json  # or Dockerfile changes
git commit -m "fix: resolve security vulnerabilities"
git push
```

The PR will automatically re-run security scans.

## 🏗️ Infrastructure-Specific Considerations

### Unraid/Homelab Deployment

Our containers run on Unraid infrastructure, so we prioritize:

1. **OS-Level Vulnerabilities**: Alpine Linux vulnerabilities that could lead to:
   - Container escape attacks
   - Privilege escalation
   - Host system compromise

2. **Network Vulnerabilities**: Since containers communicate on a homelab network:
   - Remote code execution vulnerabilities are critical
   - Network-based attacks are higher risk

3. **Data Security**: Containers have access to:
   - Discord tokens and API keys
   - User data and chat logs
   - Redis cache with sensitive information

### Workspace Awareness

StarBunk uses npm workspaces:

```json
{
  "workspaces": [
    "src/*"
  ]
}
```

Snyk scans all workspaces automatically with `--all-projects` flag:
- `src/shared` (shared utilities and types)
- `src/bunkbot` (reply bot and admin)
- `src/djcova` (music service)
- `src/covabot` (AI personality)
- `src/bluebot` (blue detection bot)

## 📚 Additional Resources

- [Snyk Documentation](https://docs.snyk.io/)
- [Snyk CLI Reference](https://docs.snyk.io/snyk-cli)
- [Understanding Snyk Severity Levels](https://docs.snyk.io/manage-issues/issue-management/severity-levels)
- [Snyk for Node.js](https://docs.snyk.io/scan-application-code/snyk-open-source/snyk-open-source-supported-languages-and-package-managers/snyk-for-javascript)
- [Snyk Container Security](https://docs.snyk.io/scan-containers)

## 🔐 Policy Exceptions

If you need to ignore a specific vulnerability (e.g., false positive, no fix available):

1. Document the reason in `.snyk` file:

```yaml
ignore:
  SNYK-JS-EXAMPLE-123456:
    - 'package-name > vulnerable-dep':
        reason: 'False positive - not exploitable in our use case'
        expires: '2026-12-31T00:00:00.000Z'
```

2. All exceptions must:
   - Have a clear reason
   - Have an expiration date
   - Be approved by a maintainer

## 📞 Support

If you have questions about:
- Security scan failures → Check this document and [Snyk docs](https://docs.snyk.io/)
- Configuring SNYK_TOKEN → Contact repository maintainers
- False positives → Open an issue with `security` label
- Urgent security concerns → Email maintainers directly

## 📝 Policy Version

- **Version**: 1.0
- **Last Updated**: 2026-01-28
- **Next Review**: 2026-07-28
