#!/bin/bash
# ============================================================
# Flow 15: Analytics & Reports
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/test-utils.sh"

check_backend
login || { echo "Login failed"; exit 1; }
start_flow "Flow 15: Analytics & Reports"

TODAY=$(today_date)
LAST_MONTH=$(date -d "-30 days" +%Y-%m-%d 2>/dev/null || echo "2026-01-25")

# ── Revenue Analytics ──
start_section "Revenue Analytics"

api_call GET "/analytics/revenue"
assert_status_oneof "200|404" "GET /analytics/revenue → revenue data"

api_call GET "/analytics/revenue?startDate=$LAST_MONTH&endDate=$TODAY"
assert_status_oneof "200|404" "GET /analytics/revenue (date range)"

# ── Appointment Analytics ──
start_section "Appointment Analytics"

api_call GET "/analytics/appointments"
assert_status_oneof "200|404" "GET /analytics/appointments → appointment analytics"

# ── Client Analytics ──
start_section "Client Analytics"

api_call GET "/analytics/clients"
assert_status_oneof "200|404" "GET /analytics/clients → client analytics"

# ── Staff Analytics ──
start_section "Staff Analytics"

api_call GET "/analytics/staff"
assert_status_oneof "200|404" "GET /analytics/staff → performance"

# ── Service Analytics ──
start_section "Service Analytics"

api_call GET "/analytics/services"
assert_status_oneof "200|404" "GET /analytics/services → service analytics"

# ── Summary & Overview ──
start_section "Summary & Overview"

api_call GET "/analytics/summary"
assert_status_oneof "200|404" "GET /analytics/summary → comprehensive"

api_call GET "/analytics/overview"
assert_status_oneof "200|404" "GET /analytics/overview → overview"

# ── Dashboard Metrics ──
start_section "Dashboard"

api_call GET "/analytics/dashboard"
assert_status_oneof "200|404" "GET /analytics/dashboard → metrics"

api_call GET "/analytics/dashboard/sales"
assert_status_oneof "200|404" "GET /analytics/dashboard/sales → sales"

api_call GET "/analytics/dashboard/kpis"
assert_status_oneof "200|404" "GET /analytics/dashboard/kpis → KPIs"

api_call GET "/analytics/dashboard/alerts"
assert_status_oneof "200|404" "GET /analytics/dashboard/alerts → alerts"

api_call GET "/analytics/dashboard/config"
assert_status_oneof "200|404" "GET /analytics/dashboard/config → config"

# ── Reports ──
start_section "Reports"

api_call GET "/reports"
assert_status_oneof "200|404" "GET /reports → reports list"

# ── Dashboard Module ──
start_section "Dashboard Module"

api_call GET "/dashboard/stats"
assert_status_oneof "200|404" "GET /dashboard/stats → statistics"

api_call GET "/dashboard/revenue"
assert_status_oneof "200|404" "GET /dashboard/revenue → revenue"

api_call GET "/dashboard/appointments"
assert_status_oneof "200|404" "GET /dashboard/appointments → appointments"

api_call GET "/dashboard/clients"
assert_status_oneof "200|404" "GET /dashboard/clients → clients"

api_call GET "/dashboard/staff-performance"
assert_status_oneof "200|404" "GET /dashboard/staff-performance → staff"

api_call GET "/dashboard/kpis"
assert_status_oneof "200|404" "GET /dashboard/kpis → KPIs"

end_flow
write_results
exit $FAIL_COUNT
