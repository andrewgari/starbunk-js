#!/usr/bin/env python3
"""
Generate dynamic CircleCI config based on what changed.
Reads .circleci/diff.json and merges workflow files into a single config.
Uses PyYAML for robust YAML parsing and generation.
"""
import json
import os
import sys
import yaml

def load_json_file(filepath):
    """Load JSON file."""
    with open(filepath, 'r') as f:
        return json.load(f)

def load_yaml_as_dict(filepath):
    """
    Load YAML file using PyYAML library.
    Robust parsing handles various indentation and structure variations.
    """
    try:
        with open(filepath, 'r') as f:
            return yaml.safe_load(f) or {}
    except yaml.YAMLError as e:
        print(f"Error parsing YAML {filepath}: {e}", file=sys.stderr)
        return {}

def main():
    # Read what changed
    try:
        changes = load_json_file('.circleci/diff.json')
    except FileNotFoundError:
        print("Error: .circleci/diff.json not found", file=sys.stderr)
        sys.exit(1)

    # Determine which workflows to include
    workflows_to_load = ['core-pr-validation', 'security-pr-validation']

    for app in ['bunkbot', 'bluebot', 'covabot', 'djcova']:
        if changes.get(f'{app}_changed', False):
            workflows_to_load.append(f'{app}-pr-validation')

    print(f"Workflows to load: {', '.join(workflows_to_load)}", file=sys.stderr)
    print(f"Changes: {json.dumps(changes, indent=2)}", file=sys.stderr)

    # First, load shared configuration (executors and commands)
    shared_config_path = os.path.join('.circleci', 'shared-config.yml')
    all_executors = {}
    all_commands = {}
    all_jobs = {}
    all_workflows = {}

    # Load shared executors and commands using PyYAML
    if os.path.exists(shared_config_path):
        try:
            with open(shared_config_path, 'r') as f:
                shared_config = yaml.safe_load(f) or {}

            # Extract executors and commands from shared config
            if 'executors' in shared_config:
                all_executors.update(shared_config['executors'])
            if 'commands' in shared_config:
                all_commands.update(shared_config['commands'])

            print(f"# Loaded shared-config.yml with {len(all_executors)} executors and {len(all_commands)} commands", file=sys.stderr)
        except yaml.YAMLError as e:
            print(f"Warning: Could not parse shared-config.yml: {e}", file=sys.stderr)
        except Exception as e:
            print(f"Warning: Could not load shared-config.yml: {e}", file=sys.stderr)

    # Collect all sections from workflow files using PyYAML
    for workflow_name in workflows_to_load:
        filepath = os.path.join('.circleci', 'workflows', f'{workflow_name}.yml')

        try:
            with open(filepath, 'r') as f:
                workflow_config = yaml.safe_load(f) or {}

            # Merge executors, commands, jobs, and workflows from workflow file
            if 'executors' in workflow_config:
                all_executors.update(workflow_config['executors'])
            if 'commands' in workflow_config:
                all_commands.update(workflow_config['commands'])
            if 'jobs' in workflow_config:
                all_jobs.update(workflow_config['jobs'])
            if 'workflows' in workflow_config:
                all_workflows.update(workflow_config['workflows'])

            print(f"# Loaded {workflow_name}", file=sys.stderr)
        except yaml.YAMLError as e:
            print(f"Warning: Could not parse {workflow_name}.yml: {e}", file=sys.stderr)
        except FileNotFoundError:
            print(f"Warning: {workflow_name}.yml not found", file=sys.stderr)
        except Exception as e:
            print(f"Warning: Error loading {workflow_name}.yml: {e}", file=sys.stderr)

    # Build the merged config using PyYAML for proper generation
    # Note: continuation orb should NOT be included in the generated config
    # It's only needed in the setup config (.circleci/config.yml)
    merged_config = {
        'version': '2.1'
    }

    # Add parameters (snyk_token required for core validation)
    merged_config['parameters'] = {
        'snyk_token': {
            'type': 'string',
            'default': ''
        }
    }

    # Add executors if any
    if all_executors:
        merged_config['executors'] = all_executors

    # Add commands if any
    if all_commands:
        merged_config['commands'] = all_commands

    # Add jobs if any
    if all_jobs:
        merged_config['jobs'] = all_jobs

    # Add workflows if any
    if all_workflows:
        merged_config['workflows'] = all_workflows

    # Output the merged config using PyYAML for proper YAML generation
    output = yaml.dump(merged_config, default_flow_style=False, sort_keys=False)
    print(output)

if __name__ == '__main__':
    main()
