#!/bin/bash
# ============================================================
# Master Test Runner — All E2E Flow Tests
# ============================================================
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

RESULTS_FILE="/tmp/e2e-flow-results.txt"
> "$RESULTS_FILE"  # Clear previous results

echo ""
echo -e "${BOLD}${BLUE}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${BLUE}║   Clients+ E2E Flow Test Suite                        ║${NC}"
echo -e "${BOLD}${BLUE}║   Running all 19 flow tests                           ║${NC}"
echo -e "${BOLD}${BLUE}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# ── Check Prerequisites ──
echo -e "${CYAN}Checking prerequisites...${NC}"

HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3005/health" 2>/dev/null)
if [ "$HEALTH" != "200" ]; then
  echo -e "${RED}ERROR: Backend is not reachable at http://localhost:3005${NC}"
  echo "Please start the backend server first: cd clients-plus-backend && npm run dev"
  exit 1
fi
echo -e "${GREEN}✓${NC} Backend is running"

# Check jq is available
if ! command -v jq &>/dev/null; then
  echo -e "${RED}ERROR: jq is required but not installed${NC}"
  echo "Install: apt install jq / brew install jq / choco install jq"
  exit 1
fi
echo -e "${GREEN}✓${NC} jq is available"

# Check curl is available
if ! command -v curl &>/dev/null; then
  echo -e "${RED}ERROR: curl is required but not installed${NC}"
  exit 1
fi
echo -e "${GREEN}✓${NC} curl is available"
echo ""

# ── Run Flows ──
TOTAL_PASS=0
TOTAL_FAIL=0
TOTAL_SKIP=0
TOTAL_TESTS=0
FLOW_RESULTS=()
START_TIME=$(date +%s)

run_flow() {
  local flow_num="$1"
  local flow_name="$2"
  local flow_script="$SCRIPT_DIR/flow-${flow_num}.sh"

  if [ ! -f "$flow_script" ]; then
    echo -e "${YELLOW}⊘ Skipping flow $flow_num: $flow_name (script not found)${NC}"
    FLOW_RESULTS+=("$flow_name|SKIP|0|0|0|0")
    return
  fi

  bash "$flow_script"
  local exit_code=$?

  # Read results from file
  local last_line
  last_line=$(tail -1 "$RESULTS_FILE" 2>/dev/null)

  if [ -n "$last_line" ]; then
    local f_name f_pass f_fail f_skip f_total
    IFS='|' read -r f_name f_pass f_fail f_skip f_total <<< "$last_line"
    TOTAL_PASS=$((TOTAL_PASS + f_pass))
    TOTAL_FAIL=$((TOTAL_FAIL + f_fail))
    TOTAL_SKIP=$((TOTAL_SKIP + f_skip))
    TOTAL_TESTS=$((TOTAL_TESTS + f_total))

    if [ "$f_fail" -eq 0 ]; then
      FLOW_RESULTS+=("$flow_name|PASS|$f_pass|$f_fail|$f_skip|$f_total")
    else
      FLOW_RESULTS+=("$flow_name|FAIL|$f_pass|$f_fail|$f_skip|$f_total")
    fi
  else
    FLOW_RESULTS+=("$flow_name|UNKNOWN|0|0|0|0")
  fi
}

# Run in dependency order
run_flow "01-auth"         "Auth & User Management"
run_flow "02-company"      "Company & Settings"
run_flow "03-branches"     "Branches"
run_flow "04-staff"        "Staff & Employees"
run_flow "05-services"     "Services"
run_flow "06-clients"      "Clients"
run_flow "07-client-categories" "Client Categories"
run_flow "08-products"     "Products & Inventory"
run_flow "09-appointments" "Appointments"
run_flow "10-invoices"     "Invoices & Payments"
run_flow "11-sales"        "Sales & POS"
run_flow "12-register"     "Cash Register"
run_flow "13-expenses"     "Expenses & Financial"
run_flow "14-contacts"     "Contacts & Communication"
run_flow "15-analytics"    "Analytics & Reports"
run_flow "16-notifications" "Notifications"
run_flow "17-public-booking" "Public Booking"
run_flow "18-upload"       "File Upload"
run_flow "19-frontend-wiring" "Frontend Wiring"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# ── Summary Report ──
echo ""
echo -e "${BOLD}${BLUE}╔═══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${BLUE}║                     FINAL TEST RESULTS                            ║${NC}"
echo -e "${BOLD}${BLUE}╚═══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

printf "  ${BOLD}%-35s %-8s %6s %6s %6s %6s${NC}\n" "Flow" "Status" "Pass" "Fail" "Skip" "Total"
echo "  ─────────────────────────────────────────────────────────────────"

for result in "${FLOW_RESULTS[@]}"; do
  IFS='|' read -r name status pass fail skip total <<< "$result"

  case "$status" in
    PASS)    status_color="${GREEN}PASS${NC}" ;;
    FAIL)    status_color="${RED}FAIL${NC}" ;;
    SKIP)    status_color="${YELLOW}SKIP${NC}" ;;
    *)       status_color="${YELLOW}????${NC}" ;;
  esac

  printf "  %-35s $status_color %6s %6s %6s %6s\n" "$name" "$pass" "$fail" "$skip" "$total"
done

echo "  ─────────────────────────────────────────────────────────────────"
printf "  ${BOLD}%-35s        %6s %6s %6s %6s${NC}\n" "TOTALS" "$TOTAL_PASS" "$TOTAL_FAIL" "$TOTAL_SKIP" "$TOTAL_TESTS"
echo ""

PASS_FLOWS=$(printf '%s\n' "${FLOW_RESULTS[@]}" | grep -c "|PASS|")
FAIL_FLOWS=$(printf '%s\n' "${FLOW_RESULTS[@]}" | grep -c "|FAIL|")
SKIP_FLOWS=$(printf '%s\n' "${FLOW_RESULTS[@]}" | grep -c "|SKIP|")

echo -e "  ${BOLD}Flows:${NC} ${GREEN}$PASS_FLOWS passed${NC} | ${RED}$FAIL_FLOWS failed${NC} | ${YELLOW}$SKIP_FLOWS skipped${NC}"
echo -e "  ${BOLD}Tests:${NC} ${GREEN}$TOTAL_PASS passed${NC} | ${RED}$TOTAL_FAIL failed${NC} | ${YELLOW}$TOTAL_SKIP skipped${NC} | $TOTAL_TESTS total"
echo -e "  ${BOLD}Time:${NC}  ${DURATION}s"
echo ""

if [ "$TOTAL_FAIL" -eq 0 ]; then
  echo -e "  ${GREEN}${BOLD}══════════════════════════════════════${NC}"
  echo -e "  ${GREEN}${BOLD}  ✓ ALL TESTS PASSED!                 ${NC}"
  echo -e "  ${GREEN}${BOLD}══════════════════════════════════════${NC}"
else
  echo -e "  ${RED}${BOLD}══════════════════════════════════════${NC}"
  echo -e "  ${RED}${BOLD}  ✗ $TOTAL_FAIL TESTS FAILED              ${NC}"
  echo -e "  ${RED}${BOLD}══════════════════════════════════════${NC}"
fi
echo ""

# Clean up temp files
rm -f /tmp/e2e-branch-id.txt /tmp/e2e-company-id.txt /tmp/e2e-staff-id.txt \
      /tmp/e2e-service-id.txt /tmp/e2e-service-category-id.txt /tmp/e2e-client-id.txt \
      /tmp/e2e-product-id.txt "$RESULTS_FILE" 2>/dev/null

exit $TOTAL_FAIL
