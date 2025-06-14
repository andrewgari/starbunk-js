#!/bin/bash

# Script to fix import paths in container tests from monolithic structure to shared package

echo "🔧 Fixing container test import paths..."

# Function to fix imports in a directory
fix_imports_in_dir() {
    local dir=$1
    echo "Processing directory: $dir"
    
    # Find all TypeScript test files
    find "$dir" -name "*.test.ts" -o -name "*.spec.ts" | while read -r file; do
        echo "  Fixing imports in: $file"
        
        # Replace old import paths with shared package imports
        sed -i 's|from '\''../../../../services/logger'\''|from '\''@starbunk/shared'\''|g' "$file"
        sed -i 's|from '\''../../../services/logger'\''|from '\''@starbunk/shared'\''|g' "$file"
        sed -i 's|from '\''../../services/logger'\''|from '\''@starbunk/shared'\''|g' "$file"
        sed -i 's|from '\''@/services/logger'\''|from '\''@starbunk/shared'\''|g' "$file"
        
        sed -i 's|from '\''../../../../services/llm/llmManager'\''|from '\''@starbunk/shared'\''|g' "$file"
        sed -i 's|from '\''../../../services/llm/llmManager'\''|from '\''@starbunk/shared'\''|g' "$file"
        sed -i 's|from '\''@/services/llm/llmManager'\''|from '\''@starbunk/shared'\''|g' "$file"
        
        sed -i 's|from '\''@/services/bootstrap'\''|from '\''@starbunk/shared'\''|g' "$file"
        sed -i 's|from '\''@/services/discordService'\''|from '\''@starbunk/shared'\''|g' "$file"
        
        # Replace jest.mock paths
        sed -i 's|jest\.mock('\''../../../../services/logger'\'')|jest.mock('\''@starbunk/shared'\'')|g' "$file"
        sed -i 's|jest\.mock('\''../../../services/logger'\'')|jest.mock('\''@starbunk/shared'\'')|g' "$file"
        sed -i 's|jest\.mock('\''../../services/logger'\'')|jest.mock('\''@starbunk/shared'\'')|g' "$file"
        sed -i 's|jest\.mock('\''@/services/logger'\'')|jest.mock('\''@starbunk/shared'\'')|g' "$file"
        
        sed -i 's|jest\.mock('\''../../../../services/llm/llmManager'\'')|jest.mock('\''@starbunk/shared'\'')|g' "$file"
        sed -i 's|jest\.mock('\''../../../services/llm/llmManager'\'')|jest.mock('\''@starbunk/shared'\'')|g' "$file"
        sed -i 's|jest\.mock('\''@/services/llm/llmManager'\'')|jest.mock('\''@starbunk/shared'\'')|g' "$file"
        
        # Add proper mock structure for shared package (this is a basic version)
        # Note: This is a simplified approach - more complex mocking may be needed
        if grep -q "jest\.mock('@starbunk/shared')" "$file"; then
            echo "    ✅ Mock found, ensuring proper structure..."
            # This would need more sophisticated handling for each specific case
        fi
    done
}

# Fix imports in all container directories
for container in bunkbot djcova starbunk-dnd covabot; do
    if [ -d "containers/$container" ]; then
        fix_imports_in_dir "containers/$container"
    else
        echo "⚠️  Container directory not found: containers/$container"
    fi
done

echo "✅ Import path fixes completed!"
echo ""
echo "📝 Note: You may need to manually adjust mock structures in some test files"
echo "   to properly mock the shared package exports."
