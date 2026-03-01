#!/bin/bash
# ============================================================
# Flow 7: Client Categories
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/test-utils.sh"

check_backend
login || { echo "Login failed"; exit 1; }
start_flow "Flow 7: Client Categories"

SUFFIX=$(random_suffix)

# ── Create Categories ──
start_section "Create Categories"

api_call POST "/client-categories" "{\"name\": \"VIP $SUFFIX\", \"color\": \"#FFD700\", \"description\": \"VIP clients\"}"
assert_status_oneof "200|201" "POST /client-categories — create VIP"
VIP_ID=$(extract_field ".data.id")

api_call POST "/client-categories" "{\"name\": \"Regular $SUFFIX\", \"color\": \"#4CAF50\", \"description\": \"Regular clients\"}"
assert_status_oneof "200|201" "POST /client-categories — create Regular"
REGULAR_ID=$(extract_field ".data.id")

# ── List ──
start_section "List & Filter"

api_call GET "/client-categories"
assert_status "200" "GET /client-categories → list"

api_call GET "/client-categories?search=VIP"
assert_status_oneof "200|404" "GET /client-categories?search=VIP → filtered"

api_call GET "/client-categories?active=true"
assert_status_oneof "200|404" "GET /client-categories?active=true → active only"

# ── Update ──
start_section "Update"

if [ -n "$VIP_ID" ] && [ "$VIP_ID" != "null" ]; then
  api_call PUT "/client-categories/$VIP_ID" "{\"name\": \"VIP Updated $SUFFIX\", \"color\": \"#FFC107\"}"
  assert_status "200" "PUT /client-categories/:id — update name/color"
fi

# ── Delete (soft) ──
start_section "Delete"

if [ -n "$REGULAR_ID" ] && [ "$REGULAR_ID" != "null" ]; then
  api_call DELETE "/client-categories/$REGULAR_ID"
  assert_status_oneof "200|204" "DELETE /client-categories/:id → soft delete"
fi

if [ -n "$VIP_ID" ] && [ "$VIP_ID" != "null" ]; then
  api_call DELETE "/client-categories/$VIP_ID"
  assert_status_oneof "200|204" "DELETE /client-categories/:id (VIP) → cleanup"
fi

# Verify active filter after deletion
api_call GET "/client-categories?active=true"
assert_status_oneof "200|404" "GET /client-categories?active=true → after delete"

end_flow
write_results
exit $FAIL_COUNT
