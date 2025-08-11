#!/bin/bash

# Test Helpers and Validation Functions for Business Flow Tests
# Provides common testing utilities, assertions, and flow management

# Load dependencies
source "$(dirname "${BASH_SOURCE[0]}")/api-client.sh"
source "$(dirname "${BASH_SOURCE[0]}")/test-data-generator.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Test state variables
CURRENT_TEST=""
CURRENT_STEP=""
STEP_COUNT=0
PASSED_STEPS=0
FAILED_STEPS=0
START_TIME=""
STEP_START_TIME=""

# Test results storage
declare -A TEST_RESULTS
declare -A STEP_TIMINGS
declare -A CREATED_ENTITIES

# Logging and reporting
init_test() {
    local test_name="$1"
    local description="$2"
    
    CURRENT_TEST="$test_name"
    STEP_COUNT=0
    PASSED_STEPS=0
    FAILED_STEPS=0
    START_TIME=$(date +%s%3N)
    
    echo
    echo "${CYAN}========================================${NC}"
    echo "${CYAN}Starting Test: $test_name${NC}"
    echo "${CYAN}Description: $description${NC}"
    echo "${CYAN}========================================${NC}"
    echo
    
    TEST_RESULTS["$test_name,description"]="$description"
    TEST_RESULTS["$test_name,start_time"]="$START_TIME"
    TEST_RESULTS["$test_name,status"]="RUNNING"
}

start_step() {
    local step_name="$1"
    local description="$2"
    
    CURRENT_STEP="$step_name"
    ((STEP_COUNT++))
    STEP_START_TIME=$(date +%s%3N)
    
    echo "${BLUE}Step $STEP_COUNT: $step_name${NC}"
    if [[ -n "$description" ]]; then
        echo "  $description"
    fi
}

pass_step() {
    local message="${1:-Step completed successfully}"
    local end_time=$(date +%s%3N)
    local duration=$((end_time - STEP_START_TIME))
    
    ((PASSED_STEPS++))
    echo "  ${GREEN}✓ $message${NC} (${duration}ms)"
    
    STEP_TIMINGS["$CURRENT_TEST,$CURRENT_STEP"]="$duration"
    TEST_RESULTS["$CURRENT_TEST,step_$STEP_COUNT,status"]="PASSED"
    TEST_RESULTS["$CURRENT_TEST,step_$STEP_COUNT,message"]="$message"
    TEST_RESULTS["$CURRENT_TEST,step_$STEP_COUNT,duration"]="$duration"
}

fail_step() {
    local message="${1:-Step failed}"
    local end_time=$(date +%s%3N)
    local duration=$((end_time - STEP_START_TIME))
    
    ((FAILED_STEPS++))
    echo "  ${RED}✗ $message${NC} (${duration}ms)"
    
    STEP_TIMINGS["$CURRENT_TEST,$CURRENT_STEP"]="$duration"
    TEST_RESULTS["$CURRENT_TEST,step_$STEP_COUNT,status"]="FAILED"
    TEST_RESULTS["$CURRENT_TEST,step_$STEP_COUNT,message"]="$message"
    TEST_RESULTS["$CURRENT_TEST,step_$STEP_COUNT,duration"]="$duration"
}

finish_test() {
    local end_time=$(date +%s%3N)
    local total_duration=$((end_time - START_TIME))
    
    echo
    echo "${CYAN}========================================${NC}"
    echo "${CYAN}Test Complete: $CURRENT_TEST${NC}"
    echo "  Total Steps: $STEP_COUNT"
    echo "  Passed: ${GREEN}$PASSED_STEPS${NC}"
    echo "  Failed: ${RED}$FAILED_STEPS${NC}"
    echo "  Duration: ${total_duration}ms"
    
    if [[ $FAILED_STEPS -eq 0 ]]; then
        echo "  Status: ${GREEN}PASSED${NC}"
        TEST_RESULTS["$CURRENT_TEST,status"]="PASSED"
    else
        echo "  Status: ${RED}FAILED${NC}"
        TEST_RESULTS["$CURRENT_TEST,status"]="FAILED"
    fi
    
    echo "${CYAN}========================================${NC}"
    echo
    
    TEST_RESULTS["$CURRENT_TEST,end_time"]="$end_time"
    TEST_RESULTS["$CURRENT_TEST,duration"]="$total_duration"
    TEST_RESULTS["$CURRENT_TEST,passed_steps"]="$PASSED_STEPS"
    TEST_RESULTS["$CURRENT_TEST,failed_steps"]="$FAILED_STEPS"
    TEST_RESULTS["$CURRENT_TEST,total_steps"]="$STEP_COUNT"
}

# Entity management
track_created_entity() {
    local entity_type="$1"
    local entity_id="$2"
    local entity_data="$3"
    
    CREATED_ENTITIES["$CURRENT_TEST,$entity_type,$entity_id"]="$entity_data"
}

cleanup_created_entities() {
    local test_name="${1:-$CURRENT_TEST}"
    
    echo "${YELLOW}Cleaning up entities created during $test_name...${NC}"
    
    for key in "${!CREATED_ENTITIES[@]}"; do
        if [[ $key == "$test_name,"* ]]; then
            local entity_type=$(echo "$key" | cut -d',' -f2)
            local entity_id=$(echo "$key" | cut -d',' -f3)
            
            case "$entity_type" in
                "client")
                    http_delete "/clients/$entity_id" > /dev/null 2>&1
                    echo "  Deleted client: $entity_id"
                    ;;
                "staff")
                    http_delete "/staff/$entity_id" > /dev/null 2>&1
                    echo "  Deleted staff: $entity_id"
                    ;;
                "appointment")
                    http_delete "/appointments/$entity_id" > /dev/null 2>&1
                    echo "  Deleted appointment: $entity_id"
                    ;;
                "invoice")
                    http_delete "/invoices/$entity_id" > /dev/null 2>&1
                    echo "  Deleted invoice: $entity_id"
                    ;;
                "product")
                    http_delete "/inventory/products/$entity_id" > /dev/null 2>&1
                    echo "  Deleted product: $entity_id"
                    ;;
                "service")
                    http_delete "/services/$entity_id" > /dev/null 2>&1
                    echo "  Deleted service: $entity_id"
                    ;;
            esac
            
            unset CREATED_ENTITIES["$key"]
        fi
    done
}

# Validation helpers
assert_response_success() {
    local response="$1"
    local step_message="$2"
    
    if echo "$response" | jq -e '.data // .id // .token' > /dev/null 2>&1; then
        pass_step "$step_message"
        return 0
    else
        fail_step "$step_message - Invalid response format"
        echo "  Response: $response"
        return 1
    fi
}

assert_field_equals() {
    local response="$1"
    local field_path="$2"
    local expected_value="$3"
    local step_message="$4"
    
    local actual_value=$(echo "$response" | jq -r "$field_path // empty")
    
    if [[ "$actual_value" == "$expected_value" ]]; then
        pass_step "$step_message"
        return 0
    else
        fail_step "$step_message - Expected '$expected_value', got '$actual_value'"
        return 1
    fi
}

assert_field_exists() {
    local response="$1"
    local field_path="$2"
    local step_message="$3"
    
    local value=$(echo "$response" | jq -r "$field_path // empty")
    
    if [[ -n "$value" && "$value" != "null" ]]; then
        pass_step "$step_message"
        return 0
    else
        fail_step "$step_message - Field '$field_path' does not exist or is null"
        return 1
    fi
}

assert_array_length() {
    local response="$1"
    local array_path="$2"
    local expected_length="$3"
    local step_message="$4"
    
    local actual_length=$(echo "$response" | jq -r "$array_path | length")
    
    if [[ "$actual_length" == "$expected_length" ]]; then
        pass_step "$step_message"
        return 0
    else
        fail_step "$step_message - Expected length $expected_length, got $actual_length"
        return 1
    fi
}

assert_field_contains() {
    local response="$1"
    local field_path="$2"
    local expected_substring="$3"
    local step_message="$4"
    
    local field_value=$(echo "$response" | jq -r "$field_path // empty")
    
    if [[ "$field_value" == *"$expected_substring"* ]]; then
        pass_step "$step_message"
        return 0
    else
        fail_step "$step_message - Field '$field_path' does not contain '$expected_substring'"
        return 1
    fi
}

# Timing helpers
wait_for_condition() {
    local condition_function="$1"
    local timeout_seconds="${2:-30}"
    local check_interval="${3:-2}"
    local description="$4"
    
    local elapsed=0
    
    while [[ $elapsed -lt $timeout_seconds ]]; do
        if $condition_function; then
            pass_step "Condition met: $description"
            return 0
        fi
        
        sleep $check_interval
        elapsed=$((elapsed + check_interval))
    done
    
    fail_step "Timeout waiting for condition: $description"
    return 1
}

# API-specific helpers
create_and_track_client() {
    local company_id="$1"
    local client_data="$2"
    
    local response=$(http_post "/clients" "$client_data")
    local client_id=$(echo "$response" | jq -r '.data.id // .id // empty')
    
    if [[ -n "$client_id" ]]; then
        track_created_entity "client" "$client_id" "$client_data"
        echo "$response"
        return 0
    else
        return 1
    fi
}

create_and_track_appointment() {
    local appointment_data="$1"
    
    local response=$(http_post "/appointments" "$appointment_data")
    local appointment_id=$(echo "$response" | jq -r '.data.id // .id // empty')
    
    if [[ -n "$appointment_id" ]]; then
        track_created_entity "appointment" "$appointment_id" "$appointment_data"
        echo "$response"
        return 0
    else
        return 1
    fi
}

create_and_track_invoice() {
    local invoice_data="$1"
    
    local response=$(http_post "/invoices" "$invoice_data")
    local invoice_id=$(echo "$response" | jq -r '.data.id // .id // empty')
    
    if [[ -n "$invoice_id" ]]; then
        track_created_entity "invoice" "$invoice_id" "$invoice_data"
        echo "$response"
        return 0
    else
        return 1
    fi
}

create_and_track_product() {
    local product_data="$1"
    
    local response=$(http_post "/inventory/products" "$product_data")
    local product_id=$(echo "$response" | jq -r '.data.id // .id // empty')
    
    if [[ -n "$product_id" ]]; then
        track_created_entity "product" "$product_id" "$product_data"
        echo "$response"
        return 0
    else
        return 1
    fi
}

# Flow simulation helpers
simulate_user_delay() {
    local min_seconds="${1:-1}"
    local max_seconds="${2:-3}"
    local delay=$((RANDOM % (max_seconds - min_seconds + 1) + min_seconds))
    
    echo "  ${YELLOW}Simulating user delay (${delay}s)...${NC}"
    sleep $delay
}

simulate_processing_time() {
    local seconds="${1:-2}"
    
    echo "  ${YELLOW}Processing...${NC}"
    sleep $seconds
}

# Report generation
generate_test_report() {
    local report_file="$1"
    local test_suite_name="$2"
    
    {
        echo "# Business Flow Test Report"
        echo "**Generated:** $(date)"
        echo "**Test Suite:** $test_suite_name"
        echo
        
        local total_tests=0
        local passed_tests=0
        local failed_tests=0
        
        for key in "${!TEST_RESULTS[@]}"; do
            if [[ $key == *",status" ]]; then
                local test_name=$(echo "$key" | cut -d',' -f1)
                local status="${TEST_RESULTS[$key]}"
                
                ((total_tests++))
                if [[ "$status" == "PASSED" ]]; then
                    ((passed_tests++))
                else
                    ((failed_tests++))
                fi
            fi
        done
        
        echo "## Summary"
        echo "- **Total Tests:** $total_tests"
        echo "- **Passed:** $passed_tests"
        echo "- **Failed:** $failed_tests"
        echo "- **Success Rate:** $(echo "scale=2; $passed_tests * 100 / $total_tests" | bc)%"
        echo
        
        echo "## Test Results"
        for key in "${!TEST_RESULTS[@]}"; do
            if [[ $key == *",status" ]]; then
                local test_name=$(echo "$key" | cut -d',' -f1)
                local status="${TEST_RESULTS[$key]}"
                local description="${TEST_RESULTS["$test_name,description"]}"
                local duration="${TEST_RESULTS["$test_name,duration"]}"
                local passed_steps="${TEST_RESULTS["$test_name,passed_steps"]}"
                local failed_steps="${TEST_RESULTS["$test_name,failed_steps"]}"
                local total_steps="${TEST_RESULTS["$test_name,total_steps"]}"
                
                echo "### $test_name"
                echo "**Status:** $status"
                echo "**Description:** $description"
                echo "**Duration:** ${duration}ms"
                echo "**Steps:** $passed_steps passed, $failed_steps failed, $total_steps total"
                echo
            fi
        done
        
    } > "$report_file"
    
    echo "Test report generated: $report_file"
}

# Setup test environment
setup_test_environment() {
    local company_email="${1:-testcompany$(date +%s)@example.com}"
    local admin_email="${2:-admin$(date +%s)@example.com}"
    
    echo "${CYAN}Setting up test environment...${NC}"
    
    # Check API health
    if ! check_api_health; then
        echo "${RED}API health check failed. Cannot proceed with tests.${NC}"
        return 1
    fi
    
    # Create test company
    local company_data=$(generate_test_company "Test Company $(date +%s)" "$company_email")
    local company_response=$(http_post "/auth/register-company" "$company_data")
    local company_id=$(echo "$company_response" | jq -r '.data.company.id // .company.id // empty')
    
    if [[ -z "$company_id" ]]; then
        echo "${RED}Failed to create test company${NC}"
        return 1
    fi
    
    # Login as admin
    if ! auth_login "$company_email" "TestPass123!" "$company_id"; then
        echo "${RED}Failed to authenticate with test company${NC}"
        return 1
    fi
    
    export TEST_COMPANY_ID="$company_id"
    export TEST_ADMIN_EMAIL="$company_email"
    
    echo "${GREEN}Test environment setup complete${NC}"
    echo "Company ID: $company_id"
    echo "Admin Email: $company_email"
    
    return 0
}

# Export all functions
export -f init_test start_step pass_step fail_step finish_test
export -f track_created_entity cleanup_created_entities
export -f assert_response_success assert_field_equals assert_field_exists assert_array_length assert_field_contains
export -f wait_for_condition
export -f create_and_track_client create_and_track_appointment create_and_track_invoice create_and_track_product
export -f simulate_user_delay simulate_processing_time
export -f generate_test_report setup_test_environment