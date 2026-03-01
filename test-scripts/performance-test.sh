#!/bin/bash

# Performance Test Suite - Load Testing and Benchmarks
# Tests API performance under various load conditions

BASE_URL="http://localhost:3000/api/v1"
CONTENT_TYPE="Content-Type: application/json"
TEST_EMAIL_PREFIX="test-perf-$(date +%s)"
TEST_PASSWORD="TestPassword123!"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Performance thresholds (in milliseconds)
SINGLE_REQUEST_THRESHOLD=2000    # 2 seconds
CONCURRENT_REQUEST_THRESHOLD=5000 # 5 seconds
LOAD_TEST_THRESHOLD=10000        # 10 seconds

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test data
AUTH_TOKEN=""
COMPANY_ID=""
BRANCH_ID=""
CLIENT_ID=""

# Logging
LOG_FILE="performance-test-$(date +%Y%m%d-%H%M%S).log"

# Helper functions
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

print_test_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
    log "Starting test section: $1"
}

run_performance_test() {
    local test_name="$1"
    local duration="$2"
    local threshold="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ $duration -lt $threshold ]; then
        echo -e "✅ ${GREEN}PASS${NC}: $test_name (${duration}ms < ${threshold}ms)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        log "PASS: $test_name - Duration: ${duration}ms (threshold: ${threshold}ms)"
    else
        echo -e "❌ ${RED}FAIL${NC}: $test_name (${duration}ms >= ${threshold}ms)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        log "FAIL: $test_name - Duration: ${duration}ms exceeded threshold: ${threshold}ms"
    fi
}

# Setup test environment
setup_test_environment() {
    print_test_header "SETTING UP PERFORMANCE TEST ENVIRONMENT"
    
    # Register user with company
    local register_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/auth/register-with-company" \
        -H "$CONTENT_TYPE" \
        -d '{
            "email": "'${TEST_EMAIL_PREFIX}@example.com'",
            "password": "'$TEST_PASSWORD'",
            "firstName": "Performance",
            "lastName": "Tester",
            "companyName": "Performance Test Company"
        }')
    
    AUTH_TOKEN=$(echo "$register_response" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
    COMPANY_ID=$(echo "$register_response" | grep -o '"companyId":"[^"]*' | cut -d'"' -f4)
    
    if [ -z "$AUTH_TOKEN" ] || [ -z "$COMPANY_ID" ]; then
        echo -e "❌ ${RED}Failed to setup performance test environment${NC}"
        exit 1
    fi
    
    # Create test data
    local branch_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/companies/$COMPANY_ID/branches" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "name": "Performance Test Branch",
            "type": "MAIN",
            "address": {
                "street": "123 Perf St",
                "city": "Perf City",
                "country": "Perf Country"
            }
        }')
    
    BRANCH_ID=$(echo "$branch_response" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    
    # Create test client
    local client_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/clients" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "firstName": "Performance",
            "lastName": "Client",
            "email": "'${TEST_EMAIL_PREFIX}-client@example.com'"
        }')
    
    CLIENT_ID=$(echo "$client_response" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    
    echo -e "✅ ${GREEN}Performance test environment setup complete${NC}"
    echo "Company ID: $COMPANY_ID"
    echo "Branch ID: $BRANCH_ID"
    echo "Client ID: $CLIENT_ID"
}

# Test 1: Single Request Performance
test_single_request_performance() {
    print_test_header "TESTING SINGLE REQUEST PERFORMANCE"
    
    # Test authentication performance
    local auth_start=$(date +%s%3N)
    local auth_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/auth/login" \
        -H "$CONTENT_TYPE" \
        -d '{
            "email": "'${TEST_EMAIL_PREFIX}@example.com'",
            "password": "'$TEST_PASSWORD'"
        }')
    local auth_end=$(date +%s%3N)
    local auth_duration=$((auth_end - auth_start))
    
    run_performance_test "Authentication login" $auth_duration $SINGLE_REQUEST_THRESHOLD
    
    # Test client list performance
    local clients_start=$(date +%s%3N)
    local clients_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/clients" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    local clients_end=$(date +%s%3N)
    local clients_duration=$((clients_end - clients_start))
    
    run_performance_test "Client list retrieval" $clients_duration $SINGLE_REQUEST_THRESHOLD
    
    # Test company profile performance
    local profile_start=$(date +%s%3N)
    local profile_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/company/profile" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    local profile_end=$(date +%s%3N)
    local profile_duration=$((profile_end - profile_start))
    
    run_performance_test "Company profile retrieval" $profile_duration $SINGLE_REQUEST_THRESHOLD
    
    # Test appointments list performance
    local appointments_start=$(date +%s%3N)
    local appointments_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/appointments" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    local appointments_end=$(date +%s%3N)
    local appointments_duration=$((appointments_end - appointments_start))
    
    run_performance_test "Appointments list retrieval" $appointments_duration $SINGLE_REQUEST_THRESHOLD
    
    # Test branch list performance
    local branches_start=$(date +%s%3N)
    local branches_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/companies/$COMPANY_ID/branches" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    local branches_end=$(date +%s%3N)
    local branches_duration=$((branches_end - branches_start))
    
    run_performance_test "Branch list retrieval" $branches_duration $SINGLE_REQUEST_THRESHOLD
}

# Test 2: Concurrent Requests Performance
test_concurrent_requests() {
    print_test_header "TESTING CONCURRENT REQUESTS PERFORMANCE"
    
    # Test 5 concurrent client requests
    echo "Testing 5 concurrent client list requests..."
    local concurrent_start=$(date +%s%3N)
    
    for i in {1..5}; do
        curl -s -X GET "$BASE_URL/clients" \
            -H "Authorization: Bearer $AUTH_TOKEN" > /dev/null &
    done
    wait
    
    local concurrent_end=$(date +%s%3N)
    local concurrent_duration=$((concurrent_end - concurrent_start))
    
    run_performance_test "5 concurrent client requests" $concurrent_duration $CONCURRENT_REQUEST_THRESHOLD
    
    # Test 10 concurrent authentication requests
    echo "Testing 10 concurrent authentication requests..."
    local auth_concurrent_start=$(date +%s%3N)
    
    for i in {1..10}; do
        curl -s -X POST "$BASE_URL/auth/login" \
            -H "$CONTENT_TYPE" \
            -d '{
                "email": "'${TEST_EMAIL_PREFIX}@example.com'",
                "password": "'$TEST_PASSWORD'"
            }' > /dev/null &
    done
    wait
    
    local auth_concurrent_end=$(date +%s%3N)
    local auth_concurrent_duration=$((auth_concurrent_end - auth_concurrent_start))
    
    run_performance_test "10 concurrent authentication requests" $auth_concurrent_duration $CONCURRENT_REQUEST_THRESHOLD
}

# Test 3: Large Dataset Performance
test_large_dataset_performance() {
    print_test_header "TESTING LARGE DATASET PERFORMANCE"
    
    echo "Creating 50 test clients for large dataset testing..."
    
    # Create multiple clients for testing
    local create_start=$(date +%s%3N)
    for i in {1..50}; do
        curl -s -X POST "$BASE_URL/clients" \
            -H "$CONTENT_TYPE" \
            -H "Authorization: Bearer $AUTH_TOKEN" \
            -d '{
                "firstName": "LoadTest'$i'",
                "lastName": "Client",
                "email": "'${TEST_EMAIL_PREFIX}-load'$i'@example.com'",
                "phone": "+123456'$(printf "%04d" $i)'"
            }' > /dev/null &
        
        # Batch requests in groups of 10 to avoid overwhelming
        if [ $((i % 10)) -eq 0 ]; then
            wait
        fi
    done
    wait
    
    local create_end=$(date +%s%3N)
    local create_duration=$((create_end - create_start))
    
    run_performance_test "Create 50 clients (bulk)" $create_duration $LOAD_TEST_THRESHOLD
    
    # Test pagination performance with large dataset
    local pagination_start=$(date +%s%3N)
    local pagination_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/clients?page=1&limit=100" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    local pagination_end=$(date +%s%3N)
    local pagination_duration=$((pagination_end - pagination_start))
    
    run_performance_test "Large dataset pagination (100 items)" $pagination_duration $SINGLE_REQUEST_THRESHOLD
    
    # Test search performance with large dataset
    local search_start=$(date +%s%3N)
    local search_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/clients/search?q=LoadTest" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    local search_end=$(date +%s%3N)
    local search_duration=$((search_end - search_start))
    
    run_performance_test "Search in large dataset" $search_duration $SINGLE_REQUEST_THRESHOLD
}

# Test 4: Complex Query Performance
test_complex_query_performance() {
    print_test_header "TESTING COMPLEX QUERY PERFORMANCE"
    
    # Test complex filtering
    local filter_start=$(date +%s%3N)
    local filter_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/clients?status=ACTIVE&sortBy=createdAt&sortDirection=desc&page=1&limit=20" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    local filter_end=$(date +%s%3N)
    local filter_duration=$((filter_end - filter_start))
    
    run_performance_test "Complex client filtering" $filter_duration $SINGLE_REQUEST_THRESHOLD
    
    # Test date range queries
    local date_range_start=$(date +%s%3N)
    local date_range_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/appointments?startDate=$(date +%Y-%m-%d)&endDate=$(date -d '+30 days' +%Y-%m-%d)" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    local date_range_end=$(date +%s%3N)
    local date_range_duration=$((date_range_end - date_range_start))
    
    run_performance_test "Date range appointment query" $date_range_duration $SINGLE_REQUEST_THRESHOLD
    
    # Test statistics queries
    local stats_start=$(date +%s%3N)
    local stats_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/clients/stats" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    local stats_end=$(date +%s%3N)
    local stats_duration=$((stats_end - stats_start))
    
    run_performance_test "Client statistics calculation" $stats_duration $SINGLE_REQUEST_THRESHOLD
}

# Test 5: Memory and Resource Usage
test_memory_resource_usage() {
    print_test_header "TESTING MEMORY AND RESOURCE USAGE"
    
    echo "Testing sustained load (50 requests over 10 seconds)..."
    
    local sustained_start=$(date +%s%3N)
    
    for i in {1..50}; do
        curl -s -X GET "$BASE_URL/clients" \
            -H "Authorization: Bearer $AUTH_TOKEN" > /dev/null &
        
        # Add small delay to spread load
        sleep 0.2
    done
    wait
    
    local sustained_end=$(date +%s%3N)
    local sustained_duration=$((sustained_end - sustained_start))
    
    run_performance_test "Sustained load (50 requests)" $sustained_duration $LOAD_TEST_THRESHOLD
    
    # Test rapid sequential requests
    echo "Testing rapid sequential requests..."
    local rapid_start=$(date +%s%3N)
    
    for i in {1..20}; do
        curl -s -X GET "$BASE_URL/company/profile" \
            -H "Authorization: Bearer $AUTH_TOKEN" > /dev/null
    done
    
    local rapid_end=$(date +%s%3N)
    local rapid_duration=$((rapid_end - rapid_start))
    
    run_performance_test "20 rapid sequential requests" $rapid_duration $CONCURRENT_REQUEST_THRESHOLD
}

# Test 6: API Response Time Consistency
test_response_time_consistency() {
    print_test_header "TESTING RESPONSE TIME CONSISTENCY"
    
    echo "Testing response time consistency over 10 requests..."
    
    local times=()
    local total_duration=0
    
    for i in {1..10}; do
        local start=$(date +%s%3N)
        curl -s -X GET "$BASE_URL/clients" \
            -H "Authorization: Bearer $AUTH_TOKEN" > /dev/null
        local end=$(date +%s%3N)
        local duration=$((end - start))
        
        times+=($duration)
        total_duration=$((total_duration + duration))
    done
    
    local average_duration=$((total_duration / 10))
    
    # Calculate variance (simplified)
    local variance=0
    for time in "${times[@]}"; do
        local diff=$((time - average_duration))
        local squared_diff=$((diff * diff))
        variance=$((variance + squared_diff))
    done
    variance=$((variance / 10))
    
    echo "Average response time: ${average_duration}ms"
    echo "Response time variance: $variance"
    
    # Test passes if average is within threshold and variance is reasonable
    if [ $average_duration -lt $SINGLE_REQUEST_THRESHOLD ] && [ $variance -lt 1000000 ]; then
        echo -e "✅ ${GREEN}PASS${NC}: Response time consistency (avg: ${average_duration}ms, variance: $variance)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Response time inconsistency (avg: ${average_duration}ms, variance: $variance)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Test 7: Error Handling Under Load
test_error_handling_under_load() {
    print_test_header "TESTING ERROR HANDLING UNDER LOAD"
    
    echo "Testing error handling with invalid requests under load..."
    
    local error_start=$(date +%s%3N)
    
    # Send multiple invalid requests simultaneously
    for i in {1..10}; do
        curl -s -X GET "$BASE_URL/clients/invalid-client-id" \
            -H "Authorization: Bearer $AUTH_TOKEN" > /dev/null &
        curl -s -X POST "$BASE_URL/clients" \
            -H "$CONTENT_TYPE" \
            -H "Authorization: Bearer $AUTH_TOKEN" \
            -d '{"invalid": "data"}' > /dev/null &
    done
    wait
    
    local error_end=$(date +%s%3N)
    local error_duration=$((error_end - error_start))
    
    run_performance_test "Error handling under load" $error_duration $CONCURRENT_REQUEST_THRESHOLD
    
    # Test rate limiting response
    echo "Testing rate limiting (if implemented)..."
    local rate_limit_start=$(date +%s%3N)
    
    for i in {1..100}; do
        curl -s -X GET "$BASE_URL/clients" \
            -H "Authorization: Bearer $AUTH_TOKEN" > /dev/null &
    done
    wait
    
    local rate_limit_end=$(date +%s%3N)
    local rate_limit_duration=$((rate_limit_end - rate_limit_start))
    
    # This test is more about ensuring the server doesn't crash
    if [ $rate_limit_duration -lt 30000 ]; then  # 30 seconds max
        echo -e "✅ ${GREEN}PASS${NC}: Rate limiting handling (${rate_limit_duration}ms)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Rate limiting response too slow (${rate_limit_duration}ms)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Generate performance report
generate_performance_report() {
    print_test_header "PERFORMANCE TEST RESULTS SUMMARY"
    
    local success_rate=0
    if [ $TOTAL_TESTS -gt 0 ]; then
        success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    fi
    
    echo -e "${BLUE}Performance Test Results:${NC}"
    echo -e "Total Tests: $TOTAL_TESTS"
    echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
    echo -e "Success Rate: ${YELLOW}$success_rate%${NC}"
    
    echo -e "\n${BLUE}Performance Thresholds:${NC}"
    echo -e "Single Request: ${SINGLE_REQUEST_THRESHOLD}ms"
    echo -e "Concurrent Requests: ${CONCURRENT_REQUEST_THRESHOLD}ms"
    echo -e "Load Test: ${LOAD_TEST_THRESHOLD}ms"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "\n🎉 ${GREEN}All performance tests passed!${NC}"
        log "All performance tests passed successfully"
    else
        echo -e "\n⚠️  ${YELLOW}Some performance tests failed. Check log for details: $LOG_FILE${NC}"
        log "Performance tests completed with $FAILED_TESTS failures"
    fi
    
    # Save detailed results
    echo "PERFORMANCE TEST RESULTS" > "performance-test-results.txt"
    echo "========================" >> "performance-test-results.txt"
    echo "Date: $(date)" >> "performance-test-results.txt"
    echo "Total Tests: $TOTAL_TESTS" >> "performance-test-results.txt"
    echo "Passed: $PASSED_TESTS" >> "performance-test-results.txt"
    echo "Failed: $FAILED_TESTS" >> "performance-test-results.txt"
    echo "Success Rate: $success_rate%" >> "performance-test-results.txt"
    echo "" >> "performance-test-results.txt"
    echo "Performance Thresholds:" >> "performance-test-results.txt"
    echo "- Single Request: ${SINGLE_REQUEST_THRESHOLD}ms" >> "performance-test-results.txt"
    echo "- Concurrent Requests: ${CONCURRENT_REQUEST_THRESHOLD}ms" >> "performance-test-results.txt"
    echo "- Load Test: ${LOAD_TEST_THRESHOLD}ms" >> "performance-test-results.txt"
    echo "" >> "performance-test-results.txt"
    echo "Log file: $LOG_FILE" >> "performance-test-results.txt"
}

# Main execution
main() {
    log "Starting performance tests"
    
    setup_test_environment
    test_single_request_performance
    test_concurrent_requests
    test_large_dataset_performance
    test_complex_query_performance
    test_memory_resource_usage
    test_response_time_consistency
    test_error_handling_under_load
    generate_performance_report
    
    # Exit with error if tests failed
    if [ $FAILED_TESTS -gt 0 ]; then
        exit 1
    fi
}

# Run the main function
main