#!/bin/bash

# Script to run Cypress tests in parallel
# This script divides the test files into groups and runs them in parallel

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Error: .env file not found. Please create one with DISCORD_TOKEN."
  exit 1
fi

# Source the .env file to get environment variables
source .env

# Clean up Cypress artifacts before running tests
echo "Cleaning up Cypress artifacts..."
./scripts/clean-cypress.sh

# Ensure Cypress is installed
echo "Ensuring Cypress is installed..."
npx cypress install

# Check if Xvfb is installed
if command -v Xvfb >/dev/null 2>&1; then
  echo "Xvfb is installed, will use unique displays for parallel tests"
  USE_XVFB=true
else
  echo "Xvfb not found, will run without display configuration"
  USE_XVFB=false
fi

# Clean up any stale Xvfb lock files
if [ "$USE_XVFB" = true ]; then
  echo "Cleaning up any stale Xvfb lock files..."
  for i in {99..110}; do
    if [ -f "/tmp/.X${i}-lock" ]; then
      echo "Removing stale lock file: /tmp/.X${i}-lock"
      rm -f "/tmp/.X${i}-lock" 2>/dev/null || true
    fi
  done
fi

# Set Cypress environment variables
export CYPRESS_DISCORD_TOKEN=$DISCORD_TOKEN
export NODE_ENV=test

# Get all bot test files
BOT_FILES=$(ls -1 cypress/e2e/bots/*.cy.ts)

# Count the number of available CPU cores (minus 1 to leave resources for the system)
# For stability, limit to a maximum of 4 parallel processes
CORES=$(nproc --ignore=1)
if [ $CORES -gt 4 ]; then
  CORES=4
fi
if [ $CORES -lt 1 ]; then
  CORES=1
fi

echo "Running tests in parallel using $CORES processes..."

# Create a temporary directory for test results
mkdir -p cypress/results

# Function to run a group of tests
run_test_group() {
  local test_files=("$@")
  local specs=""
  local display_num=$1

  for file in "${test_files[@]:1}"; do
    if [ -n "$specs" ]; then
      specs="$specs,"
    fi
    specs="$specs$file"
  done

  if [ -n "$specs" ]; then
    echo "Running tests: $specs"

    if [ "$USE_XVFB" = true ]; then
      # Use a unique display number for each process
      export DISPLAY=":$display_num"
      echo "Using display $DISPLAY for this test group"

      # Start Xvfb with the unique display
      Xvfb $DISPLAY -screen 0 1280x720x24 &
      XVFB_PID=$!

      # Run Cypress with this display
      npx cypress run --spec "$specs" --config video=false,screenshotOnRunFailure=false
      TEST_RESULT=$?

      # Kill the Xvfb process
      kill $XVFB_PID 2>/dev/null || true

      # Return the test result
      return $TEST_RESULT
    else
      # Run without special display configuration
      npx cypress run --spec "$specs" --config video=false,screenshotOnRunFailure=false
      return $?
    fi
  fi
}

# Divide tests into groups based on number of cores
test_files=($BOT_FILES)
total_files=${#test_files[@]}
files_per_group=$(( (total_files + CORES - 1) / CORES ))

# Run tests in parallel
pids=()
results=()
for ((i=0; i<CORES; i++)); do
  start_idx=$((i * files_per_group))
  if [ $start_idx -lt $total_files ]; then
    end_idx=$(( (i + 1) * files_per_group ))
    if [ $end_idx -gt $total_files ]; then
      end_idx=$total_files
    fi

    # Calculate display number (start at 100 to avoid conflicts)
    display_num=$((100 + i))

    # Create array with display number as first element followed by files
    group_files=($display_num "${test_files[@]:$start_idx:$((end_idx-start_idx))}")

    run_test_group "${group_files[@]}" &
    pids+=($!)
  fi
done

# Wait for all processes to complete
exit_code=0
for pid in "${pids[@]}"; do
  wait $pid
  result=$?
  if [ $result -ne 0 ]; then
    echo "Process $pid failed with exit code $result"
    exit_code=1
  fi
done

# Check if any tests failed
if [ $exit_code -ne 0 ]; then
  echo "Some tests failed. Check logs for details."
  exit 1
else
  echo "All tests passed!"
fi
