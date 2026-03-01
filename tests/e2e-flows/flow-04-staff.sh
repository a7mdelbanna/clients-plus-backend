#!/bin/bash
# ============================================================
# Flow 4: Staff & Employees
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/test-utils.sh"

check_backend
login || { echo "Login failed"; exit 1; }
start_flow "Flow 4: Staff & Employees"

SUFFIX=$(random_suffix)

# Read shared IDs from prior flows
BRANCH_ID=$(cat /tmp/e2e-branch-id.txt 2>/dev/null)

# ── List Staff ──
start_section "List Staff"

api_call GET "/staff"
assert_status "200" "GET /staff → list all"
EXISTING_STAFF_ID=$(echo "$HTTP_BODY" | jq -r '.data[0].id // .data.data[0].id // empty' 2>/dev/null)

# ── Staff Stats ──
start_section "Staff Stats"

api_call GET "/staff/stats"
assert_status_oneof "200|404" "GET /staff/stats → statistics"

# ── Positions ──
start_section "Positions"

api_call GET "/staff/positions"
assert_status "200" "GET /staff/positions → list"

api_call POST "/staff/positions" "{\"name\": \"Test Position $SUFFIX\", \"description\": \"E2E test position\"}"
assert_status_oneof "200|201" "POST /staff/positions — create"
TEST_POSITION_ID=$(extract_field ".data.id")

if [ -n "$TEST_POSITION_ID" ] && [ "$TEST_POSITION_ID" != "null" ]; then
  api_call PUT "/staff/positions/$TEST_POSITION_ID" "{\"name\": \"Updated Position $SUFFIX\"}"
  assert_status "200" "PUT /staff/positions/:id — update"
fi

# ── Create Staff ──
start_section "Create Staff"

api_call POST "/staff" "{
  \"firstName\": \"Test\",
  \"lastName\": \"Staff$SUFFIX\",
  \"email\": \"teststaff$SUFFIX@example.com\",
  \"phone\": \"+966501$SUFFIX\",
  \"position\": \"Stylist\",
  \"bio\": \"E2E test staff member\"
}"
assert_status_oneof "200|201" "POST /staff — create"
TEST_STAFF_ID=$(extract_field ".data.id")

if [ -n "$TEST_STAFF_ID" ] && [ "$TEST_STAFF_ID" != "null" ]; then
  register_cleanup "/staff/$TEST_STAFF_ID"

  # ── Get Staff ──
  start_section "Get Staff Details"

  api_call GET "/staff/$TEST_STAFF_ID"
  assert_status "200" "GET /staff/:id → details"
  assert_json_exists ".data.firstName" "Staff has first name"

  # ── Update Staff ──
  start_section "Update Staff"

  api_call PUT "/staff/$TEST_STAFF_ID" '{"phone":"+966509999999","bio":"Updated bio for E2E"}'
  assert_status "200" "PUT /staff/:id — update phone/bio"

  # ── Schedule ──
  start_section "Schedule"

  api_call GET "/staff/$TEST_STAFF_ID/schedule"
  assert_status_oneof "200|404" "GET /staff/:id/schedule → work schedule"

  api_call PUT "/staff/$TEST_STAFF_ID/schedule" '{
    "schedule": [
      {"day": "monday", "start": "09:00", "end": "17:00", "isWorking": true},
      {"day": "tuesday", "start": "09:00", "end": "17:00", "isWorking": true},
      {"day": "wednesday", "start": "09:00", "end": "17:00", "isWorking": true},
      {"day": "thursday", "start": "09:00", "end": "17:00", "isWorking": true},
      {"day": "friday", "start": "09:00", "end": "13:00", "isWorking": true},
      {"day": "saturday", "start": "00:00", "end": "00:00", "isWorking": false},
      {"day": "sunday", "start": "00:00", "end": "00:00", "isWorking": false}
    ]
  }'
  assert_status_oneof "200|201" "PUT /staff/:id/schedule — set schedule"

  # ── Working Hours ──
  api_call GET "/staff/$TEST_STAFF_ID/working-hours"
  assert_status_oneof "200|404" "GET /staff/:id/working-hours"

  # ── Availability ──
  start_section "Availability"

  TOMORROW=$(tomorrow_date)
  api_call GET "/staff/$TEST_STAFF_ID/availability?date=$TOMORROW"
  assert_status_oneof "200|404" "GET /staff/:id/availability"

  # ── Assign Branch ──
  start_section "Branch Assignment"

  if [ -n "$BRANCH_ID" ] && [ "$BRANCH_ID" != "null" ] && [ "$BRANCH_ID" != "" ]; then
    api_call POST "/staff/$TEST_STAFF_ID/assign-branch" "{\"branchId\": \"$BRANCH_ID\"}"
    assert_status_oneof "200|201" "POST /staff/:id/assign-branch"

    api_call GET "/staff/by-branch/$BRANCH_ID"
    assert_status "200" "GET /staff/by-branch/:branchId → filtered"
  else
    skip_test "Branch assignment" "No branch ID available"
  fi

  # ── Performance ──
  start_section "Performance"

  api_call GET "/staff/$TEST_STAFF_ID/performance"
  assert_status_oneof "200|404" "GET /staff/:id/performance → metrics"

  api_call GET "/staff/$TEST_STAFF_ID/commission"
  assert_status_oneof "200|404" "GET /staff/:id/commission → commission"

  # ── Cleanup ──
  start_section "Cleanup"

  api_call DELETE "/staff/$TEST_STAFF_ID"
  assert_status_oneof "200|204" "DELETE /staff/:id → cleanup"
  CLEANUP_URLS=()
else
  skip_test "Staff CRUD" "Could not create test staff"
fi

# Clean up position
if [ -n "$TEST_POSITION_ID" ] && [ "$TEST_POSITION_ID" != "null" ]; then
  api_call DELETE "/staff/positions/$TEST_POSITION_ID"
  assert_status_oneof "200|204" "DELETE /staff/positions/:id → cleanup"
fi

# Export for dependent flows
if [ -n "$EXISTING_STAFF_ID" ] && [ "$EXISTING_STAFF_ID" != "null" ]; then
  echo "$EXISTING_STAFF_ID" > /tmp/e2e-staff-id.txt
elif [ -n "$TEST_STAFF_ID" ] && [ "$TEST_STAFF_ID" != "null" ]; then
  echo "$TEST_STAFF_ID" > /tmp/e2e-staff-id.txt
fi

end_flow
write_results
exit $FAIL_COUNT
