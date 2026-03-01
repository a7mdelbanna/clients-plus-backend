#!/bin/bash
# ============================================================
# Flow 19: Frontend Service Wiring Verification
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/test-utils.sh"

start_flow "Flow 19: Frontend Service Wiring Verification"

# Find the frontend directory
FRONTEND_DIR=""
for dir in \
  "C:/Users/ahmed/Documents/Clients+_2.0/clients+_2.0/dashboard" \
  "C:/Users/ahmed/Documents/Clients+_2.0/clients+_2.0/booking-app" \
  "C:/Users/ahmed/Documents/Clients+_2.0/dashboard" \
  "C:/Users/ahmed/Documents/Clients+_2.0/clients+_2.0"; do
  if [ -f "$dir/package.json" ] && [ -f "$dir/tsconfig.json" ]; then
    FRONTEND_DIR="$dir"
    break
  fi
done

if [ -z "$FRONTEND_DIR" ]; then
  echo -e "  ${YELLOW}⚠ Could not locate frontend directory. Checking common locations...${NC}"
  # List what we can find
  ls -la "C:/Users/ahmed/Documents/Clients+_2.0/clients+_2.0/" 2>/dev/null
  skip_test "Frontend checks" "Could not locate frontend directory"
  end_flow
  write_results
  exit 0
fi

echo "  Frontend directory: $FRONTEND_DIR"

# ── TypeScript Compile Check ──
start_section "TypeScript Compilation"

TOTAL_COUNT=$((TOTAL_COUNT + 1))
cd "$FRONTEND_DIR"
TSC_OUTPUT=$(npx tsc --noEmit 2>&1)
TSC_EXIT=$?

if [ $TSC_EXIT -eq 0 ]; then
  echo -e "  ${GREEN}✓${NC} TypeScript compiles without errors"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  ERROR_COUNT=$(echo "$TSC_OUTPUT" | grep -c "error TS" || echo "0")
  echo -e "  ${RED}✗${NC} TypeScript has $ERROR_COUNT errors"
  echo "$TSC_OUTPUT" | grep "error TS" | head -10
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# ── Vite Build Check ──
start_section "Vite Build"

TOTAL_COUNT=$((TOTAL_COUNT + 1))
BUILD_OUTPUT=$(npx vite build 2>&1)
BUILD_EXIT=$?

if [ $BUILD_EXIT -eq 0 ]; then
  echo -e "  ${GREEN}✓${NC} Vite build succeeds"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo -e "  ${RED}✗${NC} Vite build failed"
  echo "$BUILD_OUTPUT" | tail -20
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# ── Check for Firebase-only calls in services ──
start_section "Firebase References Check"

TOTAL_COUNT=$((TOTAL_COUNT + 1))
FIREBASE_REFS=$(grep -rn "firebase\|firestore\|getFirestore\|collection(\|doc(\|getDocs\|getDoc\|addDoc\|updateDoc\|deleteDoc" \
  "$FRONTEND_DIR/src/services/" 2>/dev/null | grep -v "node_modules" | grep -v ".d.ts" | grep -v "firebase.ts" | grep -v "firebaseAuth" || echo "")

if [ -z "$FIREBASE_REFS" ]; then
  echo -e "  ${GREEN}✓${NC} No raw Firebase/Firestore calls found in services"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  REF_COUNT=$(echo "$FIREBASE_REFS" | wc -l)
  echo -e "  ${YELLOW}⚠${NC} Found $REF_COUNT potential Firebase references in services:"
  echo "$FIREBASE_REFS" | head -10
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# ── Check service imports use API client ──
start_section "API Client Usage"

TOTAL_COUNT=$((TOTAL_COUNT + 1))
API_IMPORTS=$(grep -rn "apiClient\|api\.get\|api\.post\|api\.put\|api\.delete\|axiosInstance\|httpClient" \
  "$FRONTEND_DIR/src/services/" 2>/dev/null | grep -v "node_modules" | wc -l || echo "0")

if [ "$API_IMPORTS" -gt 0 ]; then
  echo -e "  ${GREEN}✓${NC} Found $API_IMPORTS API client usage lines in services"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo -e "  ${YELLOW}⚠${NC} No API client imports found — services may not be wired to Express backend"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# ── Check .toDate() remnants ──
start_section "Date Handling"

TOTAL_COUNT=$((TOTAL_COUNT + 1))
TODATE_REFS=$(grep -rn "\.toDate()" "$FRONTEND_DIR/src/" 2>/dev/null | grep -v "node_modules" | grep -v ".d.ts" || echo "")

if [ -z "$TODATE_REFS" ]; then
  echo -e "  ${GREEN}✓${NC} No .toDate() references found (Firebase date handling cleaned)"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  REF_COUNT=$(echo "$TODATE_REFS" | wc -l)
  echo -e "  ${YELLOW}⚠${NC} Found $REF_COUNT .toDate() references (may need migration):"
  echo "$TODATE_REFS" | head -10
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

end_flow
write_results
exit $FAIL_COUNT
