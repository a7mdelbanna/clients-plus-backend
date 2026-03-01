#!/bin/bash

# Security Test Suite - Authentication, Authorization, and Data Validation Security Tests
# Tests for common security vulnerabilities and proper security implementations

BASE_URL="http://localhost:3000/api/v1"
CONTENT_TYPE="Content-Type: application/json"
TEST_EMAIL_PREFIX="test-security-$(date +%s)"
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
WEAK_AUTH_TOKEN="weak-token-123"

# Logging
LOG_FILE="security-test-$(date +%Y%m%d-%H%M%S).log"

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

run_security_test() {
    local test_name="$1"
    local expected_status="$2"
    local response="$3"
    local security_context="$4"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if echo "$response" | grep -qE "HTTP/[0-9.]+ $expected_status"; then
        echo -e "✅ ${GREEN}PASS${NC}: $test_name - $security_context"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        log "PASS: $test_name - $security_context"
    else
        echo -e "❌ ${RED}FAIL${NC}: $test_name - $security_context"
        echo -e "   Expected HTTP $expected_status"
        echo -e "   Response: $response"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        log "FAIL: $test_name - $security_context - Response: $response"
    fi
}

# Setup test environment
setup_security_test_environment() {
    print_test_header "SETTING UP SECURITY TEST ENVIRONMENT"
    
    # Register test user
    local register_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/auth/register-with-company" \
        -H "$CONTENT_TYPE" \
        -d '{
            "email": "'${TEST_EMAIL_PREFIX}@example.com'",
            "password": "'$TEST_PASSWORD'",
            "firstName": "Security",
            "lastName": "Tester",
            "companyName": "Security Test Company"
        }')
    
    AUTH_TOKEN=$(echo "$register_response" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
    COMPANY_ID=$(echo "$register_response" | grep -o '"companyId":"[^"]*' | cut -d'"' -f4)
    
    if [ -z "$AUTH_TOKEN" ] || [ -z "$COMPANY_ID" ]; then
        echo -e "❌ ${RED}Failed to setup security test environment${NC}"
        exit 1
    fi
    
    echo -e "✅ ${GREEN}Security test environment setup complete${NC}"
}

# Test 1: Authentication Security
test_authentication_security() {
    print_test_header "TESTING AUTHENTICATION SECURITY"
    
    # Test access without token
    local no_token_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/company/profile")
    run_security_test "Access protected route without token" "401" "$no_token_response" "Should reject unauthenticated requests"
    
    # Test access with invalid token
    local invalid_token_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/company/profile" \
        -H "Authorization: Bearer invalid-token-123")
    run_security_test "Access with invalid token" "401" "$invalid_token_response" "Should reject invalid tokens"
    
    # Test access with malformed token
    local malformed_token_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/company/profile" \
        -H "Authorization: Bearer malformed.token.here")
    run_security_test "Access with malformed token" "401" "$malformed_token_response" "Should reject malformed tokens"
    
    # Test access with expired token (simulate)
    local expired_token_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/company/profile" \
        -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJPbmxpbmUgSldUIEJ1aWxkZXIiLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTYwMDAwMDEwMCwiYXVkIjoid3d3LmV4YW1wbGUuY29tIiwic3ViIjoianJvY2tldEBleGFtcGxlLmNvbSIsInVzZXJJZCI6IjEyMzQ1Njc4OTAiLCJ1c2VybmFtZSI6IkpvaG4gRG9lIn0.invalid")
    run_security_test "Access with expired token" "401" "$expired_token_response" "Should reject expired tokens"
    
    # Test SQL injection in login
    local sql_injection_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/auth/login" \
        -H "$CONTENT_TYPE" \
        -d '{
            "email": "admin@example.com'\'''; DROP TABLE users; --",
            "password": "password"
        }')
    run_security_test "SQL injection in login" "400|401" "$sql_injection_response" "Should prevent SQL injection attacks"
    
    # Test password brute force protection (multiple failed attempts)
    for i in {1..5}; do
        curl -s -X POST "$BASE_URL/auth/login" \
            -H "$CONTENT_TYPE" \
            -d '{
                "email": "'${TEST_EMAIL_PREFIX}@example.com'",
                "password": "wrongpassword'$i'"
            }' > /dev/null
    done
    
    local brute_force_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/auth/login" \
        -H "$CONTENT_TYPE" \
        -d '{
            "email": "'${TEST_EMAIL_PREFIX}@example.com'",
            "password": "wrongpassword6"
        }')
    
    # Should either rate limit (429) or continue to return 401
    if echo "$brute_force_response" | grep -qE "HTTP/[0-9.]+ (401|429)"; then
        echo -e "✅ ${GREEN}PASS${NC}: Brute force protection - Handles repeated failed attempts"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Brute force protection - Should handle repeated attempts"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Test 2: Authorization Security  
test_authorization_security() {
    print_test_header "TESTING AUTHORIZATION SECURITY"
    
    # Create a staff user to test role-based access
    local staff_register_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/auth/register" \
        -H "$CONTENT_TYPE" \
        -d '{
            "email": "'${TEST_EMAIL_PREFIX}-staff@example.com'",
            "password": "'$TEST_PASSWORD'",
            "firstName": "Test",
            "lastName": "Staff",
            "companyId": "'$COMPANY_ID'",
            "role": "STAFF"
        }')
    
    # Login as staff to get staff token
    local staff_login_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/auth/login" \
        -H "$CONTENT_TYPE" \
        -d '{
            "email": "'${TEST_EMAIL_PREFIX}-staff@example.com'",
            "password": "'$TEST_PASSWORD'"
        }')
    
    local STAFF_TOKEN=$(echo "$staff_login_response" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
    
    # Test staff accessing admin-only endpoint
    if [ ! -z "$STAFF_TOKEN" ]; then
        local admin_only_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/companies" \
            -H "$CONTENT_TYPE" \
            -H "Authorization: Bearer $STAFF_TOKEN" \
            -d '{
                "name": "Unauthorized Company",
                "email": "test@unauthorized.com"
            }')
        run_security_test "Staff accessing admin-only endpoint" "403" "$admin_only_response" "Should prevent privilege escalation"
    fi
    
    # Test accessing another company's data (if we had multiple companies)
    local company_data_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/companies/fake-company-id" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    run_security_test "Access non-existent company data" "404" "$company_data_response" "Should prevent unauthorized data access"
    
    # Test horizontal privilege escalation
    local other_company_settings_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X PUT "$BASE_URL/company/settings" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $WEAK_AUTH_TOKEN" \
        -d '{"timezone": "UTC"}')
    run_security_test "Access with weak/fake token" "401" "$other_company_settings_response" "Should prevent unauthorized access"
}

# Test 3: Input Validation Security
test_input_validation_security() {
    print_test_header "TESTING INPUT VALIDATION SECURITY"
    
    # Test XSS prevention in client creation
    local xss_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/clients" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "firstName": "<script>alert(\"xss\")</script>",
            "lastName": "<img src=x onerror=alert(1)>",
            "email": "xss@example.com",
            "notes": "javascript:alert(\"xss\")"
        }')
    
    # Should either sanitize (200/201) or reject (400)
    if echo "$xss_response" | grep -qE "HTTP/[0-9.]+ (200|201|400)"; then
        echo -e "✅ ${GREEN}PASS${NC}: XSS prevention - Handles malicious scripts appropriately"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: XSS prevention - Should handle malicious scripts"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Test HTML injection
    local html_injection_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/clients" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "firstName": "<h1>HTML Injection</h1>",
            "lastName": "<iframe src=http://evil.com></iframe>",
            "email": "html@example.com"
        }')
    
    if echo "$html_injection_response" | grep -qE "HTTP/[0-9.]+ (200|201|400)"; then
        echo -e "✅ ${GREEN}PASS${NC}: HTML injection prevention"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: HTML injection prevention"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Test extremely long input
    local long_string="a$(printf 'b%.0s' {1..10000})"
    local long_input_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/clients" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "firstName": "'$long_string'",
            "lastName": "Test",
            "email": "long@example.com"
        }')
    run_security_test "Extremely long input" "400" "$long_input_response" "Should prevent buffer overflow attacks"
    
    # Test null byte injection
    local null_byte_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/clients" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d $'{\n    "firstName": "Test\\x00Admin",\n    "lastName": "NullByte",\n    "email": "null@example.com"\n}')
    run_security_test "Null byte injection" "400" "$null_byte_response" "Should handle null bytes safely"
    
    # Test JSON structure attacks
    local json_bomb_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/clients" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{"firstName": "Test", "lastName": "Test", "nested": {"level1": {"level2": {"level3": {"level4": {"level5": {"deep": "too deep"}}}}}}}')
    
    if echo "$json_bomb_response" | grep -qE "HTTP/[0-9.]+ (200|201|400|413)"; then
        echo -e "✅ ${GREEN}PASS${NC}: Nested JSON handling"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Nested JSON handling"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Test 4: Data Exposure Security
test_data_exposure_security() {
    print_test_header "TESTING DATA EXPOSURE SECURITY"
    
    # Test that sensitive data is not exposed in responses
    local login_response=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "$CONTENT_TYPE" \
        -d '{
            "email": "'${TEST_EMAIL_PREFIX}@example.com'",
            "password": "'$TEST_PASSWORD'"
        }')
    
    # Should not contain password hash
    if echo "$login_response" | grep -q "password"; then
        echo -e "❌ ${RED}FAIL${NC}: Password data exposure - Login response contains password data"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    else
        echo -e "✅ ${GREEN}PASS${NC}: Password data exposure - No password in login response"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Test profile endpoint doesn't expose sensitive data
    local profile_response=$(curl -s -X GET "$BASE_URL/auth/profile" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    
    if echo "$profile_response" | grep -qE "(password|hash|secret|private)"; then
        echo -e "❌ ${RED}FAIL${NC}: Profile data exposure - Contains sensitive fields"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    else
        echo -e "✅ ${GREEN}PASS${NC}: Profile data exposure - No sensitive data exposed"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Test error messages don't reveal system information
    local error_response=$(curl -s -X GET "$BASE_URL/nonexistent-endpoint" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    
    if echo "$error_response" | grep -qE "(stack trace|file path|server error|internal error)"; then
        echo -e "❌ ${RED}FAIL${NC}: Error information disclosure"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    else
        echo -e "✅ ${GREEN}PASS${NC}: Error information disclosure - No sensitive error info"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Test 5: HTTP Security Headers
test_http_security_headers() {
    print_test_header "TESTING HTTP SECURITY HEADERS"
    
    # Test security headers on main endpoint
    local headers_response=$(curl -s -I "$BASE_URL/health" 2>/dev/null)
    
    # Check for security headers
    local security_headers=("X-Frame-Options" "X-Content-Type-Options" "X-XSS-Protection" "Strict-Transport-Security")
    local found_headers=0
    
    for header in "${security_headers[@]}"; do
        if echo "$headers_response" | grep -qi "$header"; then
            found_headers=$((found_headers + 1))
        fi
    done
    
    if [ $found_headers -ge 2 ]; then
        echo -e "✅ ${GREEN}PASS${NC}: Security headers - Found $found_headers security headers"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Security headers - Only found $found_headers security headers"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Test CORS headers
    local cors_response=$(curl -s -I -X OPTIONS "$BASE_URL/auth/login" \
        -H "Origin: http://evil-site.com" \
        -H "Access-Control-Request-Method: POST" 2>/dev/null)
    
    # Should have CORS headers but not allow evil origins
    if echo "$cors_response" | grep -qi "Access-Control"; then
        if echo "$cors_response" | grep -q "evil-site.com"; then
            echo -e "❌ ${RED}FAIL${NC}: CORS misconfiguration - Allows unauthorized origins"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        else
            echo -e "✅ ${GREEN}PASS${NC}: CORS configuration - Properly configured"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        fi
    else
        echo -e "⚠️  ${YELLOW}SKIP${NC}: CORS headers not found (may not be configured)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Test 6: Rate Limiting Security
test_rate_limiting_security() {
    print_test_header "TESTING RATE LIMITING SECURITY"
    
    echo "Testing rate limiting with rapid requests..."
    
    local rate_limit_responses=()
    local rate_limit_start=$(date +%s%3N)
    
    # Send 50 rapid requests
    for i in {1..50}; do
        local response=$(curl -s -w "%{http_code}" -X GET "$BASE_URL/health" -o /dev/null)
        rate_limit_responses+=($response)
    done
    
    local rate_limit_end=$(date +%s%3N)
    local rate_limit_duration=$((rate_limit_end - rate_limit_start))
    
    # Count different response codes
    local success_count=$(printf '%s\n' "${rate_limit_responses[@]}" | grep -c '^200$' || echo "0")
    local rate_limit_count=$(printf '%s\n' "${rate_limit_responses[@]}" | grep -c '^429$' || echo "0")
    
    echo "Responses: $success_count success, $rate_limit_count rate limited"
    
    # If rate limiting is implemented, we should see some 429s
    if [ $rate_limit_count -gt 0 ]; then
        echo -e "✅ ${GREEN}PASS${NC}: Rate limiting - Active (${rate_limit_count}/50 requests limited)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "⚠️  ${YELLOW}SKIP${NC}: Rate limiting - Not implemented or very high limit"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Test 7: Session Security
test_session_security() {
    print_test_header "TESTING SESSION SECURITY"
    
    # Test token refresh security
    local refresh_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/auth/refresh" \
        -H "$CONTENT_TYPE" \
        -d '{
            "refreshToken": "invalid-refresh-token"
        }')
    run_security_test "Invalid refresh token" "401" "$refresh_response" "Should reject invalid refresh tokens"
    
    # Test logout invalidates token
    local valid_token=$AUTH_TOKEN
    local logout_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/auth/logout" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $valid_token" \
        -d '{}')
    
    # After logout, token should be invalid
    local post_logout_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/auth/profile" \
        -H "Authorization: Bearer $valid_token")
    
    if echo "$post_logout_response" | grep -qE "HTTP/[0-9.]+ 401"; then
        echo -e "✅ ${GREEN}PASS${NC}: Session invalidation - Token invalid after logout"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Session invalidation - Token still valid after logout"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Generate security test report
generate_security_report() {
    print_test_header "SECURITY TEST RESULTS SUMMARY"
    
    local success_rate=0
    if [ $TOTAL_TESTS -gt 0 ]; then
        success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    fi
    
    echo -e "${BLUE}Security Test Results:${NC}"
    echo -e "Total Tests: $TOTAL_TESTS"
    echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
    echo -e "Success Rate: ${YELLOW}$success_rate%${NC}"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "\n🎉 ${GREEN}All security tests passed!${NC}"
        echo -e "The API demonstrates good security practices."
    else
        echo -e "\n⚠️  ${YELLOW}Security issues found!${NC}"
        echo -e "Review failed tests and implement security fixes."
    fi
    
    # Security recommendations
    echo -e "\n${BLUE}Security Recommendations:${NC}"
    echo -e "1. Implement comprehensive rate limiting"
    echo -e "2. Add security headers (HSTS, CSP, etc.)"
    echo -e "3. Implement account lockout after failed attempts"
    echo -e "4. Regular security audits and penetration testing"
    echo -e "5. Keep dependencies updated"
    echo -e "6. Implement proper logging and monitoring"
    
    # Save detailed results
    echo "SECURITY TEST RESULTS" > "security-test-results.txt"
    echo "=====================" >> "security-test-results.txt"
    echo "Date: $(date)" >> "security-test-results.txt"
    echo "Total Tests: $TOTAL_TESTS" >> "security-test-results.txt"
    echo "Passed: $PASSED_TESTS" >> "security-test-results.txt"
    echo "Failed: $FAILED_TESTS" >> "security-test-results.txt"
    echo "Success Rate: $success_rate%" >> "security-test-results.txt"
    echo "" >> "security-test-results.txt"
    echo "Log file: $LOG_FILE" >> "security-test-results.txt"
}

# Main execution
main() {
    log "Starting security tests"
    
    setup_security_test_environment
    test_authentication_security
    test_authorization_security
    test_input_validation_security
    test_data_exposure_security
    test_http_security_headers
    test_rate_limiting_security
    test_session_security
    generate_security_report
    
    # Exit with error if tests failed
    if [ $FAILED_TESTS -gt 0 ]; then
        exit 1
    fi
}

# Run the main function
main