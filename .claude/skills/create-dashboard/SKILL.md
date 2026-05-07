---
name: create-dashboard
description: Scaffold a new Grafana dashboard JSON in infrastructure/grafana/dashboards/
argument-hint: <slug> [Title words]
allowed-tools: [Read, Write, Bash]
---

# Create Dashboard: Scaffold a new Grafana dashboard

Creates a new Grafana dashboard JSON at `infrastructure/grafana/dashboards/<slug>.json`.
The file is ready to commit — Grafana will pick it up within 30s after the next `/deploy starbunk`.

## Arguments

The user invoked this with: $ARGUMENTS

Parse `$ARGUMENTS` as: `<slug> [title words...]`

- **slug** — first token, lowercased, spaces→hyphens (e.g. `covabot-detail`, `fleet`)
- **title** — remaining tokens joined, or title-case of slug if omitted

## Instructions

### Step 1 — Derive values

- `slug`  = first word of $ARGUMENTS, lowercased, spaces replaced with `-`
- `title` = remaining words joined (e.g. "CovaBot Detail"), or title-case of slug if none given
- `uid`   = `starbunk-<slug>` (e.g. `starbunk-covabot-detail`)
- `path`  = `infrastructure/grafana/dashboards/<slug>.json`

### Step 2 — Guard: check for existing file

If `infrastructure/grafana/dashboards/<slug>.json` already exists, stop and say:

> Dashboard `<slug>.json` already exists. Edit it directly or choose a different name.

### Step 3 — Write the scaffold

Create `infrastructure/grafana/dashboards/<slug>.json` with the content below,
substituting `<uid>`, `<title>`, and `<description>` (use title as description too unless user provided one):

```json
{
  "__inputs": [
    {
      "name": "DS_STARBUNK_PROMETHEUS",
      "label": "Starbunk Prometheus",
      "description": "",
      "type": "datasource",
      "pluginId": "prometheus",
      "pluginName": "Prometheus"
    }
  ],
  "__requires": [
    {
      "type": "grafana",
      "id": "grafana",
      "name": "Grafana",
      "version": "11.0.0"
    },
    {
      "type": "datasource",
      "id": "prometheus",
      "name": "Prometheus",
      "version": "1.0.0"
    }
  ],
  "annotations": { "list": [] },
  "description": "<description>",
  "editable": true,
  "fiscalYearStartMonth": 0,
  "graphTooltip": 1,
  "id": null,
  "links": [],
  "panels": [],
  "refresh": "30s",
  "schemaVersion": 39,
  "tags": ["starbunk"],
  "templating": { "list": [] },
  "time": { "from": "now-1h", "to": "now" },
  "timepicker": {},
  "timezone": "browser",
  "title": "<title>",
  "uid": "<uid>",
  "version": 1
}
```

### Step 4 — Report to user

Tell the user:

- Created: `infrastructure/grafana/dashboards/<slug>.json`
- **Datasource UID** for all Prometheus queries: `starbunk-prometheus`
- Open the file and add panels — use the Grafana JSON schema; see the existing dashboards in the same folder for examples
- Commit the file, then run `/deploy starbunk` — Grafana will reload within 30 s
- Common metric namespaces scraped by Prometheus:
  - `starbunk_*` — app-level metrics from all four bots via OTEL collector (`:8889/metrics`)
  - `process_*`, `nodejs_*` — runtime metrics
  - `up` — scrape health per target

## Notes

- `"id": null` is intentional — Grafana assigns a numeric ID on first load
- `"uid"` must be unique across all dashboards; the `starbunk-<slug>` convention avoids collisions
- `"allowUiUpdates": false` in the provisioner means edits made in the Grafana UI are **not** persisted — always edit the JSON file in the repo
- Prometheus scrapes the OTEL collector at `starbunk-otel-collector:8889`; metrics arrive with the `starbunk_` prefix added by the collector's namespace config
