#!/bin/bash

# Comprehensive Appointment API Test Suite
# Tests all appointment endpoints including CRUD, scheduling, availability, and status management

BASE_URL="http://localhost:3000/api/v1"
CONTENT_TYPE="Content-Type: application/json"
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!"
AUTH_TOKEN=""
COMPANY_ID=""
BRANCH_ID=""
CLIENT_ID=""
STAFF_ID=""
SERVICE_ID=""
APPOINTMENT_ID=""

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

# Logging
LOG_FILE="appointment-test-$(date +%Y%m%d-%H%M%S).log"

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
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if echo "$response" | grep -q "\"success\": *true" && echo "$response" | grep -qE "HTTP/[0-9.]+ $expected_status"; then
        echo -e "✅ ${GREEN}PASS${NC}: $test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        log "PASS: $test_name"
    else
        echo -e "❌ ${RED}FAIL${NC}: $test_name"
        echo -e "   Expected: HTTP $expected_status with success: true"
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
            "email": "'$TEST_EMAIL'",
            "password": "'$TEST_PASSWORD'",
            "firstName": "Test",
            "lastName": "User",
            "companyName": "Test Company for Appointments"
        }')
    
    # Extract auth token
    AUTH_TOKEN=$(echo "$register_response" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
    COMPANY_ID=$(echo "$register_response" | grep -o '"companyId":"[^"]*' | cut -d'"' -f4)
    
    if [ -z "$AUTH_TOKEN" ]; then
        echo -e "❌ ${RED}Failed to setup test environment - no auth token${NC}"
        exit 1
    fi
    
    echo -e "✅ ${GREEN}Test environment setup complete${NC}"
    echo "Auth Token: $AUTH_TOKEN"
    echo "Company ID: $COMPANY_ID"
    
    # Create a branch
    local branch_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/companies/$COMPANY_ID/branches" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "name": "Main Branch",
            "type": "MAIN",
            "address": {
                "street": "123 Test St",
                "city": "Test City",
                "country": "Test Country"
            }
        }')
    
    BRANCH_ID=$(echo "$branch_response" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    echo "Branch ID: $BRANCH_ID"
    
    # Create a client
    local client_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/clients" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "firstName": "Test",
            "lastName": "Client",
            "email": "testclient@example.com",
            "phone": "+1234567890"
        }')
    
    CLIENT_ID=$(echo "$client_response" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    echo "Client ID: $CLIENT_ID"
    
    # Create a service
    local service_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/services" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "name": "Test Service",
            "startingPrice": 50.00,
            "duration": {
                "hours": 1,
                "minutes": 0
            },
            "onlineBooking": {
                "enabled": true
            }
        }')
    
    SERVICE_ID=$(echo "$service_response" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    echo "Service ID: $SERVICE_ID"
    
    # Create a staff member
    local staff_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/staff" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "firstName": "Test",
            "lastName": "Staff",
            "email": "teststaff@example.com",
            "phone": "+1234567891",
            "role": "STAFF",
            "services": ["'$SERVICE_ID'"],
            "branches": ["'$BRANCH_ID'"]
        }')
    
    STAFF_ID=$(echo "$staff_response" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    echo "Staff ID: $STAFF_ID"
}

# Test 1: Availability Checks
test_availability_endpoints() {
    print_test_header "TESTING AVAILABILITY ENDPOINTS"
    
    # Test get available slots
    local response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/appointments/availability?staffId=$STAFF_ID&serviceId=$SERVICE_ID&date=$(date +%Y-%m-%d)" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    run_test "Get available slots" "200" "$response"
    
    # Test check slot availability
    local check_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/appointments/availability/check" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "staffId": "'$STAFF_ID'",
            "serviceId": "'$SERVICE_ID'",
            "date": "'$(date -d '+1 day' +%Y-%m-%d)'",
            "time": "10:00"
        }')
    run_test "Check slot availability" "200" "$check_response"
    
    # Test bulk availability check
    local bulk_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/appointments/availability/bulk" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "requests": [
                {
                    "staffId": "'$STAFF_ID'",
                    "serviceId": "'$SERVICE_ID'",
                    "date": "'$(date -d '+1 day' +%Y-%m-%d)'",
                    "time": "10:00"
                },
                {
                    "staffId": "'$STAFF_ID'",
                    "serviceId": "'$SERVICE_ID'",
                    "date": "'$(date -d '+1 day' +%Y-%m-%d)'",
                    "time": "11:00"
                }
            ]
        }')
    run_test "Bulk availability check" "200" "$bulk_response"
}

# Test 2: Appointment CRUD Operations
test_appointment_crud() {
    print_test_header "TESTING APPOINTMENT CRUD OPERATIONS"
    
    # Create appointment
    local create_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/appointments" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "clientId": "'$CLIENT_ID'",
            "serviceId": "'$SERVICE_ID'",
            "staffId": "'$STAFF_ID'",
            "branchId": "'$BRANCH_ID'",
            "date": "'$(date -d '+2 days' +%Y-%m-%d)'",
            "time": "14:00",
            "notes": "Test appointment creation"
        }')
    
    APPOINTMENT_ID=$(echo "$create_response" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    run_test "Create appointment" "201" "$create_response"
    
    # Get all appointments
    local list_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/appointments" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    run_test "Get all appointments" "200" "$list_response"
    
    # Get specific appointment
    local get_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/appointments/$APPOINTMENT_ID" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    run_test "Get appointment by ID" "200" "$get_response"
    
    # Update appointment
    local update_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X PUT "$BASE_URL/appointments/$APPOINTMENT_ID" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "time": "15:00",
            "notes": "Updated appointment notes"
        }')
    run_test "Update appointment" "200" "$update_response"
    
    # Update appointment notes
    local notes_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X PUT "$BASE_URL/appointments/$APPOINTMENT_ID/notes" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "notes": "Detailed appointment notes update"
        }')
    run_test "Update appointment notes" "200" "$notes_response"
}

# Test 3: Appointment Status Management
test_appointment_status_management() {
    print_test_header "TESTING APPOINTMENT STATUS MANAGEMENT"
    
    # Confirm appointment
    local confirm_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/appointments/$APPOINTMENT_ID/confirm" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{}')
    run_test "Confirm appointment" "200" "$confirm_response"
    
    # Check-in appointment
    local checkin_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/appointments/$APPOINTMENT_ID/check-in" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{}')
    run_test "Check-in appointment" "200" "$checkin_response"
    
    # Start appointment
    local start_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/appointments/$APPOINTMENT_ID/start" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{}')
    run_test "Start appointment" "200" "$start_response"
    
    # Complete appointment
    local complete_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/appointments/$APPOINTMENT_ID/complete" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "completionNotes": "Appointment completed successfully"
        }')
    run_test "Complete appointment" "200" "$complete_response"
}

# Test 4: Appointment Rescheduling
test_appointment_rescheduling() {
    print_test_header "TESTING APPOINTMENT RESCHEDULING"
    
    # Create another appointment for rescheduling tests
    local create_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/appointments" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "clientId": "'$CLIENT_ID'",
            "serviceId": "'$SERVICE_ID'",
            "staffId": "'$STAFF_ID'",
            "branchId": "'$BRANCH_ID'",
            "date": "'$(date -d '+3 days' +%Y-%m-%d)'",
            "time": "10:00",
            "notes": "Appointment for rescheduling"
        }')
    
    local RESCHEDULE_APPOINTMENT_ID=$(echo "$create_response" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    
    # Find optimal reschedule time
    local optimal_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/appointments/$RESCHEDULE_APPOINTMENT_ID/reschedule/suggestions" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "preferredDates": ["'$(date -d '+4 days' +%Y-%m-%d)'", "'$(date -d '+5 days' +%Y-%m-%d)'"],
            "timePreferences": ["morning", "afternoon"]
        }')
    run_test "Find optimal reschedule time" "200" "$optimal_response"
    
    # Reschedule appointment
    local reschedule_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/appointments/$RESCHEDULE_APPOINTMENT_ID/reschedule" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "date": "'$(date -d '+4 days' +%Y-%m-%d)'",
            "time": "11:00",
            "reason": "Client requested different time"
        }')
    run_test "Reschedule appointment" "200" "$reschedule_response"
}

# Test 5: Calendar and Schedule Views
test_calendar_views() {
    print_test_header "TESTING CALENDAR AND SCHEDULE VIEWS"
    
    # Get calendar view
    local calendar_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/appointments/calendar?month=$(date +%Y-%m)&branchId=$BRANCH_ID" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    run_test "Get calendar view" "200" "$calendar_response"
    
    # Get staff schedule
    local staff_schedule_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/appointments/staff/$STAFF_ID/schedule?date=$(date +%Y-%m-%d)" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    run_test "Get staff schedule" "200" "$staff_schedule_response"
    
    # Get client appointment history
    local client_history_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/appointments/clients/$CLIENT_ID/history" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    run_test "Get client appointment history" "200" "$client_history_response"
}

# Test 6: Bulk Operations
test_bulk_operations() {
    print_test_header "TESTING BULK OPERATIONS"
    
    # Create multiple appointments for bulk testing
    local bulk_create_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/appointments/bulk" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "operation": "create",
            "appointments": [
                {
                    "clientId": "'$CLIENT_ID'",
                    "serviceId": "'$SERVICE_ID'",
                    "staffId": "'$STAFF_ID'",
                    "branchId": "'$BRANCH_ID'",
                    "date": "'$(date -d '+5 days' +%Y-%m-%d)'",
                    "time": "09:00"
                },
                {
                    "clientId": "'$CLIENT_ID'",
                    "serviceId": "'$SERVICE_ID'",
                    "staffId": "'$STAFF_ID'",
                    "branchId": "'$BRANCH_ID'",
                    "date": "'$(date -d '+5 days' +%Y-%m-%d)'",
                    "time": "10:00"
                }
            ]
        }')
    run_test "Bulk create appointments" "201" "$bulk_create_response"
    
    # Get appointment conflicts
    local conflicts_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/appointments/conflicts?staffId=$STAFF_ID&startDate=$(date +%Y-%m-%d)&endDate=$(date -d '+7 days' +%Y-%m-%d)" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    run_test "Get appointment conflicts" "200" "$conflicts_response"
}

# Test 7: Analytics and Reporting
test_analytics_reporting() {
    print_test_header "TESTING ANALYTICS AND REPORTING"
    
    # Get appointment analytics
    local analytics_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/appointments/analytics?period=month&branchId=$BRANCH_ID" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    run_test "Get appointment analytics" "200" "$analytics_response"
    
    # Get no-show statistics
    local noshow_stats_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/appointments/statistics/no-shows?period=month" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    run_test "Get no-show statistics" "200" "$noshow_stats_response"
}

# Test 8: Error Handling and Edge Cases
test_error_handling() {
    print_test_header "TESTING ERROR HANDLING AND EDGE CASES"
    
    # Test invalid appointment creation (missing required fields)
    local invalid_create_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/appointments" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "clientId": "'$CLIENT_ID'"
        }')
    
    if echo "$invalid_create_response" | grep -qE "HTTP/[0-9.]+ 400"; then
        echo -e "✅ ${GREEN}PASS${NC}: Invalid appointment creation returns 400"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Invalid appointment creation should return 400"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Test appointment not found
    local not_found_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/appointments/nonexistent-id" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    
    if echo "$not_found_response" | grep -qE "HTTP/[0-9.]+ 404"; then
        echo -e "✅ ${GREEN}PASS${NC}: Nonexistent appointment returns 404"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Nonexistent appointment should return 404"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Test unauthorized access
    local unauthorized_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/appointments")
    
    if echo "$unauthorized_response" | grep -qE "HTTP/[0-9.]+ 401"; then
        echo -e "✅ ${GREEN}PASS${NC}: Unauthorized access returns 401"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Unauthorized access should return 401"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Test 9: Performance Edge Cases
test_performance_edge_cases() {
    print_test_header "TESTING PERFORMANCE EDGE CASES"
    
    # Test large date range query
    local start_time=$(date +%s%3N)
    local large_range_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/appointments?startDate=$(date +%Y-%m-%d)&endDate=$(date -d '+365 days' +%Y-%m-%d)" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    local end_time=$(date +%s%3N)
    local duration=$((end_time - start_time))
    
    if [ $duration -lt 5000 ]; then  # Less than 5 seconds
        echo -e "✅ ${GREEN}PASS${NC}: Large date range query completed in ${duration}ms"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Large date range query took ${duration}ms (should be < 5000ms)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Cleanup test data
cleanup_test_data() {
    print_test_header "CLEANING UP TEST DATA"
    
    # Cancel/delete test appointments (soft delete)
    if [ ! -z "$APPOINTMENT_ID" ]; then
        curl -s -X DELETE "$BASE_URL/appointments/$APPOINTMENT_ID" \
            -H "Authorization: Bearer $AUTH_TOKEN" > /dev/null
    fi
    
    echo -e "✅ ${GREEN}Test cleanup completed${NC}"
}

# Generate test report
generate_report() {
    print_test_header "TEST RESULTS SUMMARY"
    
    local success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    
    echo -e "${BLUE}Appointment API Test Results:${NC}"
    echo -e "Total Tests: $TOTAL_TESTS"
    echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
    echo -e "Success Rate: ${YELLOW}$success_rate%${NC}"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "\n🎉 ${GREEN}All appointment tests passed!${NC}"
        log "All appointment tests passed successfully"
    else
        echo -e "\n⚠️  ${YELLOW}Some tests failed. Check log for details: $LOG_FILE${NC}"
        log "Test completed with $FAILED_TESTS failures"
    fi
    
    # Save detailed results
    echo "APPOINTMENT API TEST RESULTS" > "appointment-test-results.txt"
    echo "==============================" >> "appointment-test-results.txt"
    echo "Date: $(date)" >> "appointment-test-results.txt"
    echo "Total Tests: $TOTAL_TESTS" >> "appointment-test-results.txt"
    echo "Passed: $PASSED_TESTS" >> "appointment-test-results.txt"
    echo "Failed: $FAILED_TESTS" >> "appointment-test-results.txt"
    echo "Success Rate: $success_rate%" >> "appointment-test-results.txt"
    echo "" >> "appointment-test-results.txt"
    echo "Log file: $LOG_FILE" >> "appointment-test-results.txt"
}

# Main execution
main() {
    log "Starting comprehensive appointment API tests"
    
    setup_test_environment
    test_availability_endpoints
    test_appointment_crud
    test_appointment_status_management
    test_appointment_rescheduling
    test_calendar_views
    test_bulk_operations
    test_analytics_reporting
    test_error_handling
    test_performance_edge_cases
    cleanup_test_data
    generate_report
    
    # Exit with error if tests failed
    if [ $FAILED_TESTS -gt 0 ]; then
        exit 1
    fi
}

# Run the main function
main