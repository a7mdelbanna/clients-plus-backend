#!/bin/bash
# ============================================================
# Shared Test Utilities for E2E Flow Tests
# ============================================================

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3005/api/v1}"
AUTH_EMAIL="${AUTH_EMAIL:-admin@clientsplus.com}"
AUTH_PASSWORD="${AUTH_PASSWORD:-demo123456}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Counters
PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
TOTAL_COUNT=0
FLOW_NAME=""

# Store created resource IDs for cleanup
declare -a CLEANUP_URLS=()

# ============================================================
# Authentication
# ============================================================

login() {
  local email="${1:-$AUTH_EMAIL}"
  local password="${2:-$AUTH_PASSWORD}"

  local response
  response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\"}")

  local http_code
  http_code=$(echo "$response" | tail -1)
  local body
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" = "200" ]; then
    ACCESS_TOKEN=$(echo "$body" | jq -r '.data.tokens.accessToken // .data.accessToken // empty')
    REFRESH_TOKEN=$(echo "$body" | jq -r '.data.tokens.refreshToken // .data.refreshToken // empty')
    USER_ID=$(echo "$body" | jq -r '.data.user.id // empty')
    COMPANY_ID=$(echo "$body" | jq -r '.data.user.companyId // empty')

    if [ -n "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ]; then
      return 0
    fi
  fi

  echo -e "${RED}Login failed (HTTP $http_code): $body${NC}" >&2
  return 1
}

auth_header() {
  echo "Authorization: Bearer $ACCESS_TOKEN"
}

# ============================================================
# HTTP Helpers
# ============================================================

# Generic HTTP request
# Usage: api_call METHOD /path [body]
# Sets: HTTP_CODE, HTTP_BODY
api_call() {
  local method="$1"
  local path="$2"
  local body="$3"
  local url="$BASE_URL$path"

  local curl_args=(-s -w "\n%{http_code}" -X "$method" "$url")
  curl_args+=(-H "Content-Type: application/json")

  if [ -n "$ACCESS_TOKEN" ]; then
    curl_args+=(-H "Authorization: Bearer $ACCESS_TOKEN")
  fi

  if [ -n "$body" ]; then
    curl_args+=(-d "$body")
  fi

  local response
  response=$(curl "${curl_args[@]}")

  HTTP_CODE=$(echo "$response" | tail -1)
  HTTP_BODY=$(echo "$response" | sed '$d')
}

# Unauthenticated HTTP request
api_call_noauth() {
  local method="$1"
  local path="$2"
  local body="$3"
  local url="$BASE_URL$path"

  local curl_args=(-s -w "\n%{http_code}" -X "$method" "$url")
  curl_args+=(-H "Content-Type: application/json")

  if [ -n "$body" ]; then
    curl_args+=(-d "$body")
  fi

  local response
  response=$(curl "${curl_args[@]}")

  HTTP_CODE=$(echo "$response" | tail -1)
  HTTP_BODY=$(echo "$response" | sed '$d')
}

# ============================================================
# Assertion Helpers
# ============================================================

# Assert HTTP status code
# Usage: assert_status EXPECTED_CODE "test name"
assert_status() {
  local expected="$1"
  local test_name="$2"
  TOTAL_COUNT=$((TOTAL_COUNT + 1))

  if [ "$HTTP_CODE" = "$expected" ]; then
    echo -e "  ${GREEN}✓${NC} $test_name (HTTP $HTTP_CODE)"
    PASS_COUNT=$((PASS_COUNT + 1))
    return 0
  else
    echo -e "  ${RED}✗${NC} $test_name — expected HTTP $expected, got HTTP $HTTP_CODE"
    echo -e "    ${YELLOW}Response: $(echo "$HTTP_BODY" | head -c 200)${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    return 1
  fi
}

# Assert status is one of multiple acceptable codes
# Usage: assert_status_oneof "200|201" "test name"
assert_status_oneof() {
  local expected_codes="$1"
  local test_name="$2"
  TOTAL_COUNT=$((TOTAL_COUNT + 1))

  if echo "$expected_codes" | grep -qw "$HTTP_CODE"; then
    echo -e "  ${GREEN}✓${NC} $test_name (HTTP $HTTP_CODE)"
    PASS_COUNT=$((PASS_COUNT + 1))
    return 0
  else
    echo -e "  ${RED}✗${NC} $test_name — expected HTTP [$expected_codes], got HTTP $HTTP_CODE"
    echo -e "    ${YELLOW}Response: $(echo "$HTTP_BODY" | head -c 200)${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    return 1
  fi
}

# Assert JSON field exists and is not empty
# Usage: assert_json_exists ".data.id" "test name"
assert_json_exists() {
  local jq_path="$1"
  local test_name="$2"
  TOTAL_COUNT=$((TOTAL_COUNT + 1))

  local value
  value=$(echo "$HTTP_BODY" | jq -r "$jq_path" 2>/dev/null)

  if [ -n "$value" ] && [ "$value" != "null" ] && [ "$value" != "" ]; then
    echo -e "  ${GREEN}✓${NC} $test_name ($jq_path = $(echo "$value" | head -c 60))"
    PASS_COUNT=$((PASS_COUNT + 1))
    return 0
  else
    echo -e "  ${RED}✗${NC} $test_name — $jq_path is empty or null"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    return 1
  fi
}

# Assert JSON field equals specific value
# Usage: assert_json_equals ".data.name" "expected_value" "test name"
assert_json_equals() {
  local jq_path="$1"
  local expected="$2"
  local test_name="$3"
  TOTAL_COUNT=$((TOTAL_COUNT + 1))

  local value
  value=$(echo "$HTTP_BODY" | jq -r "$jq_path" 2>/dev/null)

  if [ "$value" = "$expected" ]; then
    echo -e "  ${GREEN}✓${NC} $test_name ($jq_path = $value)"
    PASS_COUNT=$((PASS_COUNT + 1))
    return 0
  else
    echo -e "  ${RED}✗${NC} $test_name — expected '$expected', got '$value'"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    return 1
  fi
}

# Assert JSON field contains substring
# Usage: assert_json_contains ".data.name" "substring" "test name"
assert_json_contains() {
  local jq_path="$1"
  local substring="$2"
  local test_name="$3"
  TOTAL_COUNT=$((TOTAL_COUNT + 1))

  local value
  value=$(echo "$HTTP_BODY" | jq -r "$jq_path" 2>/dev/null)

  if echo "$value" | grep -qi "$substring"; then
    echo -e "  ${GREEN}✓${NC} $test_name"
    PASS_COUNT=$((PASS_COUNT + 1))
    return 0
  else
    echo -e "  ${RED}✗${NC} $test_name — '$jq_path' does not contain '$substring' (got: $value)"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    return 1
  fi
}

# Assert JSON array is not empty
# Usage: assert_json_array_not_empty ".data" "test name"
assert_json_array_not_empty() {
  local jq_path="$1"
  local test_name="$2"
  TOTAL_COUNT=$((TOTAL_COUNT + 1))

  local count
  count=$(echo "$HTTP_BODY" | jq "$jq_path | length" 2>/dev/null)

  if [ -n "$count" ] && [ "$count" -gt 0 ] 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} $test_name (count: $count)"
    PASS_COUNT=$((PASS_COUNT + 1))
    return 0
  else
    echo -e "  ${RED}✗${NC} $test_name — array is empty or invalid"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    return 1
  fi
}

# Assert response body contains success:true
assert_success() {
  local test_name="$1"
  TOTAL_COUNT=$((TOTAL_COUNT + 1))

  local success
  success=$(echo "$HTTP_BODY" | jq -r '.success' 2>/dev/null)

  if [ "$success" = "true" ]; then
    echo -e "  ${GREEN}✓${NC} $test_name (success: true)"
    PASS_COUNT=$((PASS_COUNT + 1))
    return 0
  else
    echo -e "  ${RED}✗${NC} $test_name — success is not true"
    echo -e "    ${YELLOW}Response: $(echo "$HTTP_BODY" | head -c 200)${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    return 1
  fi
}

# Skip a test with reason
skip_test() {
  local test_name="$1"
  local reason="$2"
  TOTAL_COUNT=$((TOTAL_COUNT + 1))
  SKIP_COUNT=$((SKIP_COUNT + 1))
  echo -e "  ${YELLOW}⊘${NC} SKIP: $test_name — $reason"
}

# ============================================================
# Extract helpers
# ============================================================

# Extract a field from the last HTTP response
# Usage: extract_id ".data.id"
extract_field() {
  echo "$HTTP_BODY" | jq -r "$1" 2>/dev/null
}

# ============================================================
# Reporting
# ============================================================

start_flow() {
  FLOW_NAME="$1"
  echo ""
  echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}${BLUE}  $FLOW_NAME${NC}"
  echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

start_section() {
  echo ""
  echo -e "${CYAN}  ── $1 ──${NC}"
}

end_flow() {
  echo ""
  echo -e "${BOLD}  Results for $FLOW_NAME:${NC}"
  echo -e "    ${GREEN}Passed: $PASS_COUNT${NC}  ${RED}Failed: $FAIL_COUNT${NC}  ${YELLOW}Skipped: $SKIP_COUNT${NC}  Total: $TOTAL_COUNT"

  if [ "$FAIL_COUNT" -eq 0 ]; then
    echo -e "  ${GREEN}${BOLD}✓ ALL TESTS PASSED${NC}"
  else
    echo -e "  ${RED}${BOLD}✗ SOME TESTS FAILED${NC}"
  fi
  echo ""

  # Return exit code based on failures
  return "$FAIL_COUNT"
}

# Write results to a temp file for aggregation
write_results() {
  local results_file="${1:-/tmp/e2e-flow-results.txt}"
  echo "$FLOW_NAME|$PASS_COUNT|$FAIL_COUNT|$SKIP_COUNT|$TOTAL_COUNT" >> "$results_file"
}

# ============================================================
# Cleanup helpers
# ============================================================

# Register a URL for cleanup (DELETE at end)
register_cleanup() {
  local url="$1"
  CLEANUP_URLS+=("$url")
}

# Run all cleanup operations
run_cleanup() {
  if [ ${#CLEANUP_URLS[@]} -eq 0 ]; then
    return
  fi

  echo ""
  echo -e "${CYAN}  ── Cleanup ──${NC}"

  # Reverse order cleanup
  for ((i=${#CLEANUP_URLS[@]}-1; i>=0; i--)); do
    local url="${CLEANUP_URLS[$i]}"
    local clean_response
    clean_response=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL$url" \
      -H "Authorization: Bearer $ACCESS_TOKEN")

    if [ "$clean_response" = "200" ] || [ "$clean_response" = "204" ]; then
      echo -e "  ${GREEN}✓${NC} Cleaned up: $url"
    else
      echo -e "  ${YELLOW}⚠${NC} Cleanup returned HTTP $clean_response for: $url"
    fi
  done

  CLEANUP_URLS=()
}

# ============================================================
# Prerequisite helpers
# ============================================================

# Check that backend is reachable
check_backend() {
  local health
  health=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3005/health")
  if [ "$health" != "200" ]; then
    echo -e "${RED}ERROR: Backend is not reachable at http://localhost:3005${NC}"
    echo "Please start the backend server first."
    exit 1
  fi
}

# Get a tomorrow date in YYYY-MM-DD format
tomorrow_date() {
  date -d "+1 day" +%Y-%m-%d 2>/dev/null || date -v+1d +%Y-%m-%d 2>/dev/null || echo "2026-02-25"
}

# Get today's date
today_date() {
  date +%Y-%m-%d 2>/dev/null || echo "2026-02-24"
}

# Random string for unique test data
random_suffix() {
  echo $((RANDOM % 9000 + 1000))
}
