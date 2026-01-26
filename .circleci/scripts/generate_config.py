#!/usr/bin/env python3
"""
Generate dynamic CircleCI config based on what changed.
Reads .circleci/diff.json and outputs a merged config.yml to stdout.
"""
import json
import sys
import yaml
import os

def load_workflow_file(filename):
    """Load and parse a workflow YAML file."""
    path = os.path.join(os.path.dirname(__file__), '..', 'workflows', filename)
    with open(path, 'r') as f:
        return yaml.safe_load(f)

def extract_jobs_and_commands(config_dict):
    """Extract jobs, commands, executors from a config dict."""
    result = {
        'jobs': config_dict.get('jobs', {}),
        'commands': config_dict.get('commands', {}),
        'executors': config_dict.get('executors', {}),
        'workflows': config_dict.get('workflows', {})
    }
    return result

def main():
    # Read what changed
    try:
        with open('.circleci/diff.json', 'r') as f:
            changes = json.load(f)
    except FileNotFoundError:
        print("Error: .circleci/diff.json not found", file=sys.stderr)
        sys.exit(1)
    
    # Determine which workflows to include
    workflows_to_load = ['core-pr-validation']
    
    for app in ['bunkbot', 'bluebot', 'covabot', 'djcova']:
        if changes.get(f'{app}_changed', False):
            workflows_to_load.append(f'{app}-pr-validation')
    
    # Load all workflow files
    all_jobs = {}
    all_commands = {}
    all_executors = {}
    all_workflows = {}
    
    for workflow_file in workflows_to_load:
        try:
            config = load_workflow_file(f'{workflow_file}.yml')
            
            # Merge all components
            all_jobs.update(config.get('jobs', {}))
            all_commands.update(config.get('commands', {}))
            all_executors.update(config.get('executors', {}))
            all_workflows.update(config.get('workflows', {}))
            
            print(f"# Loaded {workflow_file}", file=sys.stderr)
        except FileNotFoundError:
            print(f"Warning: {workflow_file}.yml not found", file=sys.stderr)
    
    # Merge all parameters
    all_parameters = {
        'snyk_token': {
            'type': 'string',
            'default': ''
        }
    }
    
    # Build the final config
    final_config = {
        'version': '2.1',
        'parameters': all_parameters,
        'executors': all_executors,
        'commands': all_commands,
        'jobs': all_jobs,
        'workflows': all_workflows,
        'orbs': {
            'continuation': 'circleci/continuation@0.1.2'
        }
    }
    
    # Output as YAML
    print(yaml.dump(final_config, default_flow_style=False, sort_keys=False), file=sys.stdout)

if __name__ == '__main__':
    main()
