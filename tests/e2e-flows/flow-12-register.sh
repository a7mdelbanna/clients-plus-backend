#!/bin/bash
# ============================================================
# Flow 12: Cash Register
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/test-utils.sh"

check_backend
login || { echo "Login failed"; exit 1; }
start_flow "Flow 12: Cash Register"

SUFFIX=$(random_suffix)
BRANCH_ID=$(cat /tmp/e2e-branch-id.txt 2>/dev/null)

# ── Open Register ──
start_section "Open Register"

api_call POST "/register/open" "{
  \"openingBalance\": 500,
  \"branchId\": \"$BRANCH_ID\",
  \"notes\": \"E2E test shift $SUFFIX\"
}"
assert_status_oneof "200|201" "POST /register/open — open shift"
REGISTER_ID=$(extract_field ".data.id")

if [ -n "$REGISTER_ID" ] && [ "$REGISTER_ID" != "null" ]; then

  # ── Current Shift ──
  start_section "Current Shift"

  api_call GET "/register/current"
  assert_status "200" "GET /register/current → active shift"

  # ── Cash Drop ──
  start_section "Cash Operations"

  api_call POST "/register/$REGISTER_ID/cash-drop" '{
    "amount": 200,
    "reason": "E2E cash drop test"
  }'
  assert_status_oneof "200|201" "POST /register/:id/cash-drop — record"

  # ── Adjustment ──
  api_call POST "/register/$REGISTER_ID/adjustment" '{
    "amount": -50,
    "reason": "E2E adjustment test"
  }'
  assert_status_oneof "200|201" "POST /register/:id/adjustment — record"

  # ── Summary ──
  start_section "Summary"

  api_call GET "/register/$REGISTER_ID/summary"
  assert_status "200" "GET /register/:id/summary → shift summary"

  # ── Close Register ──
  start_section "Close Register"

  api_call POST "/register/$REGISTER_ID/close" '{
    "closingBalance": 250,
    "notes": "E2E close shift"
  }'
  assert_status_oneof "200|201" "POST /register/:id/close — close shift"

  # ── History ──
  start_section "History"

  api_call GET "/register/history"
  assert_status "200" "GET /register/history → shift history"

else
  skip_test "Register CRUD" "Could not open register"
fi

end_flow
write_results
exit $FAIL_COUNT
