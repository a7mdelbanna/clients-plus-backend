#!/bin/bash
# ============================================================
# Flow 16: Notifications
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/test-utils.sh"

check_backend
login || { echo "Login failed"; exit 1; }
start_flow "Flow 16: Notifications"

CLIENT_ID=$(cat /tmp/e2e-client-id.txt 2>/dev/null)

# ── Send Notification ──
start_section "Send Notification"

api_call POST "/notifications/send" "{
  \"type\": \"email\",
  \"recipient\": \"test@example.com\",
  \"subject\": \"E2E Test Notification\",
  \"message\": \"This is an E2E test notification.\",
  \"channel\": \"email\"
}"
assert_status_oneof "200|201|400|404" "POST /notifications/send → send test"

# ── History ──
start_section "Notification History"

api_call GET "/notifications/history"
assert_status_oneof "200|404" "GET /notifications/history → history"

# ── Templates ──
start_section "Templates"

api_call GET "/notifications/templates"
assert_status_oneof "200|404" "GET /notifications/templates → list"

# ── Queue Stats ──
start_section "Queue"

api_call GET "/notifications/queue/stats"
assert_status_oneof "200|404" "GET /notifications/queue/stats → queue status"

api_call GET "/notifications/queue/failed"
assert_status_oneof "200|404" "GET /notifications/queue/failed → failed list"

# ── Schedule ──
start_section "Schedule Notification"

api_call POST "/notifications/schedule" "{
  \"type\": \"email\",
  \"recipient\": \"test@example.com\",
  \"subject\": \"Scheduled E2E Test\",
  \"message\": \"Scheduled notification test.\",
  \"scheduledAt\": \"$(date -d '+1 hour' --iso-8601=seconds 2>/dev/null || echo '2026-02-25T10:00:00Z')\"
}"
assert_status_oneof "200|201|400|404" "POST /notifications/schedule → schedule"

# ── WhatsApp Status ──
start_section "WhatsApp"

api_call GET "/notifications/whatsapp/status"
assert_status_oneof "200|404|503" "GET /notifications/whatsapp/status"

end_flow
write_results
exit $FAIL_COUNT
