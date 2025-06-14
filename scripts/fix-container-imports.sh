#!/bin/bash

# Script to fix import paths in container source and test files from monolithic structure to shared package

echo "🔧 Fixing container import paths..."

# Function to fix imports in all TypeScript files in a directory
fix_imports_in_dir() {
    local dir=$1
    echo "Processing directory: $dir"

    # Find all TypeScript files (source and test files)
    find "$dir" -name "*.ts" -not -path "*/node_modules/*" | while read -r file; do
        echo "  Fixing imports in: $file"

        # Fix logger imports
        sed -i 's|from '\''../../../../services/logger'\''|from '\''@starbunk/shared'\''|g' "$file"
        sed -i 's|from '\''../../../services/logger'\''|from '\''@starbunk/shared'\''|g' "$file"
        sed -i 's|from '\''../../services/logger'\''|from '\''@starbunk/shared'\''|g' "$file"
        sed -i 's|from '\''@/services/logger'\''|from '\''@starbunk/shared'\''|g' "$file"

        # Fix bootstrap service imports
        sed -i 's|from '\''../../../../services/bootstrap'\''|from '\''@starbunk/shared'\''|g' "$file"
        sed -i 's|from '\''../../../services/bootstrap'\''|from '\''@starbunk/shared'\''|g' "$file"
        sed -i 's|from '\''../../services/bootstrap'\''|from '\''@starbunk/shared'\''|g' "$file"
        sed -i 's|from '\''@/services/bootstrap'\''|from '\''@starbunk/shared'\''|g' "$file"

        # Fix LLM service imports
        sed -i 's|from '\''../../../../services/llm/llmManager'\''|from '\''@starbunk/shared'\''|g' "$file"
        sed -i 's|from '\''../../../services/llm/llmManager'\''|from '\''@starbunk/shared'\''|g' "$file"
        sed -i 's|from '\''@/services/llm/llmManager'\''|from '\''@starbunk/shared'\''|g' "$file"

        sed -i 's|from '\''../../../../services/llm/promptManager'\''|from '\''@starbunk/shared'\''|g' "$file"
        sed -i 's|from '\''../../../services/llm/promptManager'\''|from '\''@starbunk/shared'\''|g' "$file"
        sed -i 's|from '\''@/services/llm/promptManager'\''|from '\''@starbunk/shared'\''|g' "$file"

        sed -i 's|from '\''../../../../services/llm'\''|from '\''@starbunk/shared'\''|g' "$file"
        sed -i 's|from '\''../../../services/llm'\''|from '\''@starbunk/shared'\''|g' "$file"
        sed -i 's|from '\''@/services/llm'\''|from '\''@starbunk/shared'\''|g' "$file"

        sed -i 's|from '\''../../../../services/llm/standardLlmService'\''|from '\''@starbunk/shared'\''|g' "$file"
        sed -i 's|from '\''../../../services/llm/standardLlmService'\''|from '\''@starbunk/shared'\''|g' "$file"

        # Fix personality service imports
        sed -i 's|from '\''@/services/personalityService'\''|from '\''@starbunk/shared'\''|g' "$file"

        # Fix Discord service imports
        sed -i 's|from '\''@/services/discordService'\''|from '\''@starbunk/shared'\''|g' "$file"

        # Replace jest.mock paths for test files
        if [[ "$file" == *".test.ts" || "$file" == *".spec.ts" ]]; then
            sed -i 's|jest\.mock('\''../../../../services/logger'\'')|jest.mock('\''@starbunk/shared'\'')|g' "$file"
            sed -i 's|jest\.mock('\''../../../services/logger'\'')|jest.mock('\''@starbunk/shared'\'')|g' "$file"
            sed -i 's|jest\.mock('\''../../services/logger'\'')|jest.mock('\''@starbunk/shared'\'')|g' "$file"
            sed -i 's|jest\.mock('\''@/services/logger'\'')|jest.mock('\''@starbunk/shared'\'')|g' "$file"

            sed -i 's|jest\.mock('\''../../../../services/llm/llmManager'\'')|jest.mock('\''@starbunk/shared'\'')|g' "$file"
            sed -i 's|jest\.mock('\''../../../services/llm/llmManager'\'')|jest.mock('\''@starbunk/shared'\'')|g' "$file"
            sed -i 's|jest\.mock('\''@/services/llm/llmManager'\'')|jest.mock('\''@starbunk/shared'\'')|g' "$file"

            sed -i 's|jest\.mock('\''../../../../services/llm/promptManager'\'')|jest.mock('\''@starbunk/shared'\'')|g' "$file"
            sed -i 's|jest\.mock('\''../../../services/llm/promptManager'\'')|jest.mock('\''@starbunk/shared'\'')|g' "$file"
            sed -i 's|jest\.mock('\''@/services/llm/promptManager'\'')|jest.mock('\''@starbunk/shared'\'')|g' "$file"
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
