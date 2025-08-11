#!/bin/bash

# API Client Utilities for Business Flow Tests
# Provides standardized HTTP requests, authentication, and response handling

# Configuration
BASE_URL="${API_BASE_URL:-http://localhost:3000/api/v1}"
CONTENT_TYPE="Content-Type: application/json"
TIMEOUT="${HTTP_TIMEOUT:-30}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Authentication variables
JWT_TOKEN=""
COMPANY_ID=""

# Logging
log_request() {
    local method="$1"
    local url="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] ${BLUE}$method${NC} $url" >&2
}

log_response() {
    local status="$1"
    local duration="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    if [[ $status -ge 200 && $status -lt 300 ]]; then
        echo "[$timestamp] ${GREEN}$status${NC} (${duration}ms)" >&2
    elif [[ $status -ge 400 ]]; then
        echo "[$timestamp] ${RED}$status${NC} (${duration}ms)" >&2
    else
        echo "[$timestamp] ${YELLOW}$status${NC} (${duration}ms)" >&2
    fi
}

# Authentication
auth_login() {
    local email="$1"
    local password="$2"
    local company_id="$3"
    
    log_request "POST" "/auth/login"
    local start_time=$(date +%s%3N)
    
    local response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X POST "$BASE_URL/auth/login" \
        -H "$CONTENT_TYPE" \
        -d "{
            \"email\": \"$email\",
            \"password\": \"$password\",
            \"companyId\": \"$company_id\"
        }" \
        --max-time $TIMEOUT)
    
    local end_time=$(date +%s%3N)
    local duration=$((end_time - start_time))
    local status=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    local body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*$//')
    
    log_response "$status" "$duration"
    
    if [[ $status -eq 200 ]]; then
        JWT_TOKEN=$(echo "$body" | jq -r '.token // .data.token // empty')
        COMPANY_ID="$company_id"
        echo "$body"
        return 0
    else
        echo "$body" >&2
        return 1
    fi
}

# Generic HTTP methods
http_get() {
    local endpoint="$1"
    local headers=("$CONTENT_TYPE")
    
    if [[ -n "$JWT_TOKEN" ]]; then
        headers+=("Authorization: Bearer $JWT_TOKEN")
    fi
    if [[ -n "$COMPANY_ID" ]]; then
        headers+=("X-Company-ID: $COMPANY_ID")
    fi
    
    log_request "GET" "$endpoint"
    local start_time=$(date +%s%3N)
    
    local curl_headers=()
    for header in "${headers[@]}"; do
        curl_headers+=(-H "$header")
    done
    
    local response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        "${curl_headers[@]}" \
        "$BASE_URL$endpoint" \
        --max-time $TIMEOUT)
    
    local end_time=$(date +%s%3N)
    local duration=$((end_time - start_time))
    local status=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    local body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*$//')
    
    log_response "$status" "$duration"
    
    echo "$body"
    return $([ "$status" -ge 200 ] && [ "$status" -lt 400 ] && echo 0 || echo 1)
}

http_post() {
    local endpoint="$1"
    local data="$2"
    local headers=("$CONTENT_TYPE")
    
    if [[ -n "$JWT_TOKEN" ]]; then
        headers+=("Authorization: Bearer $JWT_TOKEN")
    fi
    if [[ -n "$COMPANY_ID" ]]; then
        headers+=("X-Company-ID: $COMPANY_ID")
    fi
    
    log_request "POST" "$endpoint"
    local start_time=$(date +%s%3N)
    
    local curl_headers=()
    for header in "${headers[@]}"; do
        curl_headers+=(-H "$header")
    done
    
    local response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X POST \
        "${curl_headers[@]}" \
        -d "$data" \
        "$BASE_URL$endpoint" \
        --max-time $TIMEOUT)
    
    local end_time=$(date +%s%3N)
    local duration=$((end_time - start_time))
    local status=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    local body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*$//')
    
    log_response "$status" "$duration"
    
    echo "$body"
    return $([ "$status" -ge 200 ] && [ "$status" -lt 400 ] && echo 0 || echo 1)
}

http_put() {
    local endpoint="$1"
    local data="$2"
    local headers=("$CONTENT_TYPE")
    
    if [[ -n "$JWT_TOKEN" ]]; then
        headers+=("Authorization: Bearer $JWT_TOKEN")
    fi
    if [[ -n "$COMPANY_ID" ]]; then
        headers+=("X-Company-ID: $COMPANY_ID")
    fi
    
    log_request "PUT" "$endpoint"
    local start_time=$(date +%s%3N)
    
    local curl_headers=()
    for header in "${headers[@]}"; do
        curl_headers+=(-H "$header")
    done
    
    local response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X PUT \
        "${curl_headers[@]}" \
        -d "$data" \
        "$BASE_URL$endpoint" \
        --max-time $TIMEOUT)
    
    local end_time=$(date +%s%3N)
    local duration=$((end_time - start_time))
    local status=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    local body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*$//')
    
    log_response "$status" "$duration"
    
    echo "$body"
    return $([ "$status" -ge 200 ] && [ "$status" -lt 400 ] && echo 0 || echo 1)
}

http_delete() {
    local endpoint="$1"
    local headers=("$CONTENT_TYPE")
    
    if [[ -n "$JWT_TOKEN" ]]; then
        headers+=("Authorization: Bearer $JWT_TOKEN")
    fi
    if [[ -n "$COMPANY_ID" ]]; then
        headers+=("X-Company-ID: $COMPANY_ID")
    fi
    
    log_request "DELETE" "$endpoint"
    local start_time=$(date +%s%3N)
    
    local curl_headers=()
    for header in "${headers[@]}"; do
        curl_headers+=(-H "$header")
    done
    
    local response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X DELETE \
        "${curl_headers[@]}" \
        "$BASE_URL$endpoint" \
        --max-time $TIMEOUT)
    
    local end_time=$(date +%s%3N)
    local duration=$((end_time - start_time))
    local status=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    local body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*$//')
    
    log_response "$status" "$duration"
    
    echo "$body"
    return $([ "$status" -ge 200 ] && [ "$status" -lt 400 ] && echo 0 || echo 1)
}

# Health check
check_api_health() {
    log_request "GET" "/health"
    local start_time=$(date +%s%3N)
    
    local response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        "$BASE_URL/health" \
        --max-time $TIMEOUT)
    
    local end_time=$(date +%s%3N)
    local duration=$((end_time - start_time))
    local status=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    local body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*$//')
    
    log_response "$status" "$duration"
    
    if [[ $status -eq 200 ]]; then
        echo "API is healthy"
        return 0
    else
        echo "API health check failed: $body" >&2
        return 1
    fi
}

# Response validation helpers
validate_response_field() {
    local response="$1"
    local field_path="$2"
    local expected_value="$3"
    
    local actual_value=$(echo "$response" | jq -r "$field_path // empty")
    
    if [[ "$actual_value" == "$expected_value" ]]; then
        return 0
    else
        echo "Validation failed: $field_path expected '$expected_value', got '$actual_value'" >&2
        return 1
    fi
}

validate_response_exists() {
    local response="$1"
    local field_path="$2"
    
    local value=$(echo "$response" | jq -r "$field_path // empty")
    
    if [[ -n "$value" && "$value" != "null" ]]; then
        return 0
    else
        echo "Validation failed: $field_path does not exist or is null" >&2
        return 1
    fi
}

# Export functions for use in other scripts
export -f log_request log_response
export -f auth_login http_get http_post http_put http_delete
export -f check_api_health validate_response_field validate_response_exists