#!/bin/bash

# Comprehensive Authentication API Test Suite
# Tests all authentication endpoints including registration, login, token management, and role-based access

BASE_URL="http://localhost:3000/api/v1"
CONTENT_TYPE="Content-Type: application/json"
TEST_EMAIL_PREFIX="test-auth-$(date +%s)"
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
COMPANY_ID=""
AUTH_TOKEN=""
REFRESH_TOKEN=""
ADMIN_TOKEN=""
STAFF_TOKEN=""

# Logging
LOG_FILE="auth-test-$(date +%Y%m%d-%H%M%S).log"

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

# Test 1: User Registration
test_user_registration() {
    print_test_header "TESTING USER REGISTRATION"
    
    # Test register with company (new company owner)
    local register_with_company_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/auth/register-with-company" \
        -H "$CONTENT_TYPE" \
        -d '{
            "email": "'${TEST_EMAIL_PREFIX}@example.com'",
            "password": "'$TEST_PASSWORD'",
            "firstName": "Test",
            "lastName": "Owner",
            "companyName": "Test Company Registration"
        }')
    
    # Extract tokens and company ID
    AUTH_TOKEN=$(echo "$register_with_company_response" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
    REFRESH_TOKEN=$(echo "$register_with_company_response" | grep -o '"refreshToken":"[^"]*' | cut -d'"' -f4)
    COMPANY_ID=$(echo "$register_with_company_response" | grep -o '"companyId":"[^"]*' | cut -d'"' -f4)
    
    run_test "Register with company creation" "201" "$register_with_company_response"
    
    # Test register user to existing company
    local register_user_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/auth/register" \
        -H "$CONTENT_TYPE" \
        -d '{
            "email": "'${TEST_EMAIL_PREFIX}-staff@example.com'",
            "password": "'$TEST_PASSWORD'",
            "firstName": "Test",
            "lastName": "Staff",
            "companyId": "'$COMPANY_ID'",
            "role": "STAFF"
        }')
    run_test "Register user to existing company" "201" "$register_user_response"
    
    # Test duplicate email registration
    local duplicate_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/auth/register-with-company" \
        -H "$CONTENT_TYPE" \
        -d '{
            "email": "'${TEST_EMAIL_PREFIX}@example.com'",
            "password": "'$TEST_PASSWORD'",
            "firstName": "Test",
            "lastName": "Duplicate"
        }')
    
    if echo "$duplicate_response" | grep -qE "HTTP/[0-9.]+ 409"; then
        echo -e "✅ ${GREEN}PASS${NC}: Duplicate email registration returns 409"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Duplicate email should return 409"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Test invalid email format
    local invalid_email_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/auth/register" \
        -H "$CONTENT_TYPE" \
        -d '{
            "email": "invalid-email",
            "password": "'$TEST_PASSWORD'",
            "firstName": "Test",
            "lastName": "Invalid",
            "companyId": "'$COMPANY_ID'"
        }')
    
    if echo "$invalid_email_response" | grep -qE "HTTP/[0-9.]+ 400"; then
        echo -e "✅ ${GREEN}PASS${NC}: Invalid email format returns 400"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Invalid email should return 400"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Test weak password
    local weak_password_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/auth/register" \
        -H "$CONTENT_TYPE" \
        -d '{
            "email": "'${TEST_EMAIL_PREFIX}-weak@example.com'",
            "password": "weak",
            "firstName": "Test",
            "lastName": "Weak",
            "companyId": "'$COMPANY_ID'"
        }')
    
    if echo "$weak_password_response" | grep -qE "HTTP/[0-9.]+ 400"; then
        echo -e "✅ ${GREEN}PASS${NC}: Weak password returns 400"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Weak password should return 400"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Test 2: User Login
test_user_login() {
    print_test_header "TESTING USER LOGIN"
    
    # Test successful login
    local login_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/auth/login" \
        -H "$CONTENT_TYPE" \
        -d '{
            "email": "'${TEST_EMAIL_PREFIX}@example.com'",
            "password": "'$TEST_PASSWORD'"
        }')
    run_test "Successful login" "200" "$login_response"
    
    # Test login with company ID
    local login_with_company_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/auth/login" \
        -H "$CONTENT_TYPE" \
        -d '{
            "email": "'${TEST_EMAIL_PREFIX}@example.com'",
            "password": "'$TEST_PASSWORD'",
            "companyId": "'$COMPANY_ID'"
        }')
    run_test "Login with company ID" "200" "$login_with_company_response"
    
    # Test invalid credentials
    local invalid_login_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/auth/login" \
        -H "$CONTENT_TYPE" \
        -d '{
            "email": "'${TEST_EMAIL_PREFIX}@example.com'",
            "password": "wrongpassword"
        }')
    
    if echo "$invalid_login_response" | grep -qE "HTTP/[0-9.]+ 401"; then
        echo -e "✅ ${GREEN}PASS${NC}: Invalid credentials return 401"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Invalid credentials should return 401"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Test non-existent user
    local nonexistent_login_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/auth/login" \
        -H "$CONTENT_TYPE" \
        -d '{
            "email": "nonexistent@example.com",
            "password": "'$TEST_PASSWORD'"
        }')
    
    if echo "$nonexistent_login_response" | grep -qE "HTTP/[0-9.]+ 401"; then
        echo -e "✅ ${GREEN}PASS${NC}: Non-existent user returns 401"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Non-existent user should return 401"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Test 3: Token Management
test_token_management() {
    print_test_header "TESTING TOKEN MANAGEMENT"
    
    # Test token verification
    local verify_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/auth/verify" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    run_test "Token verification" "200" "$verify_response"
    
    # Test token refresh
    local refresh_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/auth/refresh" \
        -H "$CONTENT_TYPE" \
        -d '{
            "refreshToken": "'$REFRESH_TOKEN'"
        }')
    run_test "Token refresh" "200" "$refresh_response"
    
    # Update tokens from refresh response
    local new_auth_token=$(echo "$refresh_response" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
    local new_refresh_token=$(echo "$refresh_response" | grep -o '"refreshToken":"[^"]*' | cut -d'"' -f4)
    
    if [ ! -z "$new_auth_token" ]; then
        AUTH_TOKEN=$new_auth_token
        REFRESH_TOKEN=$new_refresh_token
    fi
    
    # Test invalid token
    local invalid_token_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/auth/verify" \
        -H "Authorization: Bearer invalid-token")
    
    if echo "$invalid_token_response" | grep -qE "HTTP/[0-9.]+ 401"; then
        echo -e "✅ ${GREEN}PASS${NC}: Invalid token returns 401"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Invalid token should return 401"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Test expired refresh token
    local expired_refresh_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/auth/refresh" \
        -H "$CONTENT_TYPE" \
        -d '{
            "refreshToken": "expired-token"
        }')
    
    if echo "$expired_refresh_response" | grep -qE "HTTP/[0-9.]+ 401"; then
        echo -e "✅ ${GREEN}PASS${NC}: Expired refresh token returns 401"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Expired refresh token should return 401"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Test 4: Profile Management
test_profile_management() {
    print_test_header "TESTING PROFILE MANAGEMENT"
    
    # Test get profile
    local profile_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/auth/profile" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    run_test "Get user profile" "200" "$profile_response"
    
    # Test profile without token
    local no_token_profile_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/auth/profile")
    
    if echo "$no_token_profile_response" | grep -qE "HTTP/[0-9.]+ 401"; then
        echo -e "✅ ${GREEN}PASS${NC}: Profile without token returns 401"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Profile without token should return 401"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Test 5: Password Management
test_password_management() {
    print_test_header "TESTING PASSWORD MANAGEMENT"
    
    # Test password change
    local change_password_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/auth/change-password" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "currentPassword": "'$TEST_PASSWORD'",
            "newPassword": "NewPassword123!"
        }')
    run_test "Change password" "200" "$change_password_response"
    
    # Update test password for subsequent tests
    TEST_PASSWORD="NewPassword123!"
    
    # Test password change with wrong current password
    local wrong_password_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/auth/change-password" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "currentPassword": "wrongpassword",
            "newPassword": "AnotherPassword123!"
        }')
    
    if echo "$wrong_password_response" | grep -qE "HTTP/[0-9.]+ 400"; then
        echo -e "✅ ${GREEN}PASS${NC}: Wrong current password returns 400"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Wrong current password should return 400"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Test password reset request
    local reset_request_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/auth/request-reset" \
        -H "$CONTENT_TYPE" \
        -d '{
            "email": "'${TEST_EMAIL_PREFIX}@example.com'"
        }')
    run_test "Password reset request" "200" "$reset_request_response"
    
    # Test password reset request with invalid email
    local invalid_reset_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/auth/request-reset" \
        -H "$CONTENT_TYPE" \
        -d '{
            "email": "invalid-email"
        }')
    
    if echo "$invalid_reset_response" | grep -qE "HTTP/[0-9.]+ 400"; then
        echo -e "✅ ${GREEN}PASS${NC}: Invalid email for reset returns 400"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Invalid email for reset should return 400"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Test password reset with invalid token
    local invalid_reset_token_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/auth/reset-password" \
        -H "$CONTENT_TYPE" \
        -d '{
            "resetToken": "invalid-token",
            "newPassword": "ResetPassword123!"
        }')
    
    if echo "$invalid_reset_token_response" | grep -qE "HTTP/[0-9.]+ 400"; then
        echo -e "✅ ${GREEN}PASS${NC}: Invalid reset token returns 400"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Invalid reset token should return 400"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Test 6: Firebase Integration
test_firebase_integration() {
    print_test_header "TESTING FIREBASE INTEGRATION"
    
    # Test Firebase token verification with invalid token
    local firebase_verify_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/auth/firebase/verify" \
        -H "$CONTENT_TYPE" \
        -d '{
            "firebaseToken": "invalid-firebase-token"
        }')
    
    # Firebase integration might not be fully set up in test environment
    # so we expect either 400 (invalid token) or 503 (service unavailable)
    if echo "$firebase_verify_response" | grep -qE "HTTP/[0-9.]+ (400|401|503)"; then
        echo -e "✅ ${GREEN}PASS${NC}: Firebase verify with invalid token returns expected error"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Firebase verify should return error for invalid token"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Test Firebase verify with missing token
    local missing_firebase_token_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/auth/firebase/verify" \
        -H "$CONTENT_TYPE" \
        -d '{}')
    
    if echo "$missing_firebase_token_response" | grep -qE "HTTP/[0-9.]+ 400"; then
        echo -e "✅ ${GREEN}PASS${NC}: Missing Firebase token returns 400"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Missing Firebase token should return 400"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Test 7: Role-Based Access Control
test_role_based_access() {
    print_test_header "TESTING ROLE-BASED ACCESS CONTROL"
    
    # Create a staff user to test role restrictions
    local staff_register_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/auth/register" \
        -H "$CONTENT_TYPE" \
        -d '{
            "email": "'${TEST_EMAIL_PREFIX}-staff-rbac@example.com'",
            "password": "'$TEST_PASSWORD'",
            "firstName": "Test",
            "lastName": "StaffRBAC",
            "companyId": "'$COMPANY_ID'",
            "role": "STAFF"
        }')
    
    # Login as staff to get staff token
    local staff_login_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/auth/login" \
        -H "$CONTENT_TYPE" \
        -d '{
            "email": "'${TEST_EMAIL_PREFIX}-staff-rbac@example.com'",
            "password": "'$TEST_PASSWORD'"
        }')
    
    STAFF_TOKEN=$(echo "$staff_login_response" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
    
    # Test staff trying to create another company (should fail)
    local staff_company_create_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/companies" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $STAFF_TOKEN" \
        -d '{
            "name": "Unauthorized Company",
            "email": "unauthorized@example.com"
        }')
    
    if echo "$staff_company_create_response" | grep -qE "HTTP/[0-9.]+ (401|403)"; then
        echo -e "✅ ${GREEN}PASS${NC}: Staff cannot create companies (returns 401/403)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Staff should not be able to create companies"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Test admin accessing company settings (should work)
    local admin_company_settings_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/company/settings" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    run_test "Admin can access company settings" "200" "$admin_company_settings_response"
    
    # Test staff accessing company settings (should work for reading)
    local staff_company_settings_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/company/settings" \
        -H "Authorization: Bearer $STAFF_TOKEN")
    run_test "Staff can read company settings" "200" "$staff_company_settings_response"
    
    # Test staff trying to update company settings (should fail)
    local staff_update_settings_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X PUT "$BASE_URL/company/settings" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $STAFF_TOKEN" \
        -d '{
            "timezone": "UTC"
        }')
    
    if echo "$staff_update_settings_response" | grep -qE "HTTP/[0-9.]+ (401|403)"; then
        echo -e "✅ ${GREEN}PASS${NC}: Staff cannot update company settings (returns 401/403)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Staff should not be able to update company settings"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Test 8: Session Management
test_session_management() {
    print_test_header "TESTING SESSION MANAGEMENT"
    
    # Test logout
    local logout_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/auth/logout" \
        -H "$CONTENT_TYPE" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "refreshToken": "'$REFRESH_TOKEN'"
        }')
    run_test "User logout" "200" "$logout_response"
    
    # Test accessing protected route after logout (should fail)
    local post_logout_access_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/auth/profile" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    
    if echo "$post_logout_access_response" | grep -qE "HTTP/[0-9.]+ 401"; then
        echo -e "✅ ${GREEN}PASS${NC}: Cannot access protected routes after logout (returns 401)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Should not be able to access protected routes after logout"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Re-login for any remaining tests
    local relogin_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/auth/login" \
        -H "$CONTENT_TYPE" \
        -d '{
            "email": "'${TEST_EMAIL_PREFIX}@example.com'",
            "password": "'$TEST_PASSWORD'"
        }')
    
    AUTH_TOKEN=$(echo "$relogin_response" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
    REFRESH_TOKEN=$(echo "$relogin_response" | grep -o '"refreshToken":"[^"]*' | cut -d'"' -f4)
}

# Test 9: Health Check
test_health_check() {
    print_test_header "TESTING HEALTH CHECK"
    
    # Test auth service health check
    local health_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/auth/health")
    run_test "Auth service health check" "200" "$health_response"
}

# Test 10: Input Validation and Security
test_input_validation_security() {
    print_test_header "TESTING INPUT VALIDATION AND SECURITY"
    
    # Test SQL injection attempt
    local sql_injection_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/auth/login" \
        -H "$CONTENT_TYPE" \
        -d '{
            "email": "admin@example.com'\'''; DROP TABLE users; --",
            "password": "'$TEST_PASSWORD'"
        }')
    
    if echo "$sql_injection_response" | grep -qE "HTTP/[0-9.]+ (400|401)"; then
        echo -e "✅ ${GREEN}PASS${NC}: SQL injection attempt handled safely"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: SQL injection attempt should be handled safely"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Test XSS attempt in registration
    local xss_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/auth/register" \
        -H "$CONTENT_TYPE" \
        -d '{
            "email": "'${TEST_EMAIL_PREFIX}-xss@example.com'",
            "password": "'$TEST_PASSWORD'",
            "firstName": "<script>alert('"'"'xss'"'"')</script>",
            "lastName": "Test",
            "companyId": "'$COMPANY_ID'"
        }')
    
    # Should either reject with 400 or accept but sanitize
    if echo "$xss_response" | grep -qE "HTTP/[0-9.]+ (201|400)"; then
        echo -e "✅ ${GREEN}PASS${NC}: XSS attempt handled appropriately"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: XSS attempt should be handled appropriately"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Test extremely long password
    local long_password="a$(printf 'b%.0s' {1..1000})"
    local long_password_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/auth/register" \
        -H "$CONTENT_TYPE" \
        -d '{
            "email": "'${TEST_EMAIL_PREFIX}-long@example.com'",
            "password": "'$long_password'",
            "firstName": "Test",
            "lastName": "Long",
            "companyId": "'$COMPANY_ID'"
        }')
    
    if echo "$long_password_response" | grep -qE "HTTP/[0-9.]+ 400"; then
        echo -e "✅ ${GREEN}PASS${NC}: Extremely long password rejected"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Extremely long password should be rejected"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Performance testing
test_auth_performance() {
    print_test_header "TESTING AUTHENTICATION PERFORMANCE"
    
    # Test login performance
    local start_time=$(date +%s%3N)
    local perf_login_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/auth/login" \
        -H "$CONTENT_TYPE" \
        -d '{
            "email": "'${TEST_EMAIL_PREFIX}@example.com'",
            "password": "'$TEST_PASSWORD'"
        }')
    local end_time=$(date +%s%3N)
    local duration=$((end_time - start_time))
    
    if [ $duration -lt 2000 ]; then  # Less than 2 seconds
        echo -e "✅ ${GREEN}PASS${NC}: Login completed in ${duration}ms (< 2000ms)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Login took ${duration}ms (should be < 2000ms)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Test token verification performance
    local token_from_perf=$(echo "$perf_login_response" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
    local token_start_time=$(date +%s%3N)
    local perf_verify_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/auth/verify" \
        -H "Authorization: Bearer $token_from_perf")
    local token_end_time=$(date +%s%3N)
    local token_duration=$((token_end_time - token_start_time))
    
    if [ $token_duration -lt 1000 ]; then  # Less than 1 second
        echo -e "✅ ${GREEN}PASS${NC}: Token verification completed in ${token_duration}ms (< 1000ms)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC}: Token verification took ${token_duration}ms (should be < 1000ms)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Generate test report
generate_report() {
    print_test_header "AUTHENTICATION TEST RESULTS SUMMARY"
    
    local success_rate=0
    if [ $TOTAL_TESTS -gt 0 ]; then
        success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    fi
    
    echo -e "${BLUE}Authentication API Test Results:${NC}"
    echo -e "Total Tests: $TOTAL_TESTS"
    echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
    echo -e "Success Rate: ${YELLOW}$success_rate%${NC}"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "\n🎉 ${GREEN}All authentication tests passed!${NC}"
        log "All authentication tests passed successfully"
    else
        echo -e "\n⚠️  ${YELLOW}Some tests failed. Check log for details: $LOG_FILE${NC}"
        log "Test completed with $FAILED_TESTS failures"
    fi
    
    # Save detailed results
    echo "AUTHENTICATION API TEST RESULTS" > "auth-test-results.txt"
    echo "================================" >> "auth-test-results.txt"
    echo "Date: $(date)" >> "auth-test-results.txt"
    echo "Total Tests: $TOTAL_TESTS" >> "auth-test-results.txt"
    echo "Passed: $PASSED_TESTS" >> "auth-test-results.txt"
    echo "Failed: $FAILED_TESTS" >> "auth-test-results.txt"
    echo "Success Rate: $success_rate%" >> "auth-test-results.txt"
    echo "" >> "auth-test-results.txt"
    echo "Log file: $LOG_FILE" >> "auth-test-results.txt"
}

# Main execution
main() {
    log "Starting comprehensive authentication API tests"
    
    test_user_registration
    test_user_login
    test_token_management
    test_profile_management
    test_password_management
    test_firebase_integration
    test_role_based_access
    test_session_management
    test_health_check
    test_input_validation_security
    test_auth_performance
    generate_report
    
    # Exit with error if tests failed
    if [ $FAILED_TESTS -gt 0 ]; then
        exit 1
    fi
}

# Run the main function
main