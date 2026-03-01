#!/bin/bash
# Comprehensive Backend API Tests for Client Categories
# Tests: CRUD, auth, validation, edge cases

BASE_URL="http://localhost:3005/api/v1"
PASSED=0
FAILED=0
FAILURES=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

assert_status() {
  local name="$1"
  local expected="$2"
  local actual="$3"
  if [ "$actual" = "$expected" ]; then
    PASSED=$((PASSED + 1))
  else
    FAILED=$((FAILED + 1))
    FAILURES="${FAILURES}\n  FAIL: ${name} (expected ${expected}, got ${actual})"
  fi
}

assert_contains() {
  local name="$1"
  local haystack="$2"
  local needle="$3"
  if echo "$haystack" | grep -q "$needle"; then
    PASSED=$((PASSED + 1))
  else
    FAILED=$((FAILED + 1))
    FAILURES="${FAILURES}\n  FAIL: ${name} (expected to contain '${needle}')"
  fi
}

echo "=== Client Categories API Tests ==="
echo ""

# --- Auth Tests ---
echo "--- Authentication ---"

# Test 1: GET without auth should return 401
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/client-categories")
assert_status "GET /client-categories without auth -> 401" "401" "$STATUS"

# Test 2: POST without auth should return 401
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/client-categories" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}')
assert_status "POST /client-categories without auth -> 401" "401" "$STATUS"

# Test 3: Login to get token
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@clientsplus.com","password":"demo123456"}')
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | head -1 | sed 's/"accessToken":"//;s/"//')

if [ -z "$TOKEN" ]; then
  echo "ERROR: Could not get auth token. Is the server running?"
  echo "Login response: $LOGIN_RESPONSE"
  exit 1
fi
echo "  Got auth token: ${TOKEN:0:20}..."
PASSED=$((PASSED + 1))

AUTH_HEADER="Authorization: Bearer ${TOKEN}"

# --- GET Tests ---
echo "--- GET /client-categories ---"

# Test 4: GET with auth should return 200
RESPONSE=$(curl -s -w "\n%{http_code}" "${BASE_URL}/client-categories" -H "$AUTH_HEADER")
STATUS=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)
assert_status "GET /client-categories with auth -> 200" "200" "$STATUS"
assert_contains "GET response has success:true" "$BODY" '"success":true'
assert_contains "GET response has data array" "$BODY" '"data":'

# --- CREATE Tests ---
echo "--- POST /client-categories ---"

# Test 5: Create a category
CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/client-categories" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"name":"VIP Clients","nameAr":"عملاء مميزون","color":"#FF5722","icon":"star","order":1}')
CREATE_STATUS=$(echo "$CREATE_RESPONSE" | tail -1)
CREATE_BODY=$(echo "$CREATE_RESPONSE" | head -n -1)
assert_status "POST create category -> 201" "201" "$CREATE_STATUS"
assert_contains "Create response has success:true" "$CREATE_BODY" '"success":true'
assert_contains "Create response has name" "$CREATE_BODY" '"name":"VIP Clients"'
assert_contains "Create response has nameAr" "$CREATE_BODY" '"nameAr":"عملاء مميزون"'
assert_contains "Create response has color" "$CREATE_BODY" '"color":"#FF5722"'

# Extract category ID
CATEGORY_ID=$(echo "$CREATE_BODY" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')
echo "  Created category ID: $CATEGORY_ID"

# Test 6: Create with missing name should fail validation
INVALID_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/client-categories" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"color":"#FF5722"}')
INVALID_STATUS=$(echo "$INVALID_RESPONSE" | tail -1)
INVALID_BODY=$(echo "$INVALID_RESPONSE" | head -n -1)
assert_status "POST without name -> 400" "400" "$INVALID_STATUS"

# Test 7: Create another category for listing test
CREATE2_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/client-categories" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"name":"Regular Clients","nameAr":"عملاء عاديون","color":"#4CAF50","order":2}')
CREATE2_STATUS=$(echo "$CREATE2_RESPONSE" | tail -1)
assert_status "POST create second category -> 201" "201" "$CREATE2_STATUS"
CATEGORY2_ID=$(echo "$CREATE2_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')

# --- GET after CREATE ---
echo "--- GET after creates ---"

# Test 8: GET should now return 2+ categories
LIST_RESPONSE=$(curl -s "${BASE_URL}/client-categories" -H "$AUTH_HEADER")
assert_contains "GET returns VIP category" "$LIST_RESPONSE" '"name":"VIP Clients"'
assert_contains "GET returns Regular category" "$LIST_RESPONSE" '"name":"Regular Clients"'

# Test 9: GET with active filter
ACTIVE_RESPONSE=$(curl -s "${BASE_URL}/client-categories?active=true" -H "$AUTH_HEADER")
assert_contains "GET active=true has data" "$ACTIVE_RESPONSE" '"success":true'

# Test 10: GET with search filter
SEARCH_RESPONSE=$(curl -s "${BASE_URL}/client-categories?search=VIP" -H "$AUTH_HEADER")
assert_contains "GET search=VIP has results" "$SEARCH_RESPONSE" '"name":"VIP Clients"'

# --- UPDATE Tests ---
echo "--- PUT /client-categories/:id ---"

if [ -n "$CATEGORY_ID" ]; then
  # Test 11: Update category
  UPDATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "${BASE_URL}/client-categories/${CATEGORY_ID}" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d '{"name":"Premium Clients","nameAr":"عملاء متميزون","color":"#E91E63"}')
  UPDATE_STATUS=$(echo "$UPDATE_RESPONSE" | tail -1)
  UPDATE_BODY=$(echo "$UPDATE_RESPONSE" | head -n -1)
  assert_status "PUT update category -> 200" "200" "$UPDATE_STATUS"
  assert_contains "Update response has new name" "$UPDATE_BODY" '"name":"Premium Clients"'
  assert_contains "Update response has new nameAr" "$UPDATE_BODY" '"nameAr":"عملاء متميزون"'
  assert_contains "Update response has new color" "$UPDATE_BODY" '"color":"#E91E63"'

  # Test 12: Verify update persisted
  GET_ONE_RESPONSE=$(curl -s "${BASE_URL}/client-categories" -H "$AUTH_HEADER")
  assert_contains "GET after update shows new name" "$GET_ONE_RESPONSE" '"name":"Premium Clients"'
fi

# Test 13: Update non-existent category
FAKE_UPDATE=$(curl -s -w "\n%{http_code}" -X PUT "${BASE_URL}/client-categories/nonexistent-id-12345" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"name":"Nope"}')
FAKE_STATUS=$(echo "$FAKE_UPDATE" | tail -1)
assert_status "PUT non-existent category -> 404" "404" "$FAKE_STATUS"

# --- DELETE Tests ---
echo "--- DELETE /client-categories/:id ---"

if [ -n "$CATEGORY_ID" ]; then
  # Test 14: Delete (soft) category
  DELETE_RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "${BASE_URL}/client-categories/${CATEGORY_ID}" \
    -H "$AUTH_HEADER")
  DELETE_STATUS=$(echo "$DELETE_RESPONSE" | tail -1)
  DELETE_BODY=$(echo "$DELETE_RESPONSE" | head -n -1)
  assert_status "DELETE category -> 200" "200" "$DELETE_STATUS"
  assert_contains "Delete response success" "$DELETE_BODY" '"success":true'
fi

# Test 15: Delete non-existent category
FAKE_DELETE=$(curl -s -w "\n%{http_code}" -X DELETE "${BASE_URL}/client-categories/nonexistent-id-12345" \
  -H "$AUTH_HEADER")
FAKE_DEL_STATUS=$(echo "$FAKE_DELETE" | tail -1)
assert_status "DELETE non-existent -> 404" "404" "$FAKE_DEL_STATUS"

# --- Edge Cases ---
echo "--- Edge Cases ---"

# Test 16: Create with empty body
EMPTY_BODY=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/client-categories" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{}')
EMPTY_STATUS=$(echo "$EMPTY_BODY" | tail -1)
assert_status "POST empty body -> 400" "400" "$EMPTY_STATUS"

# Test 17: Create with very long name (should work)
LONG_NAME=$(printf 'A%.0s' {1..200})
LONG_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/client-categories" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"${LONG_NAME}\"}")
LONG_STATUS=$(echo "$LONG_RESPONSE" | tail -1)
assert_status "POST long name -> 201" "201" "$LONG_STATUS"
LONG_ID=$(echo "$LONG_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')

# Test 18: Create with special characters
SPECIAL_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/client-categories" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test <script>alert(1)</script>","nameAr":"اختبار"}')
SPECIAL_STATUS=$(echo "$SPECIAL_RESPONSE" | tail -1)
assert_status "POST with special chars -> 201" "201" "$SPECIAL_STATUS"
SPECIAL_ID=$(echo "$SPECIAL_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')

# Test 19: PUT with invalid JSON
INVALID_JSON=$(curl -s -w "\n%{http_code}" -X PUT "${BASE_URL}/client-categories/${CATEGORY2_ID}" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d 'not json')
INVALID_JSON_STATUS=$(echo "$INVALID_JSON" | tail -1)
assert_status "PUT with invalid JSON -> 400" "400" "$INVALID_JSON_STATUS"

# --- Cleanup ---
echo "--- Cleanup ---"

# Delete test categories
for ID in $CATEGORY2_ID $LONG_ID $SPECIAL_ID; do
  if [ -n "$ID" ]; then
    curl -s -X DELETE "${BASE_URL}/client-categories/${ID}" -H "$AUTH_HEADER" > /dev/null 2>&1
  fi
done
echo "  Cleaned up test categories"

# --- Results ---
echo ""
echo "=== Results ==="
echo "  Passed: $PASSED"
echo "  Failed: $FAILED"
if [ -n "$FAILURES" ]; then
  echo ""
  echo "Failures:"
  echo -e "$FAILURES"
fi
echo ""
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}ALL TESTS PASSED!${NC}"
else
  echo -e "${RED}${FAILED} TESTS FAILED${NC}"
fi
exit $FAILED
