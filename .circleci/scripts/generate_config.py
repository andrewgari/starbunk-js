#!/usr/bin/env python3
"""
Generate dynamic CircleCI config based on what changed.
Reads .circleci/diff.json and merges workflow files into a single config.
Uses only standard library - no external dependencies.
"""
import json
import os

def load_json_file(filepath):
    """Load JSON file."""
    with open(filepath, 'r') as f:
        return json.load(f)

def load_yaml_as_dict(filepath):
    """
    Simple YAML parser for our specific use case.
    Reads a YAML file and returns dict. Only handles simple key: value pairs.
    """
    result = {}
    current_key = None
    current_section = None
    indent_stack = [0]
    
    with open(filepath, 'r') as f:
        lines = f.readlines()
    
    for line_num, line in enumerate(lines):
        if not line.strip() or line.strip().startswith('#'):
            continue
        
        # Get indentation
        indent = len(line) - len(line.lstrip())
        stripped = line.strip()
        
        if ':' in stripped and not stripped.startswith('-'):
            parts = stripped.split(':', 1)
            key = parts[0].strip()
            value = parts[1].strip() if len(parts) > 1 else None
            
            # This is a top-level section like 'version:', 'jobs:', 'workflows:', etc
            if indent == 0:
                if value:
                    result[key] = value
                else:
                    # This is a section header - we'll collect its content
                    result[key] = {}
                current_section = key
    
    # For our use case, we just need to know the structure exists
    # The actual merging happens in the main logic below
    return result

def merge_workflow_files(workflow_files):
    """
    Merge multiple YAML workflow files by concatenating their content.
    Since all files have version: 2.1, executors, commands, jobs, workflows,
    we merge them at the content level.
    """
    merged = {
        'version': '2.1',
        'orbs': {
            'continuation': 'circleci/continuation@0.1.2'
        },
        'parameters': {
            'snyk_token': {
                'type': 'string',
                'default': ''
            }
        },
        'executors': {},
        'commands': {},
        'jobs': {},
        'workflows': {}
    }
    
    for workflow_file in workflow_files:
        filepath = os.path.join('.circleci', 'workflows', f'{workflow_file}.yml')
        
        try:
            with open(filepath, 'r') as f:
                content = f.read()
            
            # Parse the file to extract sections
            # We'll use a simple approach: read the file and find the sections
            lines = content.split('\n')
            
            current_section = None
            section_content = []
            section_indent = 0
            
            for line in lines:
                if not line.strip():
                    continue
                if line.strip().startswith('#'):
                    continue
                
                # Check if this is a section header (indent=0)
                if line and line[0] not in ' \t':
                    # We have a new top-level section
                    section_name = line.split(':')[0].strip()
                    
                    if section_name in ['executors', 'commands', 'jobs', 'workflows']:
                        current_section = section_name
                    continue
                
                if current_section and line.strip():
                    section_content.append(line)
            
            print(f"# Loaded {workflow_file}", file=__import__('sys').stderr)
        except FileNotFoundError:
            print(f"Warning: {workflow_file}.yml not found", file=__import__('sys').stderr)
            continue
    
    return merged

def yaml_dict_to_string(data, indent=0):
    """Convert a Python dict to YAML string."""
    lines = []
    indent_str = '  ' * indent
    
    for key, value in data.items():
        if isinstance(value, dict):
            if value:  # Non-empty dict
                lines.append(f"{indent_str}{key}:")
                lines.append(yaml_dict_to_string(value, indent + 1))
            else:  # Empty dict
                lines.append(f"{indent_str}{key}: {{}}")
        elif isinstance(value, list):
            lines.append(f"{indent_str}{key}:")
            for item in value:
                if isinstance(item, dict):
                    lines.append(f"{indent_str}  - {yaml_dict_to_string(item, indent + 2)}")
                else:
                    lines.append(f"{indent_str}  - {item}")
        elif isinstance(value, bool):
            lines.append(f"{indent_str}{key}: {str(value).lower()}")
        elif value is None:
            lines.append(f"{indent_str}{key}:")
        else:
            lines.append(f"{indent_str}{key}: {value}")
    
    return '\n'.join(lines)

def main():
    import sys
    
    # Read what changed
    try:
        changes = load_json_file('.circleci/diff.json')
    except FileNotFoundError:
        print("Error: .circleci/diff.json not found", file=sys.stderr)
        sys.exit(1)
    
    # Determine which workflows to include
    workflows_to_load = ['core-pr-validation']
    
    for app in ['bunkbot', 'bluebot', 'covabot', 'djcova']:
        if changes.get(f'{app}_changed', False):
            workflows_to_load.append(f'{app}-pr-validation')
    
    print(f"Workflows to load: {', '.join(workflows_to_load)}", file=sys.stderr)
    print(f"Changes: {json.dumps(changes, indent=2)}", file=sys.stderr)
    
    # Read workflow files and merge them manually
    all_jobs = {}
    all_commands = {}
    all_executors = {}
    all_workflows = {}
    
    for workflow_name in workflows_to_load:
        filepath = os.path.join('.circleci', 'workflows', f'{workflow_name}.yml')
        
        try:
            with open(filepath, 'r') as f:
                # For now, we'll use a simple line-by-line approach
                # Read the entire file
                lines = f.readlines()
            
            print(f"# Loaded {workflow_name}", file=sys.stderr)
        except FileNotFoundError:
            print(f"Warning: {workflow_name}.yml not found", file=sys.stderr)
            continue
    
    # Instead of parsing YAML, just concatenate the workflow files directly
    # and output as a merged YAML
    
    # Read all workflow files
    workflow_contents = {}
    for workflow_name in workflows_to_load:
        filepath = os.path.join('.circleci', 'workflows', f'{workflow_name}.yml')
        try:
            with open(filepath, 'r') as f:
                workflow_contents[workflow_name] = f.read()
        except FileNotFoundError:
            pass
    
    # Build merged config from scratch
    output_lines = [
        'version: 2.1',
        '',
        'orbs:',
        '  continuation: circleci/continuation@0.1.2',
        '',
        'parameters:',
        '  snyk_token:',
        '    type: string',
        '    default: ""',
        ''
    ]
    
    # Extract and merge sections from each workflow file
    for workflow_name in workflows_to_load:
        if workflow_name not in workflow_contents:
            continue
        
        content = workflow_contents[workflow_name]
        lines = content.split('\n')
        
        # Extract sections (executors, commands, jobs, workflows)
        in_section = None
        section_lines = []
        first_item_in_section = True
        
        for line in lines:
            # Skip version, orbs, parameters lines
            if line.strip().startswith('version:'):
                continue
            if line.strip().startswith('orbs:'):
                in_section = None
                continue
            if line.strip().startswith('parameters:'):
                in_section = None
                continue
            
            # Detect section headers
            if line and not line[0].isspace() and ':' in line:
                section_name = line.split(':')[0].strip()
                if section_name in ['executors', 'commands', 'jobs', 'workflows']:
                    if in_section and section_lines:
                        output_lines.extend(section_lines)
                        output_lines.append('')
                    in_section = section_name
                    section_lines = [line]
                    first_item_in_section = True
                    continue
            
            if in_section:
                section_lines.append(line)
        
        # Add remaining section
        if section_lines:
            # Only add if this isn't the last workflow's section (avoid duplicates)
            if section_lines not in [output_lines[-len(section_lines):]] if len(section_lines) <= len(output_lines) else True:
                output_lines.extend(section_lines)
                output_lines.append('')
    
    # Output the merged config
    output = '\n'.join(output_lines)
    print(output)

if __name__ == '__main__':
    main()
