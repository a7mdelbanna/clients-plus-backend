#!/bin/bash
# ============================================================
# Flow 1: Auth & User Management
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/test-utils.sh"

check_backend
start_flow "Flow 1: Auth & User Management"

# ── Login Tests ──
start_section "Login"

api_call_noauth POST "/auth/login" '{"email":"admin@clientsplus.com","password":"demo123456"}'
assert_status "200" "POST /auth/login — valid credentials"
assert_json_exists ".data.tokens.accessToken" "Response contains access token"
assert_json_exists ".data.tokens.refreshToken" "Response contains refresh token"
assert_json_exists ".data.user.id" "Response contains user ID"
assert_json_exists ".data.user.email" "Response contains user email"
assert_json_exists ".data.user.companyId" "Response contains company ID"

# Save tokens
ACCESS_TOKEN=$(extract_field ".data.tokens.accessToken")
REFRESH_TOKEN=$(extract_field ".data.tokens.refreshToken")
USER_ID=$(extract_field ".data.user.id")
COMPANY_ID=$(extract_field ".data.user.companyId")

api_call_noauth POST "/auth/login" '{"email":"admin@clientsplus.com","password":"wrong_password"}'
assert_status "401" "POST /auth/login — invalid password → 401"

api_call_noauth POST "/auth/login" '{"email":"nonexistent@example.com","password":"demo123456"}'
assert_status_oneof "401|404" "POST /auth/login — nonexistent user → 401/404"

api_call_noauth POST "/auth/login" '{}'
assert_status_oneof "400|401|422" "POST /auth/login — empty body → 400/422"

# ── Profile Tests ──
start_section "Profile"

api_call GET "/auth/profile"
assert_status "200" "GET /auth/profile — with valid token"
assert_json_exists ".data.email" "Profile has email"
assert_json_exists ".data.id" "Profile has user ID"

api_call GET "/auth/me"
assert_status "200" "GET /auth/me — alias endpoint"
assert_json_exists ".data.email" "Me endpoint returns email"

# ── Update Profile ──
start_section "Update Profile"

ORIG_FIRST=$(extract_field ".data.firstName")
api_call PUT "/auth/profile" '{"firstName":"TestUpdate"}'
assert_status "200" "PUT /auth/profile — update first name"

api_call GET "/auth/profile"
assert_status "200" "GET /auth/profile — verify after update"

# Revert
api_call PUT "/auth/profile" "{\"firstName\":\"$ORIG_FIRST\"}"
assert_status "200" "PUT /auth/profile — revert first name"

# ── Change Password ──
start_section "Change Password"

api_call POST "/auth/change-password" '{"currentPassword":"demo123456","newPassword":"demo654321"}'
assert_status_oneof "200|204" "POST /auth/change-password — change password"

# Login with new password
api_call_noauth POST "/auth/login" '{"email":"admin@clientsplus.com","password":"demo654321"}'
if [ "$HTTP_CODE" = "200" ]; then
  ACCESS_TOKEN=$(extract_field ".data.tokens.accessToken")
  REFRESH_TOKEN=$(extract_field ".data.tokens.refreshToken")

  # Revert password
  api_call POST "/auth/change-password" '{"currentPassword":"demo654321","newPassword":"demo123456"}'
  assert_status_oneof "200|204" "POST /auth/change-password — revert password"

  # Re-login with original
  api_call_noauth POST "/auth/login" '{"email":"admin@clientsplus.com","password":"demo123456"}'
  ACCESS_TOKEN=$(extract_field ".data.tokens.accessToken")
  REFRESH_TOKEN=$(extract_field ".data.tokens.refreshToken")
else
  skip_test "Password revert" "Password change may not have succeeded — re-login with original"
  api_call_noauth POST "/auth/login" '{"email":"admin@clientsplus.com","password":"demo123456"}'
  ACCESS_TOKEN=$(extract_field ".data.tokens.accessToken")
  REFRESH_TOKEN=$(extract_field ".data.tokens.refreshToken")
fi

# ── Token Refresh ──
start_section "Token Refresh"

api_call_noauth POST "/auth/refresh" "{\"refreshToken\":\"$REFRESH_TOKEN\"}"
assert_status "200" "POST /auth/refresh — refresh token"
if [ "$HTTP_CODE" = "200" ]; then
  NEW_TOKEN=$(extract_field ".data.tokens.accessToken // .data.accessToken")
  if [ -n "$NEW_TOKEN" ] && [ "$NEW_TOKEN" != "null" ]; then
    ACCESS_TOKEN="$NEW_TOKEN"
  fi
fi

api_call_noauth POST "/auth/refresh" '{"refreshToken":"invalid_token_here"}'
assert_status_oneof "401|403" "POST /auth/refresh — invalid refresh token → 401/403"

# ── Verify Token ──
start_section "Token Verification"

api_call GET "/auth/verify"
assert_status "200" "GET /auth/verify — valid token → 200"

# Test with bad token
OLD_TOKEN="$ACCESS_TOKEN"
ACCESS_TOKEN="invalid.token.here"
api_call GET "/auth/verify"
assert_status_oneof "401|403" "GET /auth/verify — invalid token → 401/403"
ACCESS_TOKEN="$OLD_TOKEN"

# ── Auth Health ──
start_section "Auth Health"

api_call_noauth GET "/auth/health"
assert_status "200" "GET /auth/health — health check"

# ── Logout ──
start_section "Logout"

api_call POST "/auth/logout" "{\"refreshToken\":\"$REFRESH_TOKEN\"}"
assert_status_oneof "200|204" "POST /auth/logout"

# Re-login for subsequent flows
api_call_noauth POST "/auth/login" '{"email":"admin@clientsplus.com","password":"demo123456"}'
assert_status "200" "POST /auth/login — re-login after logout"
ACCESS_TOKEN=$(extract_field ".data.tokens.accessToken")

end_flow
write_results
exit $FAIL_COUNT
