#!/bin/bash
# ============================================================
# Flow 14: Contacts & Communication
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/test-utils.sh"

check_backend
login || { echo "Login failed"; exit 1; }
start_flow "Flow 14: Contacts & Communication"

SUFFIX=$(random_suffix)
CLIENT_ID=$(cat /tmp/e2e-client-id.txt 2>/dev/null)

# Fallback
if [ -z "$CLIENT_ID" ] || [ "$CLIENT_ID" = "null" ] || [ "$CLIENT_ID" = "" ]; then
  api_call GET "/clients"
  CLIENT_ID=$(echo "$HTTP_BODY" | jq -r '.data[0].id // .data.data[0].id // empty' 2>/dev/null)
fi

# ── Client Activities ──
start_section "Client Activities"

if [ -n "$CLIENT_ID" ] && [ "$CLIENT_ID" != "null" ]; then
  api_call GET "/clients/$CLIENT_ID/activities"
  assert_status_oneof "200|404" "GET /clients/:id/activities → activity log"

  api_call GET "/clients/$CLIENT_ID/visits"
  assert_status_oneof "200|404" "GET /clients/:id/visits → visit history"

  api_call GET "/clients/$CLIENT_ID/transactions"
  assert_status_oneof "200|404" "GET /clients/:id/transactions → transactions"

  api_call GET "/clients/$CLIENT_ID/balance"
  assert_status_oneof "200|404" "GET /clients/:id/balance → balance"
else
  skip_test "Client activities" "No client ID available"
fi

# ── WhatsApp Status ──
start_section "WhatsApp Integration"

api_call GET "/notifications/whatsapp/status"
assert_status_oneof "200|404|503" "GET /notifications/whatsapp/status → WhatsApp status"

# ── Users ──
start_section "Users"

api_call GET "/users/me"
assert_status_oneof "200|404" "GET /users/me → current user"

end_flow
write_results
exit $FAIL_COUNT
