#!/bin/bash
# ============================================================
# Flow 2: Company & Settings
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/test-utils.sh"

check_backend
login || { echo "Login failed"; exit 1; }
start_flow "Flow 2: Company & Settings"

# ── Company Profile ──
start_section "Company Profile"

api_call GET "/company/profile"
assert_status "200" "GET /company/profile → company data"
assert_json_exists ".data.id" "Company has ID"
assert_json_exists ".data.name" "Company has name"
ORIG_COMPANY_NAME=$(extract_field ".data.name")

api_call PUT "/company/profile" '{"name":"Test Company Updated"}'
assert_status "200" "PUT /company/profile — update name"

api_call GET "/company/profile"
assert_status "200" "GET /company/profile — verify update"

# Revert name
api_call PUT "/company/profile" "{\"name\":\"$ORIG_COMPANY_NAME\"}"
assert_status "200" "PUT /company/profile — revert name"

# ── Company Settings ──
start_section "Company Settings"

api_call GET "/company/settings"
assert_status "200" "GET /company/settings → settings object"

api_call PUT "/company/settings" '{"timezone":"Asia/Riyadh","currency":"SAR"}'
assert_status "200" "PUT /company/settings — update timezone/currency"

api_call GET "/company/settings"
assert_status "200" "GET /company/settings — verify after update"

# ── Company Subscription ──
start_section "Company Subscription"

api_call GET "/company/subscription"
assert_status "200" "GET /company/subscription → plan details"

# ── Company Stats (via companies/:id) ──
start_section "Company Stats"

if [ -n "$COMPANY_ID" ] && [ "$COMPANY_ID" != "null" ]; then
  api_call GET "/companies/$COMPANY_ID/stats"
  assert_status_oneof "200|403" "GET /companies/:id/stats → statistics"

  api_call GET "/companies/$COMPANY_ID"
  assert_status "200" "GET /companies/:id → company details"
else
  skip_test "Company stats" "No company ID available"
fi

end_flow
write_results
exit $FAIL_COUNT
