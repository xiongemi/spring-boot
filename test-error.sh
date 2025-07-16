#!/bin/bash

echo "Testing for parseExecutor error..."
echo "Running with high parallelism to trigger race condition..."

# Run multiple times to trigger the race condition
for i in {1..5}; do
    echo "Attempt $i:"
    npx nx run-many -t build-ci --parallel=32 --verbose 2>&1 | grep -A 10 -B 5 "ERROR:" | head -20
    
    # Check if error occurred
    if [ $? -eq 0 ]; then
        echo "Error found in attempt $i!"
        break
    fi
    
    echo "No error in attempt $i, trying again..."
done

echo "Test completed."