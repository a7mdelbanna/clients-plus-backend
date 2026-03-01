#!/bin/bash
# ============================================================
# Flow 5: Services
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/test-utils.sh"

check_backend
login || { echo "Login failed"; exit 1; }
start_flow "Flow 5: Services"

SUFFIX=$(random_suffix)
STAFF_ID=$(cat /tmp/e2e-staff-id.txt 2>/dev/null)

# ── Categories ──
start_section "Service Categories"

api_call GET "/services/categories"
assert_status "200" "GET /services/categories → list"
EXISTING_CATEGORY_ID=$(echo "$HTTP_BODY" | jq -r '.data[0].id // empty' 2>/dev/null)

api_call POST "/services/categories" "{\"name\": \"Test Category $SUFFIX\", \"description\": \"E2E test category\"}"
assert_status_oneof "200|201" "POST /services/categories — create"
TEST_CATEGORY_ID=$(extract_field ".data.id")

if [ -n "$TEST_CATEGORY_ID" ] && [ "$TEST_CATEGORY_ID" != "null" ]; then
  register_cleanup "/services/categories/$TEST_CATEGORY_ID"

  api_call PUT "/services/categories/$TEST_CATEGORY_ID" "{\"name\": \"Updated Category $SUFFIX\"}"
  assert_status "200" "PUT /services/categories/:id — update"
fi

# Use existing category if test one failed
CATEGORY_FOR_SERVICE="${TEST_CATEGORY_ID:-$EXISTING_CATEGORY_ID}"

# ── Create Service ──
start_section "Create Service"

api_call POST "/services" "{
  \"name\": \"Test Service $SUFFIX\",
  \"description\": \"E2E test service\",
  \"duration\": 60,
  \"price\": 150,
  \"categoryId\": \"$CATEGORY_FOR_SERVICE\",
  \"isActive\": true
}"
assert_status_oneof "200|201" "POST /services — create"
TEST_SERVICE_ID=$(extract_field ".data.id")

if [ -n "$TEST_SERVICE_ID" ] && [ "$TEST_SERVICE_ID" != "null" ]; then
  register_cleanup "/services/$TEST_SERVICE_ID"

  # ── Get Service ──
  start_section "Get Service"

  api_call GET "/services/$TEST_SERVICE_ID"
  assert_status "200" "GET /services/:id → details"
  assert_json_exists ".data.name" "Service has name"
  assert_json_exists ".data.price" "Service has price"

  # ── Update Service ──
  start_section "Update Service"

  api_call PUT "/services/$TEST_SERVICE_ID" '{"price": 200, "duration": 90}'
  assert_status "200" "PUT /services/:id — update price/duration"

  # ── List Services ──
  start_section "List & Search"

  api_call GET "/services"
  assert_status "200" "GET /services → list"

  api_call GET "/services/all"
  assert_status "200" "GET /services/all → dropdown list"

  api_call GET "/services/search?q=Test"
  assert_status_oneof "200|404" "GET /services/search?q=Test → search"

  # ── By Category ──
  start_section "Filter by Category"

  if [ -n "$CATEGORY_FOR_SERVICE" ] && [ "$CATEGORY_FOR_SERVICE" != "null" ]; then
    api_call GET "/services/by-category/$CATEGORY_FOR_SERVICE"
    assert_status "200" "GET /services/by-category/:id → filtered"
  fi

  # ── By Staff ──
  start_section "Filter by Staff"

  if [ -n "$STAFF_ID" ] && [ "$STAFF_ID" != "null" ] && [ "$STAFF_ID" != "" ]; then
    api_call GET "/services/by-staff/$STAFF_ID"
    assert_status "200" "GET /services/by-staff/:id → filtered"
  else
    skip_test "By staff filter" "No staff ID available"
  fi

  # ── Duplicate ──
  start_section "Duplicate Service"

  api_call POST "/services/$TEST_SERVICE_ID/duplicate"
  assert_status_oneof "200|201" "POST /services/:id/duplicate → duplicate"
  DUP_SERVICE_ID=$(extract_field ".data.id")
  if [ -n "$DUP_SERVICE_ID" ] && [ "$DUP_SERVICE_ID" != "null" ]; then
    register_cleanup "/services/$DUP_SERVICE_ID"
  fi

  # ── Online Booking Services ──
  start_section "Online Booking"

  api_call GET "/services/online-booking"
  assert_status_oneof "200|404" "GET /services/online-booking → bookable services"

  # ── Pricing ──
  api_call GET "/services/pricing"
  assert_status_oneof "200|404" "GET /services/pricing → pricing list"

  # ── Health ──
  api_call GET "/services/health"
  assert_status "200" "GET /services/health → health check"

  # ── Cleanup ──
  start_section "Cleanup"

  if [ -n "$DUP_SERVICE_ID" ] && [ "$DUP_SERVICE_ID" != "null" ]; then
    api_call DELETE "/services/$DUP_SERVICE_ID"
    assert_status_oneof "200|204" "DELETE duplicate service → cleanup"
  fi

  api_call DELETE "/services/$TEST_SERVICE_ID"
  assert_status_oneof "200|204" "DELETE service → cleanup"
  CLEANUP_URLS=()
else
  skip_test "Service CRUD" "Could not create test service"
fi

if [ -n "$TEST_CATEGORY_ID" ] && [ "$TEST_CATEGORY_ID" != "null" ]; then
  api_call DELETE "/services/categories/$TEST_CATEGORY_ID"
  assert_status_oneof "200|204" "DELETE category → cleanup"
fi

# Export for dependent flows
echo "${EXISTING_CATEGORY_ID:-$TEST_CATEGORY_ID}" > /tmp/e2e-service-category-id.txt
# Get an existing service ID for dependent flows
api_call GET "/services"
EXISTING_SERVICE_ID=$(echo "$HTTP_BODY" | jq -r '.data[0].id // .data.data[0].id // empty' 2>/dev/null)
echo "$EXISTING_SERVICE_ID" > /tmp/e2e-service-id.txt

end_flow
write_results
exit $FAIL_COUNT
