#!/bin/bash

# Master Business Flow Test Runner
# Executes all business flow tests with comprehensive reporting

set -e

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load shared utilities
source "./shared/api-client.sh"
source "./shared/test-helpers.sh"

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3000/api/v1}"
PARALLEL_EXECUTION="${PARALLEL_EXECUTION:-false}"
CLEANUP_ON_FAILURE="${CLEANUP_ON_FAILURE:-true}"
REPORT_DIR="${REPORT_DIR:-./reports}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="$REPORT_DIR/business_flow_report_$TIMESTAMP.md"
DETAILED_LOG="$REPORT_DIR/detailed_log_$TIMESTAMP.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Test categories and their scripts
declare -A TEST_CATEGORIES
TEST_CATEGORIES["Client Journey"]="client-journey"
TEST_CATEGORIES["Appointment Lifecycle"]="appointment-lifecycle"
TEST_CATEGORIES["Financial Transactions"]="financial-transactions"
TEST_CATEGORIES["Inventory & POS"]="inventory-pos"
TEST_CATEGORIES["Staff Management"]="staff-management"
TEST_CATEGORIES["Additional Business Flows"]="additional-flows"

# Results tracking
declare -A CATEGORY_RESULTS
declare -A EXECUTION_TIMES
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
START_TIME=$(date +%s)

# Display usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -c, --category CATEGORY    Run tests for specific category only"
    echo "  -p, --parallel            Run tests in parallel (where possible)"
    echo "  -s, --single TEST_NAME    Run single test by name"
    echo "  -l, --list               List all available tests"
    echo "  --no-cleanup             Skip cleanup on failure"
    echo "  --report-only            Generate report from existing results"
    echo "  -h, --help               Show this help message"
    echo ""
    echo "Categories:"
    for category in "${!TEST_CATEGORIES[@]}"; do
        echo "  - $category"
    done
    echo ""
    echo "Environment Variables:"
    echo "  API_BASE_URL             Base URL for API (default: http://localhost:3000/api/v1)"
    echo "  PARALLEL_EXECUTION       Enable parallel execution (default: false)"
    echo "  CLEANUP_ON_FAILURE       Cleanup test data on failure (default: true)"
    echo "  REPORT_DIR              Report output directory (default: ./reports)"
}

# Initialize reporting
init_reporting() {
    mkdir -p "$REPORT_DIR"
    
    # Create detailed log file
    exec 3>&1 4>&2
    exec 1> >(tee -a "$DETAILED_LOG")
    exec 2> >(tee -a "$DETAILED_LOG" >&2)
    
    echo "Business Flow Test Execution Started: $(date)"
    echo "API Base URL: $API_BASE_URL"
    echo "Parallel Execution: $PARALLEL_EXECUTION"
    echo "Report Directory: $REPORT_DIR"
    echo "========================================"
    echo
}

# List available tests
list_tests() {
    echo "Available Business Flow Tests:"
    echo
    
    for category in "${!TEST_CATEGORIES[@]}"; do
        local category_dir="${TEST_CATEGORIES[$category]}"
        echo "${CYAN}$category:${NC}"
        
        if [[ -d "$category_dir" ]]; then
            find "$category_dir" -name "*.sh" -type f | sort | while read -r test_file; do
                local test_name=$(basename "$test_file" .sh)
                echo "  - $test_name"
            done
        else
            echo "  ${YELLOW}No tests found${NC}"
        fi
        echo
    done
}

# Setup test environment
setup_environment() {
    echo "${CYAN}Setting up test environment...${NC}"
    
    # Check API health first
    if ! check_api_health; then
        echo "${RED}Error: API is not healthy. Please ensure the server is running.${NC}" >&2
        return 1
    fi
    
    # Setup test environment
    if ! setup_test_environment; then
        echo "${RED}Error: Failed to setup test environment${NC}" >&2
        return 1
    fi
    
    echo "${GREEN}Test environment ready${NC}"
    echo "Company ID: $TEST_COMPANY_ID"
    echo
}

# Execute single test
run_single_test() {
    local test_file="$1"
    local test_name=$(basename "$test_file" .sh)
    local category_dir=$(dirname "$test_file")
    local category_name=""
    
    # Find category name
    for cat in "${!TEST_CATEGORIES[@]}"; do
        if [[ "${TEST_CATEGORIES[$cat]}" == "$category_dir" ]]; then
            category_name="$cat"
            break
        fi
    done
    
    echo "${MAGENTA}Executing Test: $test_name${NC}"
    echo "Category: $category_name"
    echo "File: $test_file"
    echo
    
    local test_start_time=$(date +%s)
    
    if [[ -f "$test_file" && -x "$test_file" ]]; then
        # Execute the test
        if bash "$test_file"; then
            local test_status="PASSED"
            ((PASSED_TESTS++))
        else
            local test_status="FAILED"
            ((FAILED_TESTS++))
            
            if [[ "$CLEANUP_ON_FAILURE" == "true" ]]; then
                echo "${YELLOW}Cleaning up after test failure...${NC}"
                cleanup_created_entities
            fi
        fi
    else
        echo "${RED}Error: Test file not found or not executable: $test_file${NC}" >&2
        local test_status="ERROR"
        ((FAILED_TESTS++))
    fi
    
    local test_end_time=$(date +%s)
    local test_duration=$((test_end_time - test_start_time))
    
    ((TOTAL_TESTS++))
    EXECUTION_TIMES["$test_name"]="$test_duration"
    
    if [[ -n "$category_name" ]]; then
        if [[ -z "${CATEGORY_RESULTS[$category_name]}" ]]; then
            CATEGORY_RESULTS["$category_name"]="$test_status:1"
        else
            local current="${CATEGORY_RESULTS[$category_name]}"
            local current_status=$(echo "$current" | cut -d':' -f1)
            local current_count=$(echo "$current" | cut -d':' -f2)
            
            if [[ "$test_status" == "FAILED" || "$current_status" == "FAILED" ]]; then
                CATEGORY_RESULTS["$category_name"]="FAILED:$((current_count + 1))"
            else
                CATEGORY_RESULTS["$category_name"]="$current_status:$((current_count + 1))"
            fi
        fi
    fi
    
    echo "${CYAN}Test completed: $test_name - $test_status (${test_duration}s)${NC}"
    echo
}

# Execute tests in a category
run_category_tests() {
    local category_name="$1"
    local category_dir="${TEST_CATEGORIES[$category_name]}"
    
    echo "${CYAN}========================================${NC}"
    echo "${CYAN}Running Category: $category_name${NC}"
    echo "${CYAN}========================================${NC}"
    echo
    
    if [[ ! -d "$category_dir" ]]; then
        echo "${YELLOW}Warning: Category directory not found: $category_dir${NC}"
        return
    fi
    
    local test_files=($(find "$category_dir" -name "*.sh" -type f -executable | sort))
    
    if [[ ${#test_files[@]} -eq 0 ]]; then
        echo "${YELLOW}No executable test files found in $category_dir${NC}"
        return
    fi
    
    echo "Found ${#test_files[@]} tests in $category_name"
    echo
    
    if [[ "$PARALLEL_EXECUTION" == "true" ]]; then
        echo "${BLUE}Executing tests in parallel...${NC}"
        
        local pids=()
        for test_file in "${test_files[@]}"; do
            run_single_test "$test_file" &
            pids+=($!)
        done
        
        # Wait for all parallel tests to complete
        for pid in "${pids[@]}"; do
            wait "$pid"
        done
    else
        echo "${BLUE}Executing tests sequentially...${NC}"
        
        for test_file in "${test_files[@]}"; do
            run_single_test "$test_file"
        done
    fi
    
    echo "${CYAN}Category completed: $category_name${NC}"
    echo
}

# Generate final report
generate_report() {
    local end_time=$(date +%s)
    local total_duration=$((end_time - START_TIME))
    
    echo "${CYAN}Generating test report...${NC}"
    
    {
        echo "# Business Flow Test Report"
        echo
        echo "**Generated:** $(date)"
        echo "**Execution Time:** ${total_duration}s"
        echo "**API Base URL:** $API_BASE_URL"
        echo "**Parallel Execution:** $PARALLEL_EXECUTION"
        echo
        
        # Summary
        echo "## Summary"
        echo
        local success_rate=0
        if [[ $TOTAL_TESTS -gt 0 ]]; then
            success_rate=$(echo "scale=2; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc -l)
        fi
        
        echo "| Metric | Value |"
        echo "|--------|-------|"
        echo "| Total Tests | $TOTAL_TESTS |"
        echo "| Passed | $PASSED_TESTS |"
        echo "| Failed | $FAILED_TESTS |"
        echo "| Success Rate | ${success_rate}% |"
        echo "| Total Duration | ${total_duration}s |"
        echo
        
        # Category Results
        echo "## Category Results"
        echo
        echo "| Category | Status | Tests | Duration |"
        echo "|----------|--------|-------|----------|"
        
        for category in "${!CATEGORY_RESULTS[@]}"; do
            local result="${CATEGORY_RESULTS[$category]}"
            local status=$(echo "$result" | cut -d':' -f1)
            local count=$(echo "$result" | cut -d':' -f2)
            
            local category_duration=0
            for test in "${!EXECUTION_TIMES[@]}"; do
                # This is a simplified approach; in a real implementation,
                # you'd want better tracking of which tests belong to which category
                category_duration=$((category_duration + EXECUTION_TIMES[$test]))
            done
            
            echo "| $category | $status | $count | ${category_duration}s |"
        done
        echo
        
        # Individual Test Results
        echo "## Individual Test Results"
        echo
        echo "| Test | Duration | Status |"
        echo "|------|----------|--------|"
        
        for test in "${!EXECUTION_TIMES[@]}"; do
            local duration="${EXECUTION_TIMES[$test]}"
            echo "| $test | ${duration}s | - |"
        done
        echo
        
        # Test Environment Details
        echo "## Test Environment"
        echo
        echo "- **Company ID:** $TEST_COMPANY_ID"
        echo "- **Admin Email:** $TEST_ADMIN_EMAIL"
        echo "- **API Version:** v1"
        echo "- **Test Data Prefix:** Test"
        echo
        
        # Footer
        echo "---"
        echo "Report generated by Business Flow Test Suite"
        echo "$(date)"
        
    } > "$REPORT_FILE"
    
    echo "${GREEN}Report generated: $REPORT_FILE${NC}"
}

# Main execution function
main() {
    local category=""
    local single_test=""
    local list_only=false
    local report_only=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -c|--category)
                category="$2"
                shift 2
                ;;
            -p|--parallel)
                PARALLEL_EXECUTION="true"
                shift
                ;;
            -s|--single)
                single_test="$2"
                shift 2
                ;;
            -l|--list)
                list_only=true
                shift
                ;;
            --no-cleanup)
                CLEANUP_ON_FAILURE="false"
                shift
                ;;
            --report-only)
                report_only=true
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                echo "Unknown option: $1" >&2
                usage >&2
                exit 1
                ;;
        esac
    done
    
    # Handle list-only mode
    if [[ "$list_only" == "true" ]]; then
        list_tests
        exit 0
    fi
    
    # Initialize reporting
    init_reporting
    
    # Handle report-only mode
    if [[ "$report_only" == "true" ]]; then
        generate_report
        exit 0
    fi
    
    echo "${MAGENTA}Business Flow Test Suite${NC}"
    echo "${MAGENTA}========================${NC}"
    echo
    
    # Setup test environment
    if ! setup_environment; then
        echo "${RED}Failed to setup test environment. Exiting.${NC}" >&2
        exit 1
    fi
    
    # Execute tests based on mode
    if [[ -n "$single_test" ]]; then
        # Single test mode
        echo "${BLUE}Running single test: $single_test${NC}"
        
        # Find the test file
        local found_test=""
        for cat_name in "${!TEST_CATEGORIES[@]}"; do
            local cat_dir="${TEST_CATEGORIES[$cat_name]}"
            local test_file="$cat_dir/$single_test.sh"
            if [[ -f "$test_file" ]]; then
                found_test="$test_file"
                break
            fi
        done
        
        if [[ -n "$found_test" ]]; then
            run_single_test "$found_test"
        else
            echo "${RED}Error: Test not found: $single_test${NC}" >&2
            exit 1
        fi
        
    elif [[ -n "$category" ]]; then
        # Category mode
        if [[ -n "${TEST_CATEGORIES[$category]}" ]]; then
            run_category_tests "$category"
        else
            echo "${RED}Error: Unknown category: $category${NC}" >&2
            echo "Available categories:"
            for cat in "${!TEST_CATEGORIES[@]}"; do
                echo "  - $cat"
            done
            exit 1
        fi
        
    else
        # Full suite mode
        echo "${BLUE}Running full business flow test suite...${NC}"
        echo
        
        for category_name in "${!TEST_CATEGORIES[@]}"; do
            run_category_tests "$category_name"
        done
    fi
    
    # Generate final report
    generate_report
    
    # Final summary
    echo "${MAGENTA}========================================${NC}"
    echo "${MAGENTA}Business Flow Test Suite Complete${NC}"
    echo "${MAGENTA}========================================${NC}"
    echo
    echo "Total Tests: $TOTAL_TESTS"
    echo "Passed: ${GREEN}$PASSED_TESTS${NC}"
    echo "Failed: ${RED}$FAILED_TESTS${NC}"
    
    if [[ $FAILED_TESTS -eq 0 ]]; then
        echo "Status: ${GREEN}ALL TESTS PASSED${NC}"
        exit 0
    else
        echo "Status: ${RED}SOME TESTS FAILED${NC}"
        exit 1
    fi
}

# Run main function with all arguments
main "$@"