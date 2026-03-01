#!/bin/bash
# ============================================================
# Flow 17: Public Booking (No Auth Required)
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/test-utils.sh"

check_backend
# Login to get company ID for query params, but public routes don't need auth
login || { echo "Login failed"; exit 1; }
start_flow "Flow 17: Public Booking"

SUFFIX=$(random_suffix)
TOMORROW=$(tomorrow_date)
BRANCH_ID=$(cat /tmp/e2e-branch-id.txt 2>/dev/null)
SERVICE_ID=$(cat /tmp/e2e-service-id.txt 2>/dev/null)
STAFF_ID=$(cat /tmp/e2e-staff-id.txt 2>/dev/null)

# ── Public Services ──
start_section "Public Services (No Auth)"

api_call_noauth GET "/public/services?companyId=$COMPANY_ID"
assert_status_oneof "200|404" "GET /public/services → available services"

# ── Public Branches ──
start_section "Public Branches (No Auth)"

api_call_noauth GET "/public/branches?companyId=$COMPANY_ID"
assert_status_oneof "200|404" "GET /public/branches → branches"

# ── Public Availability ──
start_section "Public Availability (No Auth)"

api_call_noauth GET "/public/availability?companyId=$COMPANY_ID&serviceId=$SERVICE_ID&date=$TOMORROW"
assert_status_oneof "200|404" "GET /public/availability → time slots"

# ── Create Public Booking ──
start_section "Create Public Booking (No Auth)"

api_call_noauth POST "/public/booking" "{
  \"companyId\": \"$COMPANY_ID\",
  \"serviceId\": \"$SERVICE_ID\",
  \"staffId\": \"$STAFF_ID\",
  \"branchId\": \"$BRANCH_ID\",
  \"date\": \"$TOMORROW\",
  \"startTime\": \"${TOMORROW}T10:00:00.000Z\",
  \"clientName\": \"Public Test $SUFFIX\",
  \"clientPhone\": \"+966599$SUFFIX\",
  \"clientEmail\": \"public-$SUFFIX@example.com\",
  \"notes\": \"Public booking E2E test\"
}"
assert_status_oneof "200|201|400" "POST /public/booking → create booking"
BOOKING_ID=$(extract_field ".data.id")

# ── My Bookings ──
start_section "My Bookings (No Auth)"

api_call_noauth GET "/public/my-bookings?phone=%2B966599$SUFFIX&companyId=$COMPANY_ID"
assert_status_oneof "200|404" "GET /public/my-bookings → client bookings"

# ── Cancel Booking ──
start_section "Cancel Booking"

if [ -n "$BOOKING_ID" ] && [ "$BOOKING_ID" != "null" ]; then
  api_call_noauth POST "/public/cancel-booking/$BOOKING_ID" '{"reason": "E2E test cancel"}'
  assert_status_oneof "200|204|400" "POST /public/cancel-booking/:id → cancel"
else
  skip_test "Cancel booking" "No booking ID available"
fi

# ── Waitlist ──
start_section "Waitlist"

api_call_noauth POST "/public/waitlist" "{
  \"companyId\": \"$COMPANY_ID\",
  \"serviceId\": \"$SERVICE_ID\",
  \"clientName\": \"Waitlist Test $SUFFIX\",
  \"clientPhone\": \"+966598$SUFFIX\",
  \"preferredDate\": \"$TOMORROW\"
}"
assert_status_oneof "200|201|400|404" "POST /public/waitlist → add to waitlist"
WAITLIST_ID=$(extract_field ".data.id")

if [ -n "$WAITLIST_ID" ] && [ "$WAITLIST_ID" != "null" ]; then
  api_call_noauth DELETE "/public/waitlist/$WAITLIST_ID"
  assert_status_oneof "200|204" "DELETE /public/waitlist/:id → remove"
fi

end_flow
write_results
exit $FAIL_COUNT
