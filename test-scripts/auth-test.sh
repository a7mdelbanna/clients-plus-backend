#!/bin/bash

# Authentication API Tests
# Tests the authentication endpoints used by the frontend

API_URL="http://localhost:4000/api/v1"
TEST_EMAIL="test_$(date +%s)@example.com"
TEST_PASSWORD="Test123!@#"
TOKEN=""

echo "================================"
echo "Authentication API Tests"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Register new user with company
echo -e "\n${YELLOW}Test 1: Register new user with company${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$TEST_EMAIL'",
    "password": "'$TEST_PASSWORD'",
    "firstName": "Test",
    "lastName": "User",
    "companyName": "Test Company",
    "phone": "+201234567890"
  }')

if echo "$REGISTER_RESPONSE" | grep -q "token"; then
  echo -e "${GREEN}✓ Registration successful${NC}"
  TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*' | sed 's/"token":"//')
  echo "Token received: ${TOKEN:0:20}..."
else
  echo -e "${RED}✗ Registration failed${NC}"
  echo "Response: $REGISTER_RESPONSE"
fi

# Test 2: Login with credentials
echo -e "\n${YELLOW}Test 2: Login with credentials${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$TEST_EMAIL'",
    "password": "'$TEST_PASSWORD'"
  }')

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
  echo -e "${GREEN}✓ Login successful${NC}"
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | sed 's/"token":"//')
else
  echo -e "${RED}✗ Login failed${NC}"
  echo "Response: $LOGIN_RESPONSE"
fi

# Test 3: Get user profile (testing both endpoints)
echo -e "\n${YELLOW}Test 3: Get user profile${NC}"

# Try /auth/profile (backend provides)
echo "Testing /auth/profile endpoint..."
PROFILE_RESPONSE=$(curl -s -X GET "$API_URL/auth/profile" \
  -H "Authorization: Bearer $TOKEN")

if echo "$PROFILE_RESPONSE" | grep -q "email"; then
  echo -e "${GREEN}✓ Profile endpoint works${NC}"
else
  echo -e "${RED}✗ Profile endpoint failed${NC}"
  echo "Response: $PROFILE_RESPONSE"
fi

# Try /auth/me (frontend expects)
echo "Testing /auth/me endpoint..."
ME_RESPONSE=$(curl -s -X GET "$API_URL/auth/me" \
  -H "Authorization: Bearer $TOKEN")

if echo "$ME_RESPONSE" | grep -q "email"; then
  echo -e "${GREEN}✓ Me endpoint works${NC}"
else
  echo -e "${YELLOW}⚠ Me endpoint not found (frontend expects this)${NC}"
  echo "Response: $ME_RESPONSE"
fi

# Test 4: Refresh token
echo -e "\n${YELLOW}Test 4: Refresh token${NC}"
REFRESH_RESPONSE=$(curl -s -X POST "$API_URL/auth/refresh" \
  -H "Authorization: Bearer $TOKEN")

if echo "$REFRESH_RESPONSE" | grep -q "token"; then
  echo -e "${GREEN}✓ Token refresh successful${NC}"
else
  echo -e "${RED}✗ Token refresh failed${NC}"
  echo "Response: $REFRESH_RESPONSE"
fi

# Test 5: Logout
echo -e "\n${YELLOW}Test 5: Logout${NC}"
LOGOUT_RESPONSE=$(curl -s -X POST "$API_URL/auth/logout" \
  -H "Authorization: Bearer $TOKEN")

if echo "$LOGOUT_RESPONSE" | grep -q "success"; then
  echo -e "${GREEN}✓ Logout successful${NC}"
else
  echo -e "${YELLOW}⚠ Logout endpoint may not be implemented${NC}"
  echo "Response: $LOGOUT_RESPONSE"
fi

# Test 6: Verify token is invalid after logout
echo -e "\n${YELLOW}Test 6: Verify token invalidation${NC}"
INVALID_RESPONSE=$(curl -s -X GET "$API_URL/auth/profile" \
  -H "Authorization: Bearer $TOKEN")

if echo "$INVALID_RESPONSE" | grep -q "unauthorized\|401\|invalid"; then
  echo -e "${GREEN}✓ Token properly invalidated${NC}"
else
  echo -e "${YELLOW}⚠ Token may still be valid after logout${NC}"
fi

echo -e "\n================================"
echo "Authentication Tests Complete"
echo "================================"