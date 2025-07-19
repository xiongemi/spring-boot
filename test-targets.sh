#!/bin/bash

echo "🔍 Testing target access to identify problematic targets..."
echo ""

# First, let's see what projects and targets are available
echo "📋 Available projects:"
npx nx show projects --json | jq -r '.[]' | head -10

echo ""
echo "🎯 Testing target access for a few projects..."

# Test a few known projects to see which ones have issues
projects=("spring-boot" "spring-boot-actuator" "spring-boot-test" "spring-boot-autoconfigure")

for project in "${projects[@]}"; do
    echo "Testing project: $project"
    
    # Try to get project configuration
    if npx nx show project "$project" --json > /tmp/project_config.json 2>/dev/null; then
        echo "  ✅ Project $project exists"
        
        # Check if build-ci target exists
        if jq -e ".targets[\"build-ci\"]" /tmp/project_config.json > /dev/null 2>&1; then
            echo "  ✅ Target build-ci exists in $project"
        else
            echo "  ❌ Target build-ci MISSING in $project"
            echo "  Available targets:"
            jq -r ".targets | keys[]" /tmp/project_config.json | head -5
        fi
    else
        echo "  ❌ Project $project NOT FOUND"
    fi
    echo ""
done

echo "🏃 Now testing the actual nx run-many command with a small subset..."

# Try running with just a few projects to isolate the issue
echo "Testing with 1 project at a time..."
for project in "${projects[@]}"; do
    echo "Testing: npx nx run $project:build-ci"
    if npx nx run "$project:build-ci" --dry-run 2>&1 | grep -q "Cannot read properties of undefined"; then
        echo "❌ ERROR found with project: $project"
        break
    else
        echo "✅ Project $project looks OK"
    fi
done

rm -f /tmp/project_config.json
echo "🔍 Debug completed. Check output above for problematic targets."