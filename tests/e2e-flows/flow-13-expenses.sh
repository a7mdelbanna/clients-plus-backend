#!/bin/bash
# ============================================================
# Flow 13: Expenses & Financial
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/test-utils.sh"

check_backend
login || { echo "Login failed"; exit 1; }
start_flow "Flow 13: Expenses & Financial"

SUFFIX=$(random_suffix)

# ── Expense Categories ──
start_section "Expense Categories"

api_call GET "/finance/expense-categories"
assert_status_oneof "200|404" "GET /finance/expense-categories → list"
EXISTING_EXP_CAT=$(echo "$HTTP_BODY" | jq -r '.data[0].id // empty' 2>/dev/null)

api_call POST "/finance/expense-categories" "{\"name\": \"Test Expense Cat $SUFFIX\", \"description\": \"E2E test\"}"
assert_status_oneof "200|201" "POST /finance/expense-categories — create"
TEST_EXP_CAT_ID=$(extract_field ".data.id")

EXP_CAT="${TEST_EXP_CAT_ID:-$EXISTING_EXP_CAT}"

# ── Create Expense ──
start_section "Create Expense"

api_call POST "/finance/expenses" "{
  \"categoryId\": \"$EXP_CAT\",
  \"amount\": 250.00,
  \"vendor\": \"Test Vendor $SUFFIX\",
  \"description\": \"E2E test expense\",
  \"date\": \"$(today_date)\",
  \"paymentMethod\": \"cash\"
}"
assert_status_oneof "200|201" "POST /finance/expenses — create"
EXPENSE_ID=$(extract_field ".data.id")

if [ -n "$EXPENSE_ID" ] && [ "$EXPENSE_ID" != "null" ]; then

  # ── List Expenses ──
  start_section "List Expenses"

  api_call GET "/finance/expenses"
  assert_status "200" "GET /finance/expenses → list"

  # ── Approval Workflow ──
  start_section "Approval Workflow"

  api_call POST "/finance/expenses/$EXPENSE_ID/submit"
  assert_status_oneof "200|204|400" "POST /finance/expenses/:id/submit → submit"

  api_call POST "/finance/expenses/$EXPENSE_ID/approve"
  assert_status_oneof "200|204|400" "POST /finance/expenses/:id/approve → approve"

else
  skip_test "Expense CRUD" "Could not create test expense"
fi

# ── Financial Accounts ──
start_section "Financial Accounts"

api_call GET "/finance/accounts"
assert_status_oneof "200|404" "GET /finance/accounts → list"

api_call GET "/finance/accounts/defaults"
assert_status_oneof "200|404" "GET /finance/accounts/defaults → defaults"

api_call POST "/finance/accounts" "{
  \"name\": \"Test Account $SUFFIX\",
  \"type\": \"cash\",
  \"balance\": 1000,
  \"currency\": \"SAR\"
}"
assert_status_oneof "200|201" "POST /finance/accounts — create"
ACCOUNT_ID=$(extract_field ".data.id")

if [ -n "$ACCOUNT_ID" ] && [ "$ACCOUNT_ID" != "null" ]; then
  api_call GET "/finance/accounts/$ACCOUNT_ID"
  assert_status "200" "GET /finance/accounts/:id → details"

  api_call GET "/finance/accounts/$ACCOUNT_ID/balance"
  assert_status_oneof "200|404" "GET /finance/accounts/:id/balance"

  api_call DELETE "/finance/accounts/$ACCOUNT_ID"
  assert_status_oneof "200|204" "DELETE /finance/accounts/:id → cleanup"
fi

# ── Financial Transactions ──
start_section "Transactions"

api_call GET "/finance/transactions"
assert_status_oneof "200|404" "GET /finance/transactions → list"

# ── Budget ──
start_section "Budget"

api_call POST "/finance/budgets" "{
  \"categoryId\": \"$EXP_CAT\",
  \"amount\": 5000,
  \"period\": \"monthly\",
  \"name\": \"Test Budget $SUFFIX\"
}"
assert_status_oneof "200|201|400" "POST /finance/budgets — create"

# ── Reports ──
start_section "Financial Reports"

api_call GET "/finance/reports/profit-loss"
assert_status_oneof "200|404" "GET /finance/reports/profit-loss → P&L"

api_call GET "/finance/reports/cash-flow"
assert_status_oneof "200|404" "GET /finance/reports/cash-flow → cash flow"

# ── Summary ──
api_call GET "/finance/summary"
assert_status_oneof "200|404" "GET /finance/summary → dashboard"

end_flow
write_results
exit $FAIL_COUNT
