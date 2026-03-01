#!/bin/bash
# ============================================================
# Flow 11: Sales & POS
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/test-utils.sh"

check_backend
login || { echo "Login failed"; exit 1; }
start_flow "Flow 11: Sales & POS"

SUFFIX=$(random_suffix)
CLIENT_ID=$(cat /tmp/e2e-client-id.txt 2>/dev/null)
PRODUCT_ID=$(cat /tmp/e2e-product-id.txt 2>/dev/null)
SERVICE_ID=$(cat /tmp/e2e-service-id.txt 2>/dev/null)
STAFF_ID=$(cat /tmp/e2e-staff-id.txt 2>/dev/null)

# Fallbacks
if [ -z "$CLIENT_ID" ] || [ "$CLIENT_ID" = "null" ] || [ "$CLIENT_ID" = "" ]; then
  api_call GET "/clients"
  CLIENT_ID=$(echo "$HTTP_BODY" | jq -r '.data[0].id // .data.data[0].id // empty' 2>/dev/null)
fi

# ── Create Sale ──
start_section "Create Sale"

api_call POST "/sales" "{
  \"clientId\": \"$CLIENT_ID\",
  \"staffId\": \"$STAFF_ID\",
  \"items\": [
    {\"type\": \"service\", \"name\": \"Test Service\", \"quantity\": 1, \"price\": 150, \"total\": 150}
  ],
  \"subtotal\": 150,
  \"tax\": 22.50,
  \"total\": 172.50,
  \"paymentMethod\": \"cash\",
  \"amountPaid\": 172.50,
  \"notes\": \"E2E test sale $SUFFIX\"
}"
assert_status_oneof "200|201" "POST /sales — create"
SALE_ID=$(extract_field ".data.id")

if [ -n "$SALE_ID" ] && [ "$SALE_ID" != "null" ]; then

  # ── Get Sale ──
  start_section "Get Sale"

  api_call GET "/sales/$SALE_ID"
  assert_status "200" "GET /sales/:id → details"
  assert_json_exists ".data.id" "Sale has ID"

  # ── List Sales ──
  start_section "List Sales"

  api_call GET "/sales"
  assert_status "200" "GET /sales → list"

  # ── Daily Summary ──
  start_section "Daily Summary"

  api_call GET "/sales/daily-summary"
  assert_status_oneof "200|404" "GET /sales/daily-summary → today's summary"

  # ── Receipt ──
  start_section "Receipt"

  api_call POST "/sales/$SALE_ID/receipt"
  assert_status_oneof "200|201|404" "POST /sales/:id/receipt → generate receipt"

  # ── Refund ──
  start_section "Refund"

  api_call POST "/sales/$SALE_ID/refund" '{
    "reason": "E2E test refund",
    "amount": 172.50
  }'
  assert_status_oneof "200|201" "POST /sales/:id/refund → process refund"

  # ── Discount ──
  start_section "Discount"

  api_call POST "/sales/discount" '{
    "type": "percentage",
    "value": 10,
    "reason": "E2E test discount"
  }'
  assert_status_oneof "200|201|400|404" "POST /sales/discount → apply discount"

else
  skip_test "Sales CRUD" "Could not create test sale"
fi

end_flow
write_results
exit $FAIL_COUNT
