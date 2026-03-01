#!/bin/bash

# Comprehensive Client Management API Test Suite
# Tests all client endpoints including CRUD operations, search, filtering, bulk operations, and client history

BASE_URL="http://localhost:3000/api/v1"
CONTENT_TYPE="Content-Type: application/json"
TEST_EMAIL_PREFIX="test-client-$(date +%s)"
TEST_PASSWORD="TestPassword123!"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test data
AUTH_TOKEN=""
COMPANY_ID=""
BRANCH_ID=""
CLIENT_IDS=()
BULK_CLIENT_IDS=()

# Logging
LOG_FILE="client-test-$(date +%Y%m%d-%H%M%S).log"

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

run_test() {
    local test_name="$1"
    local expected_status="$2"
    local response="$3"
    local expected_pattern="${4:-\"success\": *true}"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if echo "$response" | grep -q "$expected_pattern" && echo "$response" | grep -qE "HTTP/[0-9.]+ $expected_status"; then
        echo -e "✅ ${GREEN}PASS${NC}: $test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        log "PASS: $test_name"
    else
        echo -e "❌ ${RED}FAIL${NC}: $test_name"
        echo -e "   Expected: HTTP $expected_status with pattern: $expected_pattern"
        echo -e "   Response: $response"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        log "FAIL: $test_name - Response: $response"
    fi
}

# Setup test environment
setup_test_environment() {
    print_test_header "SETTING UP TEST ENVIRONMENT"
    
    # Register user with company
    local register_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/auth/register-with-company" \
        -H "$CONTENT_TYPE" \
        -d '{
            "email": "'${TEST_EMAIL_PREFIX}@example.com'",
            "password": "'$TEST_PASSWORD'",
            "firstName": "Test",
            "lastName": "Admin",
            "companyName": "Test Company for Clients"
        }')
    
    AUTH_TOKEN=$(echo "$register_response" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
    COMPANY_ID=$(echo "$register_response" | grep -o '"companyId":"[^"]*' | cut -d'"' -f4)
    
    if [ -z "$AUTH_TOKEN" ] || [ -z "$COMPANY_ID" ]; then
        echo -e "❌ ${RED}Failed to setup test environment${NC}"
        exit 1
    fi
    
    # Create a branch for client associations
    local branch_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/companies/$COMPANY_ID/branches" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "name": "Main Branch",
            "type": "MAIN",
            "address": {
                "street": "123 Main St",
                "city": "Test City",
                "country": "Test Country"
            }
        }')
    
    BRANCH_ID=$(echo "$branch_response" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    
    echo -e "✅ ${GREEN}Test environment setup complete${NC}"
    echo "Auth Token: $AUTH_TOKEN"
    echo "Company ID: $COMPANY_ID"
    echo "Branch ID: $BRANCH_ID"
}

# Test 1: Client CRUD Operations
test_client_crud_operations() {
    print_test_header "TESTING CLIENT CRUD OPERATIONS"
    
    # Create client with minimal data
    local create_minimal_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/clients" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "firstName": "John"
        }')
    
    local MINIMAL_CLIENT_ID=$(echo "$create_minimal_response" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    CLIENT_IDS+=($MINIMAL_CLIENT_ID)
    run_test "Create client with minimal data" "201" "$create_minimal_response"
    
    # Create client with complete data
    local create_complete_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/clients" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "firstName": "Jane",
            "lastName": "Doe",
            "email": "'${TEST_EMAIL_PREFIX}-jane@example.com'",
            "phone": "+1234567890",
            "dateOfBirth": "1990-05-15",
            "gender": "FEMALE",
            "status": "ACTIVE",
            "phones": [
                {
                    "number": "+1234567890",
                    "type": "mobile",
                    "isPrimary": true,
                    "canReceiveSMS": true
                },
                {
                    "number": "+1234567891",
                    "type": "work",
                    "isPrimary": false,
                    "canReceiveSMS": false
                }
            ],
            "emails": [
                {
                    "address": "'${TEST_EMAIL_PREFIX}-jane@example.com'",
                    "type": "personal",
                    "isPrimary": true,
                    "canReceiveEmails": true
                }
            ],
            "address": {
                "street": "123 Main Street",
                "city": "Anytown",
                "state": "CA",
                "zipCode": "12345",
                "country": "USA"
            },
            "notes": "Test client with complete profile",
            "tags": ["VIP", "Regular"],
            "checkDuplicates": true
        }')
    
    local COMPLETE_CLIENT_ID=$(echo "$create_complete_response" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    CLIENT_IDS+=($COMPLETE_CLIENT_ID)
    run_test "Create client with complete data" "201" "$create_complete_response"
    
    # Get all clients
    local get_all_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/clients" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    run_test "Get all clients" "200" "$get_all_response"
    
    # Get all clients for dropdown
    local get_all_dropdown_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/clients/all" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    run_test "Get all clients for dropdown" "200" "$get_all_dropdown_response"
    
    # Get specific client
    local get_client_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/clients/$COMPLETE_CLIENT_ID" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    run_test "Get specific client" "200" "$get_client_response"
    
    # Update client
    local update_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X PUT "$BASE_URL/clients/$COMPLETE_CLIENT_ID" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "firstName": "Jane Updated",
            "lastName": "Doe Updated",
            "email": "'${TEST_EMAIL_PREFIX}-jane-updated@example.com'",
            "phone": "+1234567899",
            "notes": "Updated client information",
            "tags": ["VIP", "Regular", "Updated"]
        }')
    run_test "Update client" "200" "$update_response"
    
    # Update client statistics
    local update_stats_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/clients/$COMPLETE_CLIENT_ID/update-stats" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{}')
    run_test "Update client statistics" "200" "$update_stats_response"
    
    # Get client visits
    local visits_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/clients/$COMPLETE_CLIENT_ID/visits" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    run_test "Get client visits" "200" "$visits_response"
    
    # Get client balance
    local balance_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/clients/$COMPLETE_CLIENT_ID/balance" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    run_test "Get client balance" "200" "$balance_response"
    
    # Get client activities
    local activities_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/clients/$COMPLETE_CLIENT_ID/activities" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    run_test "Get client activities" "200" "$activities_response"
    
    # Get client transactions
    local transactions_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/clients/$COMPLETE_CLIENT_ID/transactions" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    run_test "Get client transactions" "200" "$transactions_response"
}

# Test 2: Client Search and Filtering
test_client_search_filtering() {
    print_test_header "TESTING CLIENT SEARCH AND FILTERING"
    
    # Basic search
    local search_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/clients/search?q=Jane" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    run_test "Basic client search" "200" "$search_response"
    
    # Search with filters
    local filtered_search_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/clients/search?q=Updated&status=ACTIVE&page=1&limit=10" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    run_test "Filtered client search" "200" "$filtered_search_response"
    
    # Client suggestions for autocomplete
    local suggestions_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/clients/suggestions?q=Jane" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    run_test "Client suggestions" "200" "$suggestions_response"
    
    # Get clients with pagination
    local paginated_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/clients?page=1&limit=5" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    run_test "Get clients with pagination" "200" "$paginated_response"
    
    # Filter by status
    local status_filter_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/clients?status=ACTIVE" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    run_test "Filter clients by status" "200" "$status_filter_response"
    
    # Filter by gender
    local gender_filter_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/clients?gender=FEMALE" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    run_test "Filter clients by gender" "200" "$gender_filter_response"
    
    # Filter by tags
    local tags_filter_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/clients?tags=VIP" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    run_test "Filter clients by tags" "200" "$tags_filter_response"
    
    # Quick filter - new this month
    local quick_filter_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/clients?quickFilter=new_this_month" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    run_test "Quick filter - new this month" "200" "$quick_filter_response"
    
    # Filter by age range
    local age_filter_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/clients?minAge=25&maxAge=45" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    run_test "Filter clients by age range" "200" "$age_filter_response"
    
    # Filter by communication preferences
    local comm_filter_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/clients?acceptsSMS=true&acceptsEmail=true" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    run_test "Filter by communication preferences" "200" "$comm_filter_response"
    
    # Sort clients
    local sort_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/clients?sortBy=name&sortDirection=asc" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    run_test "Sort clients by name" "200" "$sort_response"
    
    # Complex filter combination
    local complex_filter_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/clients?status=ACTIVE&gender=FEMALE&hasValidEmail=true&sortBy=createdAt&sortDirection=desc&page=1&limit=10" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    run_test "Complex filter combination" "200" "$complex_filter_response"
}

# Test 3: Client Statistics and Analytics
test_client_statistics() {
    print_test_header "TESTING CLIENT STATISTICS AND ANALYTICS"
    
    # Get client statistics
    local stats_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/clients/stats" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    run_test "Get client statistics" "200" "$stats_response"
    
    # Get client statistics with branch filter
    local branch_stats_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/clients/stats?branchId=$BRANCH_ID" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    run_test "Get client statistics by branch" "200" "$branch_stats_response"
}

# Test 4: Duplicate Detection and Management
test_duplicate_detection() {
    print_test_header "TESTING DUPLICATE DETECTION"
    
    # Check for duplicates before creation
    local duplicate_check_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/clients/check-duplicates" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "firstName": "Jane",
            "lastName": "Doe",
            "email": "'${TEST_EMAIL_PREFIX}-jane-updated@example.com'",
            "phone": "+1234567899"
        }')
    run_test "Check for duplicate clients" "200" "$duplicate_check_response"
    
    # Try to create duplicate client
    local create_duplicate_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/clients" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "firstName": "Jane",
            "lastName": "Doe",
            "email": "'${TEST_EMAIL_PREFIX}-jane-updated@example.com'",
            "phone": "+1234567899",
            "checkDuplicates": true
        }')
    
    # Should return 409 for duplicate or 201 with warning
    if echo "$create_duplicate_response" | grep -qE "HTTP/[0-9.]+ (201|409)"; then
        echo -e "✅ ${GREEN}PASS${NC}: Duplicate client handling works correctly"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Duplicate client handling failed"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Try to create client without duplicate check
    local create_no_check_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/clients" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "firstName": "Jane",
            "lastName": "Smith",
            "email": "'${TEST_EMAIL_PREFIX}-jane-smith@example.com'",
            "checkDuplicates": false
        }')
    run_test "Create client without duplicate check" "201" "$create_no_check_response"
}

# Test 5: Bulk Operations
test_bulk_operations() {
    print_test_header "TESTING BULK OPERATIONS"
    
    # Create multiple clients for bulk testing
    local bulk_clients=()
    for i in {1..5}; do
        local bulk_create_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/clients" \
            -H "$CONTENT_TYPE" \
            -H "Authorization: Bearer $AUTH_TOKEN" \
            -d '{
                "firstName": "BulkClient'$i'",
                "lastName": "Test",
                "email": "'${TEST_EMAIL_PREFIX}-bulk'$i'@example.com'",
                "status": "ACTIVE"
            }')
        
        local bulk_id=$(echo "$bulk_create_response" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
        if [ ! -z "$bulk_id" ]; then
            BULK_CLIENT_IDS+=($bulk_id)
        fi
    done
    
    echo "Created ${#BULK_CLIENT_IDS[@]} clients for bulk operations"
    
    # Bulk update clients
    if [ ${#BULK_CLIENT_IDS[@]} -gt 0 ]; then
        local bulk_update_data='{"clientIds":['
        for i in "${!BULK_CLIENT_IDS[@]}"; do
            if [ $i -gt 0 ]; then
                bulk_update_data+=','
            fi
            bulk_update_data+='"'${BULK_CLIENT_IDS[$i]}'"'
        done
        bulk_update_data+='],"updates":{"status":"INACTIVE","tags":["BulkUpdated"]}}'
        
        local bulk_update_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/clients/bulk-update" \
            -H "$CONTENT_TYPE" \
            -H "Authorization: Bearer $AUTH_TOKEN" \
            -d "$bulk_update_data")
        run_test "Bulk update clients" "200" "$bulk_update_response"
    fi
    
    # Bulk import clients
    local import_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/clients/import" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "clients": [
                {
                    "firstName": "Import1",
                    "lastName": "Client",
                    "email": "'${TEST_EMAIL_PREFIX}-import1@example.com'",
                    "phone": "+1234567801"
                },
                {
                    "firstName": "Import2",
                    "lastName": "Client",
                    "email": "'${TEST_EMAIL_PREFIX}-import2@example.com'",
                    "phone": "+1234567802"
                },
                {
                    "firstName": "Import3",
                    "lastName": "Client",
                    "email": "'${TEST_EMAIL_PREFIX}-import3@example.com'",
                    "phone": "+1234567803"
                }
            ],
            "options": {
                "skipDuplicates": true,
                "updateExisting": false,
                "validateData": true
            }
        }')
    run_test "Bulk import clients" "200" "$import_response"
}

# Test 6: Error Handling and Validation
test_error_handling() {
    print_test_header "TESTING ERROR HANDLING AND VALIDATION"
    
    # Test creating client without required fields
    local invalid_create_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/clients" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{}')
    
    if echo "$invalid_create_response" | grep -qE "HTTP/[0-9.]+ 400"; then
        echo -e "✅ ${GREEN}PASS${NC}: Invalid client creation returns 400"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Invalid client creation should return 400"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Test accessing non-existent client
    local not_found_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/clients/nonexistent-client-id" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    
    if echo "$not_found_response" | grep -qE "HTTP/[0-9.]+ 404"; then
        echo -e "✅ ${GREEN}PASS${NC}: Non-existent client returns 404"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Non-existent client should return 404"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Test unauthorized access
    local unauthorized_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/clients")
    
    if echo "$unauthorized_response" | grep -qE "HTTP/[0-9.]+ 401"; then
        echo -e "✅ ${GREEN}PASS${NC}: Unauthorized access returns 401"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Unauthorized access should return 401"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Test invalid email format
    local invalid_email_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/clients" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "firstName": "Invalid",
            "lastName": "Email",
            "email": "invalid-email-format"
        }')
    
    if echo "$invalid_email_response" | grep -qE "HTTP/[0-9.]+ 400"; then
        echo -e "✅ ${GREEN}PASS${NC}: Invalid email format returns 400"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Invalid email format should return 400"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Test invalid date format
    local invalid_date_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/clients" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "firstName": "Invalid",
            "lastName": "Date",
            "dateOfBirth": "invalid-date"
        }')
    
    if echo "$invalid_date_response" | grep -qE "HTTP/[0-9.]+ 400"; then
        echo -e "✅ ${GREEN}PASS${NC}: Invalid date format returns 400"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Invalid date format should return 400"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Test search without query parameter
    local empty_search_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/clients/search" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    
    if echo "$empty_search_response" | grep -qE "HTTP/[0-9.]+ 400"; then
        echo -e "✅ ${GREEN}PASS${NC}: Search without query returns 400"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Search without query should return 400"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Test 7: Performance Tests
test_performance() {
    print_test_header "TESTING PERFORMANCE"
    
    # Test client list load time
    local start_time=$(date +%s%3N)
    local perf_list_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/clients?limit=100" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    local end_time=$(date +%s%3N)
    local duration=$((end_time - start_time))
    
    if [ $duration -lt 3000 ]; then  # Less than 3 seconds
        echo -e "✅ ${GREEN}PASS${NC}: Client list load completed in ${duration}ms (< 3000ms)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Client list load took ${duration}ms (should be < 3000ms)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Test search performance
    local search_start_time=$(date +%s%3N)
    local perf_search_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/clients/search?q=test" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    local search_end_time=$(date +%s%3N)
    local search_duration=$((search_end_time - search_start_time))
    
    if [ $search_duration -lt 2000 ]; then  # Less than 2 seconds
        echo -e "✅ ${GREEN}PASS${NC}: Client search completed in ${search_duration}ms (< 2000ms)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Client search took ${search_duration}ms (should be < 2000ms)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Test 8: Health Check
test_health_check() {
    print_test_header "TESTING HEALTH CHECK"
    
    # Test client service health check
    local health_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/clients/health")
    run_test "Client service health check" "200" "$health_response"
}

# Test 9: Data Consistency
test_data_consistency() {
    print_test_header "TESTING DATA CONSISTENCY"
    
    # Verify client update persistence
    if [ ${#CLIENT_IDS[@]} -gt 0 ]; then
        local client_id=${CLIENT_IDS[0]}
        
        # Update client
        local update_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X PUT "$BASE_URL/clients/$client_id" \
            -H "$CONTENT_TYPE" \
            -H "Authorization: Bearer $AUTH_TOKEN" \
            -d '{
                "firstName": "ConsistencyTest",
                "notes": "Data consistency test"
            }')
        
        # Verify update was persisted
        local verify_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/clients/$client_id" \
            -H "Authorization: Bearer $AUTH_TOKEN")
        
        if echo "$verify_response" | grep -q '"firstName": *"ConsistencyTest"' && \
           echo "$verify_response" | grep -q '"notes": *"Data consistency test"'; then
            echo -e "✅ ${GREEN}PASS${NC}: Client update persistence verified"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            echo -e "❌ ${RED}FAIL${NC}: Client update was not properly persisted"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
    fi
}

# Cleanup test data
cleanup_test_data() {
    print_test_header "CLEANING UP TEST DATA"
    
    # Delete test clients (soft delete)
    for client_id in "${CLIENT_IDS[@]}" "${BULK_CLIENT_IDS[@]}"; do
        if [ ! -z "$client_id" ]; then
            curl -s -X DELETE "$BASE_URL/clients/$client_id" \
                -H "Authorization: Bearer $AUTH_TOKEN" > /dev/null
        fi
    done
    
    echo -e "✅ ${GREEN}Test cleanup completed${NC}"
}

# Generate test report
generate_report() {
    print_test_header "CLIENT MANAGEMENT TEST RESULTS SUMMARY"
    
    local success_rate=0
    if [ $TOTAL_TESTS -gt 0 ]; then
        success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    fi
    
    echo -e "${BLUE}Client Management API Test Results:${NC}"
    echo -e "Total Tests: $TOTAL_TESTS"
    echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
    echo -e "Success Rate: ${YELLOW}$success_rate%${NC}"
    echo -e "Clients Created: ${#CLIENT_IDS[@]} + ${#BULK_CLIENT_IDS[@]} (bulk)"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "\n🎉 ${GREEN}All client management tests passed!${NC}"
        log "All client management tests passed successfully"
    else
        echo -e "\n⚠️  ${YELLOW}Some tests failed. Check log for details: $LOG_FILE${NC}"
        log "Test completed with $FAILED_TESTS failures"
    fi
    
    # Save detailed results
    echo "CLIENT MANAGEMENT API TEST RESULTS" > "client-test-results.txt"
    echo "===================================" >> "client-test-results.txt"
    echo "Date: $(date)" >> "client-test-results.txt"
    echo "Total Tests: $TOTAL_TESTS" >> "client-test-results.txt"
    echo "Passed: $PASSED_TESTS" >> "client-test-results.txt"
    echo "Failed: $FAILED_TESTS" >> "client-test-results.txt"
    echo "Success Rate: $success_rate%" >> "client-test-results.txt"
    echo "Clients Created: ${#CLIENT_IDS[@]} + ${#BULK_CLIENT_IDS[@]} (bulk)" >> "client-test-results.txt"
    echo "" >> "client-test-results.txt"
    echo "Log file: $LOG_FILE" >> "client-test-results.txt"
}

# Main execution
main() {
    log "Starting comprehensive client management API tests"
    
    setup_test_environment
    test_client_crud_operations
    test_client_search_filtering
    test_client_statistics
    test_duplicate_detection
    test_bulk_operations
    test_error_handling
    test_performance
    test_health_check
    test_data_consistency
    cleanup_test_data
    generate_report
    
    # Exit with error if tests failed
    if [ $FAILED_TESTS -gt 0 ]; then
        exit 1
    fi
}

# Run the main function
main