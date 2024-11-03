#!/bin/bash

# Human Tasks:
# 1. Ensure node_modules are installed with correct versions
# 2. Configure CI environment variables in your CI/CD platform
# 3. Set up test coverage reporting in your CI platform
# 4. Configure test result artifact storage
# 5. Set up test failure notifications

# Requirement: Testing Tools (7.5 Development and Deployment Tools/Testing)
# Implements automated testing using Jest for unit testing, integration testing, and API testing with coverage thresholds of 80%

# Set error handling
set -e
trap 'echo "Error on line $LINENO"' ERR

# Environment setup
# Requirement: Web Dashboard Testing (4.4.1 Frontend Technologies)
export NODE_ENV=test
export CI=true
export REACT_APP_ENVIRONMENT=test

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Utility functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check for node_modules
    if [ ! -d "node_modules" ]; then
        log_error "node_modules not found. Please run 'npm install' first."
        exit 1
    }

    # Check for Jest binary
    if [ ! -f "node_modules/.bin/jest" ]; then
        log_error "Jest not found. Please ensure jest@^29.0.0 is installed."
        exit 1
    }

    # Check for testing-library dependencies
    if [ ! -d "node_modules/@testing-library" ]; then
        log_error "@testing-library dependencies not found. Please check package.json and run 'npm install'."
        exit 1
    }
}

# Function to run unit tests
run_unit_tests() {
    log_info "Running unit tests..."
    
    ./node_modules/.bin/jest \
        --testRegex "tests/unit/.*\.(test|spec)\.[jt]sx?$" \
        --coverage \
        --coverageDirectory coverage/unit \
        --verbose \
        || { log_error "Unit tests failed"; exit 1; }
    
    log_info "Unit tests completed successfully"
}

# Function to run integration tests
run_integration_tests() {
    log_info "Running integration tests..."
    
    ./node_modules/.bin/jest \
        --testRegex "tests/integration/.*\.(test|spec)\.[jt]sx?$" \
        --coverage \
        --coverageDirectory coverage/integration \
        --verbose \
        || { log_error "Integration tests failed"; exit 1; }
    
    log_info "Integration tests completed successfully"
}

# Function to run e2e tests
run_e2e_tests() {
    log_info "Running end-to-end tests..."
    
    ./node_modules/.bin/jest \
        --testRegex "tests/e2e/.*\.(test|spec)\.[jt]sx?$" \
        --coverage \
        --coverageDirectory coverage/e2e \
        --verbose \
        || { log_error "E2E tests failed"; exit 1; }
    
    log_info "E2E tests completed successfully"
}

# Function to check coverage thresholds
check_coverage() {
    log_info "Checking coverage thresholds..."
    
    # Coverage thresholds from jest.config.js (80% for all metrics)
    local threshold=80
    
    # Check coverage reports
    for report in coverage/*/coverage-summary.json; do
        if [ -f "$report" ]; then
            local branch_coverage=$(jq '.total.branches.pct' "$report")
            local function_coverage=$(jq '.total.functions.pct' "$report")
            local line_coverage=$(jq '.total.lines.pct' "$report")
            local statement_coverage=$(jq '.total.statements.pct' "$report")
            
            if (( $(echo "$branch_coverage < $threshold" | bc -l) )) || \
               (( $(echo "$function_coverage < $threshold" | bc -l) )) || \
               (( $(echo "$line_coverage < $threshold" | bc -l) )) || \
               (( $(echo "$statement_coverage < $threshold" | bc -l) )); then
                log_error "Coverage is below the required threshold of ${threshold}%"
                log_error "Branches: ${branch_coverage}%"
                log_error "Functions: ${function_coverage}%"
                log_error "Lines: ${line_coverage}%"
                log_error "Statements: ${statement_coverage}%"
                exit 1
            fi
        fi
    done
    
    log_info "Coverage thresholds met successfully"
}

# Function to merge coverage reports
merge_coverage_reports() {
    log_info "Merging coverage reports..."
    
    # Create combined coverage directory
    mkdir -p coverage/combined
    
    # Merge coverage reports using nyc
    ./node_modules/.bin/nyc merge \
        coverage/{unit,integration,e2e} \
        coverage/combined/coverage-final.json \
        || { log_error "Failed to merge coverage reports"; exit 1; }
    
    # Generate combined HTML report
    ./node_modules/.bin/nyc report \
        --reporter=html \
        --reporter=text \
        --reporter=lcov \
        -t coverage/combined \
        -o coverage/combined/html \
        || { log_error "Failed to generate combined coverage report"; exit 1; }
    
    log_info "Coverage reports merged successfully"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up temporary files..."
    
    # Remove temporary coverage files but keep the final reports
    find coverage -type f -name "*.raw.json" -delete
    
    log_info "Cleanup completed"
}

# Main execution
main() {
    log_info "Starting test execution..."
    
    # Check prerequisites
    check_prerequisites
    
    # Create coverage directory
    mkdir -p coverage
    
    # Run all test suites
    run_unit_tests
    run_integration_tests
    run_e2e_tests
    
    # Check coverage thresholds
    check_coverage
    
    # Merge coverage reports
    merge_coverage_reports
    
    # Cleanup
    cleanup
    
    log_info "All tests completed successfully!"
}

# Trap cleanup function
trap cleanup EXIT

# Execute main function
main