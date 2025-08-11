#!/bin/bash

# Client Management API Tests
# Tests the client endpoints used by the frontend

API_URL="http://localhost:8888/api/v1"
TOKEN=""

echo "================================"
echo "Client Management API Tests"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# First, login to get a token
echo -e "${YELLOW}Authenticating...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Test123!@#"
  }')

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | sed 's/"token":"//')
  echo -e "${GREEN}✓ Authentication successful${NC}"
else
  echo -e "${RED}✗ Authentication failed. Creating test user...${NC}"
  
  # Register a test user
  REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "admin@test.com",
      "password": "Test123!@#",
      "firstName": "Admin",
      "lastName": "User",
      "companyName": "Test Company",
      "phone": "+201234567890"
    }')
  
  TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*' | sed 's/"token":"//')
fi

# Test 1: Create a client
echo -e "\n${YELLOW}Test 1: Create a client${NC}"
CLIENT_DATA='{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+201234567890",
  "address": {
    "street": "123 Main St",
    "city": "Cairo",
    "state": "Cairo",
    "country": "Egypt",
    "postalCode": "12345"
  },
  "dateOfBirth": "1990-01-01",
  "gender": "male",
  "status": "active",
  "notes": "Test client"
}'

CREATE_RESPONSE=$(curl -s -X POST "$API_URL/clients" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$CLIENT_DATA")

if echo "$CREATE_RESPONSE" | grep -q '"id"'; then
  echo -e "${GREEN}✓ Client created successfully${NC}"
  CLIENT_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')
  echo "Client ID: $CLIENT_ID"
else
  echo -e "${RED}✗ Client creation failed${NC}"
  echo "Response: $CREATE_RESPONSE"
fi

# Test 2: Get all clients
echo -e "\n${YELLOW}Test 2: Get all clients${NC}"
GET_ALL_RESPONSE=$(curl -s -X GET "$API_URL/clients" \
  -H "Authorization: Bearer $TOKEN")

if echo "$GET_ALL_RESPONSE" | grep -q "data"; then
  echo -e "${GREEN}✓ Retrieved clients list${NC}"
  CLIENT_COUNT=$(echo "$GET_ALL_RESPONSE" | grep -o '"total":[0-9]*' | sed 's/"total"://')
  echo "Total clients: ${CLIENT_COUNT:-0}"
else
  echo -e "${RED}✗ Failed to retrieve clients${NC}"
  echo "Response: $GET_ALL_RESPONSE"
fi

# Test 3: Get client by ID
if [ ! -z "$CLIENT_ID" ]; then
  echo -e "\n${YELLOW}Test 3: Get client by ID${NC}"
  GET_ONE_RESPONSE=$(curl -s -X GET "$API_URL/clients/$CLIENT_ID" \
    -H "Authorization: Bearer $TOKEN")
  
  if echo "$GET_ONE_RESPONSE" | grep -q '"id"'; then
    echo -e "${GREEN}✓ Retrieved client details${NC}"
  else
    echo -e "${RED}✗ Failed to retrieve client${NC}"
    echo "Response: $GET_ONE_RESPONSE"
  fi
fi

# Test 4: Update client
if [ ! -z "$CLIENT_ID" ]; then
  echo -e "\n${YELLOW}Test 4: Update client${NC}"
  UPDATE_DATA='{
    "firstName": "John",
    "lastName": "Smith",
    "notes": "Updated test client"
  }'
  
  UPDATE_RESPONSE=$(curl -s -X PUT "$API_URL/clients/$CLIENT_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$UPDATE_DATA")
  
  if echo "$UPDATE_RESPONSE" | grep -q "Smith"; then
    echo -e "${GREEN}✓ Client updated successfully${NC}"
  else
    echo -e "${RED}✗ Client update failed${NC}"
    echo "Response: $UPDATE_RESPONSE"
  fi
fi

# Test 5: Search clients
echo -e "\n${YELLOW}Test 5: Search clients${NC}"
SEARCH_RESPONSE=$(curl -s -X GET "$API_URL/clients?search=John" \
  -H "Authorization: Bearer $TOKEN")

if echo "$SEARCH_RESPONSE" | grep -q "data"; then
  echo -e "${GREEN}✓ Client search works${NC}"
else
  echo -e "${RED}✗ Client search failed${NC}"
  echo "Response: $SEARCH_RESPONSE"
fi

# Test 6: Get client statistics
echo -e "\n${YELLOW}Test 6: Get client statistics${NC}"
STATS_RESPONSE=$(curl -s -X GET "$API_URL/clients/statistics" \
  -H "Authorization: Bearer $TOKEN")

if echo "$STATS_RESPONSE" | grep -q "total\|active"; then
  echo -e "${GREEN}✓ Client statistics retrieved${NC}"
else
  echo -e "${YELLOW}⚠ Client statistics endpoint may not exist${NC}"
fi

# Test 7: Delete client
if [ ! -z "$CLIENT_ID" ]; then
  echo -e "\n${YELLOW}Test 7: Delete client${NC}"
  DELETE_RESPONSE=$(curl -s -X DELETE "$API_URL/clients/$CLIENT_ID" \
    -H "Authorization: Bearer $TOKEN")
  
  if echo "$DELETE_RESPONSE" | grep -q "success\|deleted"; then
    echo -e "${GREEN}✓ Client deleted successfully${NC}"
  else
    echo -e "${RED}✗ Client deletion failed${NC}"
    echo "Response: $DELETE_RESPONSE"
  fi
fi

echo -e "\n================================"
echo "Client Management Tests Complete"
echo "================================"