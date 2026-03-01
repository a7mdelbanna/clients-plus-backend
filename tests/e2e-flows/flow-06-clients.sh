#!/bin/bash
# ============================================================
# Flow 6: Clients
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/test-utils.sh"

check_backend
login || { echo "Login failed"; exit 1; }
start_flow "Flow 6: Clients"

SUFFIX=$(random_suffix)

# ── Create Client ──
start_section "Create Client"

api_call POST "/clients" "{
  \"firstName\": \"TestClient\",
  \"lastName\": \"E2E$SUFFIX\",
  \"phone\": \"+966555$SUFFIX\",
  \"email\": \"testclient$SUFFIX@example.com\",
  \"gender\": \"male\",
  \"dateOfBirth\": \"1990-01-15\",
  \"notes\": \"E2E test client\"
}"
assert_status_oneof "200|201" "POST /clients — create with full data"
TEST_CLIENT_ID=$(extract_field ".data.id")

if [ -n "$TEST_CLIENT_ID" ] && [ "$TEST_CLIENT_ID" != "null" ]; then
  register_cleanup "/clients/$TEST_CLIENT_ID"

  # ── Get Client ──
  start_section "Get Client"

  api_call GET "/clients/$TEST_CLIENT_ID"
  assert_status "200" "GET /clients/:id → full details"
  assert_json_exists ".data.firstName" "Client has first name"
  assert_json_exists ".data.phone" "Client has phone"

  # ── Update Client ──
  start_section "Update Client"

  api_call PUT "/clients/$TEST_CLIENT_ID" '{"phone":"+966555000001","email":"updated-client@example.com"}'
  assert_status "200" "PUT /clients/:id — update phone/email"

  # ── List & Search ──
  start_section "List & Search"

  api_call GET "/clients"
  assert_status "200" "GET /clients → paginated list"

  api_call GET "/clients?search=TestClient"
  assert_status "200" "GET /clients?search=TestClient → search"

  api_call GET "/clients/all"
  assert_status "200" "GET /clients/all → dropdown list"

  api_call GET "/clients/suggestions?q=Test"
  assert_status_oneof "200|404" "GET /clients/suggestions?q=Test → autocomplete"

  api_call GET "/clients/search?q=TestClient"
  assert_status_oneof "200|404" "GET /clients/search → search endpoint"

  # ── Check Duplicates ──
  start_section "Check Duplicates"

  api_call POST "/clients/check-duplicates" "{\"phone\":\"+966555$SUFFIX\"}"
  assert_status_oneof "200|409" "POST /clients/check-duplicates — by phone"

  # ── Stats ──
  start_section "Client Stats"

  api_call GET "/clients/stats"
  assert_status_oneof "200|404" "GET /clients/stats → statistics"

  # ── Client Sub-resources ──
  start_section "Client History & Activities"

  api_call GET "/clients/$TEST_CLIENT_ID/visits"
  assert_status_oneof "200|404" "GET /clients/:id/visits → visit history"

  api_call GET "/clients/$TEST_CLIENT_ID/balance"
  assert_status_oneof "200|404" "GET /clients/:id/balance → balance"

  api_call GET "/clients/$TEST_CLIENT_ID/activities"
  assert_status_oneof "200|404" "GET /clients/:id/activities → activity log"

  api_call GET "/clients/$TEST_CLIENT_ID/transactions"
  assert_status_oneof "200|404" "GET /clients/:id/transactions → transactions"

  # ── Health ──
  api_call GET "/clients/health"
  assert_status_oneof "200|404" "GET /clients/health → health check"

  # ── Cleanup ──
  start_section "Cleanup"

  api_call DELETE "/clients/$TEST_CLIENT_ID"
  assert_status_oneof "200|204" "DELETE /clients/:id → cleanup"
  CLEANUP_URLS=()
else
  skip_test "Client CRUD" "Could not create test client"
fi

# Export for dependent flows — get an existing client
api_call GET "/clients"
EXISTING_CLIENT_ID=$(echo "$HTTP_BODY" | jq -r '.data[0].id // .data.data[0].id // empty' 2>/dev/null)
echo "$EXISTING_CLIENT_ID" > /tmp/e2e-client-id.txt

end_flow
write_results
exit $FAIL_COUNT
