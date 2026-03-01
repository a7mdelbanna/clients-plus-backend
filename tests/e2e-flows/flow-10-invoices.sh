#!/bin/bash
# ============================================================
# Flow 10: Invoices & Payments
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/test-utils.sh"

check_backend
login || { echo "Login failed"; exit 1; }
start_flow "Flow 10: Invoices & Payments"

SUFFIX=$(random_suffix)
CLIENT_ID=$(cat /tmp/e2e-client-id.txt 2>/dev/null)
SERVICE_ID=$(cat /tmp/e2e-service-id.txt 2>/dev/null)

# Fallback
if [ -z "$CLIENT_ID" ] || [ "$CLIENT_ID" = "null" ] || [ "$CLIENT_ID" = "" ]; then
  api_call GET "/clients"
  CLIENT_ID=$(echo "$HTTP_BODY" | jq -r '.data[0].id // .data.data[0].id // empty' 2>/dev/null)
fi

# ── Create Invoice ──
start_section "Create Invoice"

api_call POST "/invoices" "{
  \"clientId\": \"$CLIENT_ID\",
  \"items\": [
    {\"description\": \"Test Service\", \"quantity\": 1, \"unitPrice\": 200, \"total\": 200},
    {\"description\": \"Test Product\", \"quantity\": 2, \"unitPrice\": 50, \"total\": 100}
  ],
  \"subtotal\": 300,
  \"tax\": 45,
  \"total\": 345,
  \"notes\": \"E2E test invoice $SUFFIX\",
  \"dueDate\": \"$(date -d '+30 days' +%Y-%m-%d 2>/dev/null || echo '2026-03-26')\"
}"
assert_status_oneof "200|201" "POST /invoices — create"
INVOICE_ID=$(extract_field ".data.id")

if [ -n "$INVOICE_ID" ] && [ "$INVOICE_ID" != "null" ]; then
  register_cleanup "/invoices/$INVOICE_ID"

  # ── Get Invoice ──
  start_section "Get Invoice"

  api_call GET "/invoices/$INVOICE_ID"
  assert_status "200" "GET /invoices/:id → details"
  assert_json_exists ".data.id" "Invoice has ID"

  # ── Update Invoice ──
  start_section "Update Invoice"

  api_call PUT "/invoices/$INVOICE_ID" '{"notes": "Updated E2E invoice notes"}'
  assert_status "200" "PUT /invoices/:id — update"

  # ── Send Invoice ──
  start_section "Send Invoice"

  api_call POST "/invoices/$INVOICE_ID/send"
  assert_status_oneof "200|204|400" "POST /invoices/:id/send → mark sent"

  # ── Record Payments ──
  start_section "Payments"

  api_call POST "/invoices/$INVOICE_ID/payments" '{
    "amount": 200,
    "method": "cash",
    "notes": "Partial payment"
  }'
  assert_status_oneof "200|201" "POST /invoices/:id/payments — partial payment"

  api_call POST "/invoices/$INVOICE_ID/payments" '{
    "amount": 145,
    "method": "card",
    "notes": "Remaining balance"
  }'
  assert_status_oneof "200|201" "POST /invoices/:id/payments — remaining payment"

  # ── Payment History ──
  api_call GET "/invoices/$INVOICE_ID/payments"
  assert_status "200" "GET /invoices/:id/payments → payment history"

  # ── Mark Paid ──
  api_call POST "/invoices/$INVOICE_ID/mark-paid"
  assert_status_oneof "200|204|400" "POST /invoices/:id/mark-paid → fully paid"

  # ── List Invoices ──
  start_section "List & Stats"

  api_call GET "/invoices"
  assert_status "200" "GET /invoices → list"

  api_call GET "/invoices/summary"
  assert_status_oneof "200|404" "GET /invoices/summary → summary stats"

  api_call GET "/invoices/outstanding"
  assert_status_oneof "200|404" "GET /invoices/outstanding → unpaid"

  api_call GET "/invoices/overdue"
  assert_status_oneof "200|404" "GET /invoices/overdue → overdue"

  api_call GET "/invoices/analytics"
  assert_status_oneof "200|404" "GET /invoices/analytics → analytics"

  # ── Duplicate ──
  start_section "Duplicate Invoice"

  api_call POST "/invoices/$INVOICE_ID/duplicate"
  assert_status_oneof "200|201" "POST /invoices/:id/duplicate → duplicate"
  DUP_INVOICE_ID=$(extract_field ".data.id")

  if [ -n "$DUP_INVOICE_ID" ] && [ "$DUP_INVOICE_ID" != "null" ]; then
    # Cancel the duplicate
    api_call POST "/invoices/$DUP_INVOICE_ID/cancel"
    assert_status_oneof "200|204" "POST /invoices/:id/cancel → cancelled"

    api_call DELETE "/invoices/$DUP_INVOICE_ID"
    assert_status_oneof "200|204|400" "DELETE duplicate invoice → cleanup"
  fi

  # ── PDF ──
  start_section "PDF Generation"

  api_call GET "/invoices/$INVOICE_ID/pdf"
  assert_status_oneof "200|404|501" "GET /invoices/:id/pdf → generate PDF"

  # ── Cleanup ──
  start_section "Cleanup"

  api_call DELETE "/invoices/$INVOICE_ID"
  assert_status_oneof "200|204|400" "DELETE /invoices/:id → cleanup"
  CLEANUP_URLS=()
else
  skip_test "Invoice CRUD" "Could not create test invoice"
fi

end_flow
write_results
exit $FAIL_COUNT
