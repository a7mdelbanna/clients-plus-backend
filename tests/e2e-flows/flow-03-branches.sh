#!/bin/bash
# ============================================================
# Flow 3: Branches
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/test-utils.sh"

check_backend
login || { echo "Login failed"; exit 1; }
start_flow "Flow 3: Branches"

SUFFIX=$(random_suffix)

# ── List Branches ──
start_section "List Branches"

api_call GET "/companies/$COMPANY_ID/branches"
assert_status "200" "GET /companies/:companyId/branches → list"
EXISTING_BRANCH_COUNT=$(echo "$HTTP_BODY" | jq '.data | length' 2>/dev/null || echo "0")
# Try to grab an existing branch ID
EXISTING_BRANCH_ID=$(echo "$HTTP_BODY" | jq -r '.data[0].id // empty' 2>/dev/null)

# ── Create Branch ──
start_section "Create Branch"

api_call POST "/companies/$COMPANY_ID/branches" "{
  \"name\": \"Test Branch $SUFFIX\",
  \"address\": \"123 Test Street\",
  \"phone\": \"+966500000$SUFFIX\",
  \"email\": \"test-branch-$SUFFIX@example.com\"
}"
assert_status_oneof "200|201" "POST /companies/:companyId/branches — create"
TEST_BRANCH_ID=$(extract_field ".data.id")

if [ -n "$TEST_BRANCH_ID" ] && [ "$TEST_BRANCH_ID" != "null" ]; then
  register_cleanup "/companies/$COMPANY_ID/branches/$TEST_BRANCH_ID"

  # ── Get Single Branch ──
  start_section "Get Branch"

  api_call GET "/companies/$COMPANY_ID/branches/$TEST_BRANCH_ID"
  assert_status "200" "GET /companies/:companyId/branches/:id → single"
  assert_json_contains ".data.name" "Test Branch" "Branch name matches"

  # ── Update Branch ──
  start_section "Update Branch"

  api_call PUT "/companies/$COMPANY_ID/branches/$TEST_BRANCH_ID" "{\"name\": \"Updated Branch $SUFFIX\"}"
  assert_status "200" "PUT /companies/:companyId/branches/:id — update name"

  api_call GET "/companies/$COMPANY_ID/branches/$TEST_BRANCH_ID"
  assert_json_contains ".data.name" "Updated Branch" "Name updated correctly"

  # ── Operating Hours ──
  start_section "Operating Hours"

  api_call PUT "/companies/$COMPANY_ID/branches/$TEST_BRANCH_ID/operating-hours" '{
    "hours": [
      {"day": "monday", "open": "09:00", "close": "18:00", "isOpen": true},
      {"day": "tuesday", "open": "09:00", "close": "18:00", "isOpen": true},
      {"day": "wednesday", "open": "09:00", "close": "18:00", "isOpen": true},
      {"day": "thursday", "open": "09:00", "close": "18:00", "isOpen": true},
      {"day": "friday", "open": "09:00", "close": "18:00", "isOpen": true},
      {"day": "saturday", "open": "10:00", "close": "16:00", "isOpen": true},
      {"day": "sunday", "open": "00:00", "close": "00:00", "isOpen": false}
    ]
  }'
  assert_status_oneof "200|201" "PUT operating-hours — set hours"

  api_call GET "/companies/$COMPANY_ID/branches/$TEST_BRANCH_ID/operating-hours"
  assert_status "200" "GET operating-hours → verify"

  # ── Set Default ──
  start_section "Set Default"

  api_call POST "/companies/$COMPANY_ID/branches/$TEST_BRANCH_ID/set-default"
  assert_status_oneof "200|204" "POST set-default → set branch as default"

  # Restore original default if we have one
  if [ -n "$EXISTING_BRANCH_ID" ] && [ "$EXISTING_BRANCH_ID" != "null" ]; then
    api_call POST "/companies/$COMPANY_ID/branches/$EXISTING_BRANCH_ID/set-default"
  fi

  # ── Branch Count ──
  start_section "Branch Count"

  api_call GET "/companies/$COMPANY_ID/branches/count"
  assert_status_oneof "200|404" "GET /branches/count → count"

  # ── Branch Settings (via /branches/:id path) ──
  start_section "Branch Settings"

  api_call GET "/branches/$TEST_BRANCH_ID/settings"
  assert_status_oneof "200|404" "GET /branches/:id/settings"

  # ── Cleanup ──
  start_section "Cleanup"

  api_call DELETE "/companies/$COMPANY_ID/branches/$TEST_BRANCH_ID"
  assert_status_oneof "200|204" "DELETE branch → cleanup"
  CLEANUP_URLS=() # Already cleaned
else
  skip_test "Branch CRUD" "Could not create test branch"
fi

# Export for dependent flows
echo "$EXISTING_BRANCH_ID" > /tmp/e2e-branch-id.txt
echo "$COMPANY_ID" > /tmp/e2e-company-id.txt

end_flow
write_results
exit $FAIL_COUNT
