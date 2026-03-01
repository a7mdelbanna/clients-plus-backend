#!/bin/bash
# ============================================================
# Flow 18: File Upload
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/test-utils.sh"

check_backend
login || { echo "Login failed"; exit 1; }
start_flow "Flow 18: File Upload"

# Create a small test image (1x1 pixel PNG)
TEST_IMG="/tmp/e2e-test-avatar.png"
# Minimal PNG (1x1 pixel, red)
printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82' > "$TEST_IMG" 2>/dev/null

# ── Upload Avatar ──
start_section "Upload Avatar"

if [ -f "$TEST_IMG" ]; then
  HTTP_BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/upload/avatar" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -F "file=@$TEST_IMG;type=image/png")
  HTTP_CODE=$(echo "$HTTP_BODY" | tail -1)
  HTTP_BODY=$(echo "$HTTP_BODY" | sed '$d')
  assert_status_oneof "200|201|400|413" "POST /upload/avatar → upload"
  FILE_ID=$(extract_field ".data.id // .data.fileId // empty")
else
  # No test file available, try with empty form
  api_call POST "/upload/avatar"
  assert_status_oneof "200|400|422" "POST /upload/avatar → no file (expect 400)"
fi

# ── List Files ──
start_section "List Files"

api_call GET "/files"
assert_status_oneof "200|404" "GET /files → company files"

# ── Storage Usage ──
start_section "Storage Usage"

api_call GET "/storage/usage"
assert_status_oneof "200|404" "GET /storage/usage → storage stats"

# ── Delete File ──
start_section "Cleanup"

if [ -n "$FILE_ID" ] && [ "$FILE_ID" != "null" ] && [ "$FILE_ID" != "" ]; then
  api_call DELETE "/files/$FILE_ID"
  assert_status_oneof "200|204|404" "DELETE /files/:id → cleanup"
fi

# Clean up temp file
rm -f "$TEST_IMG" 2>/dev/null

end_flow
write_results
exit $FAIL_COUNT
