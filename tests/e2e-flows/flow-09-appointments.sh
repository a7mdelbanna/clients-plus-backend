#!/bin/bash
# ============================================================
# Flow 9: Appointments
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/test-utils.sh"

check_backend
login || { echo "Login failed"; exit 1; }
start_flow "Flow 9: Appointments"

SUFFIX=$(random_suffix)
TOMORROW=$(tomorrow_date)

# Load prereq IDs
CLIENT_ID=$(cat /tmp/e2e-client-id.txt 2>/dev/null)
STAFF_ID=$(cat /tmp/e2e-staff-id.txt 2>/dev/null)
SERVICE_ID=$(cat /tmp/e2e-service-id.txt 2>/dev/null)
BRANCH_ID=$(cat /tmp/e2e-branch-id.txt 2>/dev/null)

# Fallback: fetch IDs if not available
if [ -z "$CLIENT_ID" ] || [ "$CLIENT_ID" = "null" ] || [ "$CLIENT_ID" = "" ]; then
  api_call GET "/clients"
  CLIENT_ID=$(echo "$HTTP_BODY" | jq -r '.data[0].id // .data.data[0].id // empty' 2>/dev/null)
fi
if [ -z "$STAFF_ID" ] || [ "$STAFF_ID" = "null" ] || [ "$STAFF_ID" = "" ]; then
  api_call GET "/staff"
  STAFF_ID=$(echo "$HTTP_BODY" | jq -r '.data[0].id // .data.data[0].id // empty' 2>/dev/null)
fi
if [ -z "$SERVICE_ID" ] || [ "$SERVICE_ID" = "null" ] || [ "$SERVICE_ID" = "" ]; then
  api_call GET "/services"
  SERVICE_ID=$(echo "$HTTP_BODY" | jq -r '.data[0].id // .data.data[0].id // empty' 2>/dev/null)
fi
if [ -z "$BRANCH_ID" ] || [ "$BRANCH_ID" = "null" ] || [ "$BRANCH_ID" = "" ]; then
  api_call GET "/companies/$COMPANY_ID/branches"
  BRANCH_ID=$(echo "$HTTP_BODY" | jq -r '.data[0].id // empty' 2>/dev/null)
fi

echo "  Prereqs: client=$CLIENT_ID staff=$STAFF_ID service=$SERVICE_ID branch=$BRANCH_ID"

# ── Availability ──
start_section "Availability"

if [ -n "$STAFF_ID" ] && [ "$STAFF_ID" != "null" ]; then
  api_call GET "/appointments/availability?staffId=$STAFF_ID&date=$TOMORROW"
  assert_status_oneof "200|404" "GET /appointments/availability → slots"
fi

# ── Create Appointment ──
start_section "Create Appointment"

APPT_BODY="{
  \"clientId\": \"$CLIENT_ID\",
  \"staffId\": \"$STAFF_ID\",
  \"serviceId\": \"$SERVICE_ID\",
  \"branchId\": \"$BRANCH_ID\",
  \"date\": \"$TOMORROW\",
  \"startTime\": \"${TOMORROW}T10:00:00.000Z\",
  \"endTime\": \"${TOMORROW}T11:00:00.000Z\",
  \"notes\": \"E2E test appointment $SUFFIX\"
}"

api_call POST "/appointments" "$APPT_BODY"
assert_status_oneof "200|201" "POST /appointments — create"
APPT_ID=$(extract_field ".data.id")

if [ -n "$APPT_ID" ] && [ "$APPT_ID" != "null" ]; then
  register_cleanup "/appointments/$APPT_ID"

  # ── Get Appointment ──
  start_section "Get Appointment"

  api_call GET "/appointments/$APPT_ID"
  assert_status "200" "GET /appointments/:id → details"
  assert_json_exists ".data.id" "Appointment has ID"

  # ── Update Appointment ──
  start_section "Update Appointment"

  api_call PUT "/appointments/$APPT_ID" '{"notes": "Updated notes for E2E test"}'
  assert_status "200" "PUT /appointments/:id — update notes"

  # ── Status Workflow: confirm → check-in → start → complete ──
  start_section "Status Workflow"

  api_call POST "/appointments/$APPT_ID/confirm"
  assert_status_oneof "200|204" "POST /appointments/:id/confirm → confirmed"

  api_call POST "/appointments/$APPT_ID/check-in"
  assert_status_oneof "200|204" "POST /appointments/:id/check-in → arrived"

  api_call POST "/appointments/$APPT_ID/start"
  assert_status_oneof "200|204" "POST /appointments/:id/start → in_progress"

  api_call POST "/appointments/$APPT_ID/complete"
  assert_status_oneof "200|204" "POST /appointments/:id/complete → completed"

  # ── List Appointments ──
  start_section "List Appointments"

  api_call GET "/appointments"
  assert_status "200" "GET /appointments → list"

  # ── Calendar View ──
  start_section "Calendar"

  TODAY=$(today_date)
  NEXT_WEEK=$(date -d "+7 days" +%Y-%m-%d 2>/dev/null || echo "2026-03-03")
  api_call GET "/appointments/calendar?start=$TODAY&end=$NEXT_WEEK"
  assert_status_oneof "200|404" "GET /appointments/calendar → calendar view"

  # ── No-Show Flow ──
  start_section "No-Show Flow"

  api_call POST "/appointments" "$APPT_BODY"
  NOSHOW_ID=$(extract_field ".data.id")

  if [ -n "$NOSHOW_ID" ] && [ "$NOSHOW_ID" != "null" ]; then
    api_call POST "/appointments/$NOSHOW_ID/no-show"
    assert_status_oneof "200|204" "POST /appointments/:id/no-show → no-show status"
    register_cleanup "/appointments/$NOSHOW_ID"
  else
    skip_test "No-show flow" "Could not create second appointment"
  fi

  # ── Reschedule Flow ──
  start_section "Reschedule"

  APPT_BODY_3="{
    \"clientId\": \"$CLIENT_ID\",
    \"staffId\": \"$STAFF_ID\",
    \"serviceId\": \"$SERVICE_ID\",
    \"branchId\": \"$BRANCH_ID\",
    \"date\": \"$TOMORROW\",
    \"startTime\": \"${TOMORROW}T14:00:00.000Z\",
    \"endTime\": \"${TOMORROW}T15:00:00.000Z\",
    \"notes\": \"E2E reschedule test\"
  }"

  api_call POST "/appointments" "$APPT_BODY_3"
  RESCHED_ID=$(extract_field ".data.id")

  if [ -n "$RESCHED_ID" ] && [ "$RESCHED_ID" != "null" ]; then
    DAY_AFTER=$(date -d "+2 days" +%Y-%m-%d 2>/dev/null || echo "2026-02-26")
    api_call POST "/appointments/$RESCHED_ID/reschedule" "{
      \"date\": \"$DAY_AFTER\",
      \"startTime\": \"${DAY_AFTER}T10:00:00.000Z\",
      \"endTime\": \"${DAY_AFTER}T11:00:00.000Z\"
    }"
    assert_status_oneof "200|204" "POST /appointments/:id/reschedule → new date"
    register_cleanup "/appointments/$RESCHED_ID"
  else
    skip_test "Reschedule" "Could not create appointment for reschedule"
  fi

  # ── Client History ──
  start_section "Client & Staff Views"

  if [ -n "$CLIENT_ID" ] && [ "$CLIENT_ID" != "null" ]; then
    api_call GET "/appointments/clients/$CLIENT_ID/history"
    assert_status_oneof "200|404" "GET /appointments/clients/:clientId/history"
  fi

  if [ -n "$STAFF_ID" ] && [ "$STAFF_ID" != "null" ]; then
    api_call GET "/appointments/staff/$STAFF_ID/schedule"
    assert_status_oneof "200|404" "GET /appointments/staff/:staffId/schedule"
  fi

  # ── Analytics ──
  start_section "Analytics"

  api_call GET "/appointments/analytics"
  assert_status_oneof "200|404" "GET /appointments/analytics → analytics data"

  api_call GET "/appointments/conflicts"
  assert_status_oneof "200|404" "GET /appointments/conflicts → conflicts"

  # ── Cleanup ──
  run_cleanup
else
  skip_test "Appointment CRUD" "Could not create test appointment (check prereqs)"
fi

end_flow
write_results
exit $FAIL_COUNT
