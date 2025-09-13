#!/usr/bin/env python3
"""
YAML Syntax Validator for GitHub Actions workflows and configuration files
"""
import yaml
import sys
import os
from pathlib import Path

def validate_yaml_file(file_path):
    """Validate a single YAML file for syntax errors"""
    try:
        with open(file_path, 'r') as file:
            yaml.safe_load(file)
        return True, None
    except yaml.YAMLError as e:
        return False, str(e)
    except Exception as e:
        return False, f"Error reading file: {str(e)}"

def main():
    """Main validation function"""
    yaml_files = []

    # Find all YAML files in .github directory
    github_dir = Path('.github')
    if github_dir.exists():
        yaml_files.extend(github_dir.glob('**/*.yml'))
        yaml_files.extend(github_dir.glob('**/*.yaml'))

    # Find all YAML files in scripts directory
    scripts_dir = Path('scripts')
    if scripts_dir.exists():
        yaml_files.extend(scripts_dir.glob('**/*.yml'))
        yaml_files.extend(scripts_dir.glob('**/*.yaml'))

    # Also check root level config files
    for pattern in ['*.yml', '*.yaml']:
        yaml_files.extend(Path('.').glob(pattern))

    errors = []
    valid_count = 0

    print("🔍 Validating YAML syntax for CI/CD files...")
    print(f"Found {len(yaml_files)} YAML files to validate\n")

    for file_path in sorted(yaml_files):
        if 'node_modules' in str(file_path):
            continue

        is_valid, error = validate_yaml_file(file_path)

        if is_valid:
            print(f"✅ {file_path}")
            valid_count += 1
        else:
            print(f"❌ {file_path}")
            print(f"   Error: {error}")
            errors.append((file_path, error))

    print(f"\n📊 Validation Summary:")
    print(f"   Valid files: {valid_count}")
    print(f"   Invalid files: {len(errors)}")

    if errors:
        print(f"\n🚨 YAML Syntax Errors Found:")
        for file_path, error in errors:
            print(f"   {file_path}: {error}")
        sys.exit(1)
    else:
        print(f"\n🎉 All YAML files have valid syntax!")
        sys.exit(0)

if __name__ == "__main__":
    main()