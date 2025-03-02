#!/bin/bash

# Script to run Cypress tests in batches for maximum parallelism
# This approach divides tests into smaller batches and runs them in parallel

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Error: .env file not found. Please create one with DISCORD_TOKEN."
  exit 1
fi

# Source the .env file to get environment variables
source .env

# Set Cypress environment variables
export CYPRESS_DISCORD_TOKEN=$DISCORD_TOKEN
export NODE_ENV=test
export CYPRESS_FORCE_MINIMAL_BROWSER=true
export CYPRESS_BROWSER_ARGS="--disable-gpu --no-sandbox --disable-dev-shm-usage --disable-extensions"

# Count the number of available CPU cores (minus 1 to leave resources for the system)
CORES=$(nproc --ignore=1)
if [ $CORES -gt 8 ]; then
  CORES=8
fi
if [ $CORES -lt 1 ]; then
  CORES=1
fi

echo "Running tests in batches using $CORES parallel processes..."

# Create a temporary directory for test results
mkdir -p cypress/results

# Get all test files and count them
BOT_FILES=($(ls -1 cypress/e2e/bots/*.cy.ts))
SNOWBUNK_FILES=($(ls -1 cypress/e2e/snowbunk/*.cy.ts))
ALL_FILES=("${BOT_FILES[@]}" "${SNOWBUNK_FILES[@]}")
TOTAL_FILES=${#ALL_FILES[@]}

echo "Found $TOTAL_FILES test files to run"

# Calculate optimal batch size
# We want to create at least 2x as many batches as cores for better load balancing
OPTIMAL_BATCHES=$((CORES * 2))
BATCH_SIZE=$(( (TOTAL_FILES + OPTIMAL_BATCHES - 1) / OPTIMAL_BATCHES ))
if [ $BATCH_SIZE -lt 1 ]; then
  BATCH_SIZE=1
fi

echo "Using batch size of $BATCH_SIZE tests per batch"

# Function to run a batch of tests
run_batch() {
  local batch_id=$1
  local start_idx=$2
  local end_idx=$3
  local specs=""

  echo "Preparing batch $batch_id (files $start_idx to $end_idx)"

  # Build the spec pattern for this batch
  for ((i=start_idx; i<end_idx && i<TOTAL_FILES; i++)); do
    if [ -n "$specs" ]; then
      specs="$specs,"
    fi
    specs="$specs${ALL_FILES[$i]}"
  done

  if [ -n "$specs" ]; then
    echo "Running batch $batch_id: $specs"

    # Create a unique Cypress project folder for this batch
    local cypress_cache="cypress-cache-batch-$batch_id"
    mkdir -p "$cypress_cache"

    # Set environment variables for this batch
    export CYPRESS_CACHE_FOLDER="$cypress_cache"

    # Run Cypress with optimized settings
    npx cypress run --headless --spec "$specs" --config video=false,screenshotOnRunFailure=false,numTestsKeptInMemory=0,experimentalMemoryManagement=true,defaultCommandTimeout=3000,requestTimeout=3000,responseTimeout=5000,pageLoadTimeout=5000,testIsolation=false
    local result=$?

    # Clean up the temporary Cypress cache
    rm -rf "$cypress_cache"

    return $result
  fi

  return 0
}

# Calculate number of batches
NUM_BATCHES=$(( (TOTAL_FILES + BATCH_SIZE - 1) / BATCH_SIZE ))
echo "Dividing tests into $NUM_BATCHES batches"

# Run batches in parallel, respecting the core limit
batch_id=0
while [ $batch_id -lt $NUM_BATCHES ]; do
  # Start up to $CORES batches in parallel
  pids=()
  for ((i=0; i<CORES && batch_id<NUM_BATCHES; i++)); do
    start_idx=$((batch_id * BATCH_SIZE))
    end_idx=$(( (batch_id + 1) * BATCH_SIZE ))

    run_batch $batch_id $start_idx $end_idx &
    pids+=($!)

    batch_id=$((batch_id + 1))
  done

  # Wait for all started batches to complete
  for pid in "${pids[@]}"; do
    wait $pid
    if [ $? -ne 0 ]; then
      echo "Batch with PID $pid failed"
      exit_code=1
    fi
  done
done

# Check if any batches failed
if [ -n "$exit_code" ] && [ $exit_code -ne 0 ]; then
  echo "Some test batches failed. Check logs for details."
  exit 1
else
  echo "All test batches completed successfully!"
  exit 0
fi
