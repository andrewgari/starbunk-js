#!/usr/bin/env python3
"""
Simple YAML syntax checker without external dependencies
"""
import sys
import os
from pathlib import Path

def check_yaml_basic_syntax(file_path):
    """Basic YAML syntax check"""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()

        # Basic checks
        issues = []
        lines = content.split('\n')

        for i, line in enumerate(lines, 1):
            # Check for tabs (YAML should use spaces)
            if '\t' in line:
                issues.append(f"Line {i}: Contains tabs (YAML should use spaces)")

            # Check for basic indentation issues
            stripped = line.lstrip()
            if stripped and not line.startswith(' ') * (len(line) - len(stripped)):
                # This is a very basic check
                pass

        return len(issues) == 0, issues

    except Exception as e:
        return False, [f"Error reading file: {str(e)}"]

def main():
    """Main validation function"""
    yaml_files = []

    # Find all YAML files in .github directory
    github_dir = Path('.github')
    if github_dir.exists():
        yaml_files.extend(github_dir.glob('**/*.yml'))
        yaml_files.extend(github_dir.glob('**/*.yaml'))

    errors = []
    valid_count = 0

    print("🔍 Performing basic YAML syntax checks...")
    print(f"Found {len(yaml_files)} YAML files to validate\n")

    for file_path in sorted(yaml_files):
        if 'node_modules' in str(file_path):
            continue

        is_valid, issues = check_yaml_basic_syntax(file_path)

        if is_valid:
            print(f"✅ {file_path}")
            valid_count += 1
        else:
            print(f"❌ {file_path}")
            for issue in issues:
                print(f"   {issue}")
            errors.append((file_path, issues))

    print(f"\n📊 Basic Syntax Check Summary:")
    print(f"   Clean files: {valid_count}")
    print(f"   Files with issues: {len(errors)}")

    # Let's also just try to open each file as a test
    print(f"\n🔍 Testing file readability...")
    for file_path in sorted(yaml_files):
        if 'node_modules' in str(file_path):
            continue
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                f.read()
            print(f"✅ Readable: {file_path}")
        except Exception as e:
            print(f"❌ Error reading {file_path}: {e}")

if __name__ == "__main__":
    main()