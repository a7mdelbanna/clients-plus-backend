#!/bin/bash

# Appointment Management API Tests
# Tests the appointment endpoints used by the frontend

API_URL="http://localhost:4000/api/v1"
TOKEN=""

echo "================================"
echo "Appointment Management API Tests"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Authenticate first
echo -e "${YELLOW}Authenticating...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Test123!@#"
  }')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$TOKEN" ]; then
  echo -e "${RED}Authentication failed. Please run auth-test.sh first${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Authentication successful${NC}"

# Test 1: Get availability slots
echo -e "\n${YELLOW}Test 1: Get availability slots${NC}"

# Test the endpoint frontend expects
AVAILABILITY_RESPONSE=$(curl -s -X GET "$API_URL/availability/slots?date=2024-01-15&staffId=test" \
  -H "Authorization: Bearer $TOKEN")

if echo "$AVAILABILITY_RESPONSE" | grep -q "404\|Cannot"; then
  echo -e "${YELLOW}⚠ Frontend expected endpoint not found${NC}"
  
  # Try the actual backend endpoint
  echo "Trying backend endpoint..."
  AVAILABILITY_RESPONSE=$(curl -s -X GET "$API_URL/appointments/availability/slots?date=2024-01-15&staffId=test" \
    -H "Authorization: Bearer $TOKEN")
  
  if echo "$AVAILABILITY_RESPONSE" | grep -q "slots\|available"; then
    echo -e "${GREEN}✓ Backend availability endpoint works${NC}"
  else
    echo -e "${RED}✗ Availability check failed${NC}"
  fi
else
  echo -e "${GREEN}✓ Availability slots retrieved${NC}"
fi

# Test 2: Create appointment
echo -e "\n${YELLOW}Test 2: Create appointment${NC}"
APPOINTMENT_DATA='{
  "clientId": "test-client-id",
  "staffId": "test-staff-id",
  "serviceId": "test-service-id",
  "date": "2024-01-15",
  "startTime": "10:00",
  "endTime": "11:00",
  "status": "confirmed",
  "notes": "Test appointment"
}'

CREATE_RESPONSE=$(curl -s -X POST "$API_URL/appointments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$APPOINTMENT_DATA")

if echo "$CREATE_RESPONSE" | grep -q '"id"'; then
  echo -e "${GREEN}✓ Appointment created successfully${NC}"
  APPOINTMENT_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')
  echo "Appointment ID: $APPOINTMENT_ID"
else
  echo -e "${RED}✗ Appointment creation failed${NC}"
  echo "Response: $CREATE_RESPONSE"
fi

# Test 3: Get appointments
echo -e "\n${YELLOW}Test 3: Get appointments list${NC}"
GET_ALL_RESPONSE=$(curl -s -X GET "$API_URL/appointments" \
  -H "Authorization: Bearer $TOKEN")

if echo "$GET_ALL_RESPONSE" | grep -q "data"; then
  echo -e "${GREEN}✓ Retrieved appointments list${NC}"
else
  echo -e "${RED}✗ Failed to retrieve appointments${NC}"
  echo "Response: $GET_ALL_RESPONSE"
fi

# Test 4: Get appointment by ID
if [ ! -z "$APPOINTMENT_ID" ]; then
  echo -e "\n${YELLOW}Test 4: Get appointment by ID${NC}"
  GET_ONE_RESPONSE=$(curl -s -X GET "$API_URL/appointments/$APPOINTMENT_ID" \
    -H "Authorization: Bearer $TOKEN")
  
  if echo "$GET_ONE_RESPONSE" | grep -q '"id"'; then
    echo -e "${GREEN}✓ Retrieved appointment details${NC}"
  else
    echo -e "${RED}✗ Failed to retrieve appointment${NC}"
    echo "Response: $GET_ONE_RESPONSE"
  fi
fi

# Test 5: Update appointment status
if [ ! -z "$APPOINTMENT_ID" ]; then
  echo -e "\n${YELLOW}Test 5: Update appointment status${NC}"
  UPDATE_DATA='{
    "status": "completed"
  }'
  
  UPDATE_RESPONSE=$(curl -s -X PATCH "$API_URL/appointments/$APPOINTMENT_ID/status" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$UPDATE_DATA")
  
  if echo "$UPDATE_RESPONSE" | grep -q "completed\|success"; then
    echo -e "${GREEN}✓ Appointment status updated${NC}"
  else
    echo -e "${RED}✗ Status update failed${NC}"
    echo "Response: $UPDATE_RESPONSE"
  fi
fi

# Test 6: Get calendar view
echo -e "\n${YELLOW}Test 6: Get calendar view${NC}"
CALENDAR_RESPONSE=$(curl -s -X GET "$API_URL/appointments/calendar?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer $TOKEN")

if echo "$CALENDAR_RESPONSE" | grep -q "data\|appointments"; then
  echo -e "${GREEN}✓ Calendar view retrieved${NC}"
else
  echo -e "${YELLOW}⚠ Calendar endpoint may have issues${NC}"
fi

# Test 7: Cancel appointment
if [ ! -z "$APPOINTMENT_ID" ]; then
  echo -e "\n${YELLOW}Test 7: Cancel appointment${NC}"
  CANCEL_RESPONSE=$(curl -s -X POST "$API_URL/appointments/$APPOINTMENT_ID/cancel" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"reason": "Test cancellation"}'
  )
  
  if echo "$CANCEL_RESPONSE" | grep -q "cancelled\|success"; then
    echo -e "${GREEN}✓ Appointment cancelled successfully${NC}"
  else
    echo -e "${RED}✗ Cancellation failed${NC}"
    echo "Response: $CANCEL_RESPONSE"
  fi
fi

echo -e "\n================================"
echo "Appointment Tests Complete"
echo "================================"