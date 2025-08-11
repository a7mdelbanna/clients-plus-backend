#!/bin/bash

# Test Data Generator for Business Flow Tests
# Generates realistic test data for all business entities

# Load required dependencies
source "$(dirname "${BASH_SOURCE[0]}")/api-client.sh"

# Generate unique identifiers
generate_uuid() {
    if command -v uuidgen &> /dev/null; then
        uuidgen | tr '[:upper:]' '[:lower:]'
    else
        # Fallback UUID generation
        local uuid=""
        for i in {1..8}; do uuid+=$(printf "%x" $((RANDOM % 16))); done
        uuid+="-"
        for i in {1..4}; do uuid+=$(printf "%x" $((RANDOM % 16))); done
        uuid+="-4"
        for i in {1..3}; do uuid+=$(printf "%x" $((RANDOM % 16))); done
        uuid+="-"
        uuid+=$(printf "%x" $((8 + RANDOM % 4)))
        for i in {1..3}; do uuid+=$(printf "%x" $((RANDOM % 16))); done
        uuid+="-"
        for i in {1..12}; do uuid+=$(printf "%x" $((RANDOM % 16))); done
        echo "$uuid"
    fi
}

generate_timestamp() {
    date -u +"%Y-%m-%dT%H:%M:%S.%3NZ"
}

generate_future_date() {
    local days_ahead=${1:-7}
    if [[ "$OSTYPE" == "darwin"* ]]; then
        date -u -v+"${days_ahead}d" +"%Y-%m-%dT%H:%M:%S.%3NZ"
    else
        date -u -d "+${days_ahead} days" +"%Y-%m-%dT%H:%M:%S.%3NZ"
    fi
}

generate_past_date() {
    local days_back=${1:-30}
    if [[ "$OSTYPE" == "darwin"* ]]; then
        date -u -v-"${days_back}d" +"%Y-%m-%dT%H:%M:%S.%3NZ"
    else
        date -u -d "-${days_back} days" +"%Y-%m-%dT%H:%M:%S.%3NZ"
    fi
}

# Random data generators
generate_random_name() {
    local first_names=("John" "Jane" "Michael" "Sarah" "David" "Lisa" "Chris" "Emma" "Robert" "Ashley" "James" "Jessica" "William" "Amanda" "Richard" "Stephanie")
    local last_names=("Smith" "Johnson" "Williams" "Brown" "Jones" "Garcia" "Miller" "Davis" "Rodriguez" "Martinez" "Hernandez" "Lopez" "Gonzalez" "Wilson" "Anderson" "Thomas")
    
    local first=${first_names[$RANDOM % ${#first_names[@]}]}
    local last=${last_names[$RANDOM % ${#last_names[@]}]}
    echo "$first $last"
}

generate_random_email() {
    local name="$1"
    local domain="testclient.com"
    local clean_name=$(echo "$name" | tr '[:upper:]' '[:lower:]' | tr ' ' '.')
    local random_num=$((RANDOM % 1000))
    echo "${clean_name}.${random_num}@${domain}"
}

generate_random_phone() {
    printf "+1%03d%03d%04d" $((RANDOM % 900 + 100)) $((RANDOM % 900 + 100)) $((RANDOM % 9000 + 1000))
}

generate_random_address() {
    local streets=("Main St" "Oak Ave" "Pine Rd" "Elm St" "Cedar Ln" "Maple Dr" "Park Ave" "First St" "Second Ave" "Third St")
    local cities=("New York" "Los Angeles" "Chicago" "Houston" "Phoenix" "Philadelphia" "San Antonio" "San Diego" "Dallas" "San Jose")
    local states=("NY" "CA" "IL" "TX" "AZ" "PA" "TX" "CA" "TX" "CA")
    
    local street_num=$((RANDOM % 9000 + 1000))
    local street=${streets[$RANDOM % ${#streets[@]}]}
    local city=${cities[$RANDOM % ${#cities[@]}]}
    local state=${states[$RANDOM % ${#states[@]}]}
    local zip=$((RANDOM % 90000 + 10000))
    
    echo "{
        \"street\": \"$street_num $street\",
        \"city\": \"$city\",
        \"state\": \"$state\",
        \"zipCode\": \"$zip\",
        \"country\": \"USA\"
    }"
}

# Company data
generate_test_company() {
    local company_name="${1:-Test Company $(date +%s)}"
    local email="${2:-admin@testcompany$(date +%s).com}"
    
    cat << EOF
{
    "name": "$company_name",
    "email": "$email",
    "phone": "$(generate_random_phone)",
    "businessType": "SERVICE",
    "address": $(generate_random_address),
    "timezone": "America/New_York",
    "currency": "USD",
    "subscriptionPlan": "PRO"
}
EOF
}

# User data
generate_test_user() {
    local company_id="$1"
    local role="${2:-STAFF}"
    local name=$(generate_random_name)
    local first_name=$(echo "$name" | cut -d' ' -f1)
    local last_name=$(echo "$name" | cut -d' ' -f2-)
    local email=$(generate_random_email "$name")
    
    cat << EOF
{
    "firstName": "$first_name",
    "lastName": "$last_name",
    "email": "$email",
    "phone": "$(generate_random_phone)",
    "role": "$role",
    "password": "TestPass123!",
    "companyId": "$company_id"
}
EOF
}

# Client data
generate_test_client() {
    local company_id="$1"
    local name=$(generate_random_name)
    local first_name=$(echo "$name" | cut -d' ' -f1)
    local last_name=$(echo "$name" | cut -d' ' -f2-)
    local email=$(generate_random_email "$name")
    
    cat << EOF
{
    "firstName": "$first_name",
    "lastName": "$last_name",
    "email": "$email",
    "phone": "$(generate_random_phone)",
    "address": $(generate_random_address),
    "preferences": {
        "communicationMethod": "EMAIL",
        "notifications": true,
        "preferredLanguage": "en"
    },
    "companyId": "$company_id"
}
EOF
}

# Staff data
generate_test_staff() {
    local company_id="$1"
    local branch_id="$2"
    local name=$(generate_random_name)
    local specializations=("Haircut" "Hair Coloring" "Styling" "Massage" "Facial" "Manicure" "Pedicure")
    local specialization=${specializations[$RANDOM % ${#specializations[@]}]}
    
    cat << EOF
{
    "name": "$name",
    "email": "$(generate_random_email "$name")",
    "phone": "$(generate_random_phone)",
    "position": "Senior $specialization Specialist",
    "specialization": "$specialization",
    "primaryBranchId": "$branch_id",
    "commissionRate": 0.$(printf "%02d" $((RANDOM % 50 + 10))),
    "hourlyRate": $((RANDOM % 50 + 25)),
    "onlineBookingEnabled": true,
    "companyId": "$company_id"
}
EOF
}

# Branch data
generate_test_branch() {
    local company_id="$1"
    local branch_name="${2:-Main Branch}"
    
    cat << EOF
{
    "name": "$branch_name",
    "address": $(generate_random_address),
    "phone": "$(generate_random_phone)",
    "email": "branch@testcompany.com",
    "type": "MAIN",
    "operatingHours": {
        "monday": {"start": "09:00", "end": "18:00", "isOpen": true},
        "tuesday": {"start": "09:00", "end": "18:00", "isOpen": true},
        "wednesday": {"start": "09:00", "end": "18:00", "isOpen": true},
        "thursday": {"start": "09:00", "end": "18:00", "isOpen": true},
        "friday": {"start": "09:00", "end": "18:00", "isOpen": true},
        "saturday": {"start": "10:00", "end": "16:00", "isOpen": true},
        "sunday": {"start": "10:00", "end": "16:00", "isOpen": false}
    },
    "companyId": "$company_id"
}
EOF
}

# Service data
generate_test_service() {
    local company_id="$1"
    local services=("Haircut" "Hair Wash & Blow Dry" "Hair Coloring" "Highlights" "Perm" "Hair Treatment" "Beard Trim" "Shampoo")
    local categories=("HAIR" "BEAUTY" "WELLNESS" "GROOMING")
    local durations=(30 45 60 90 120)
    
    local service_name=${services[$RANDOM % ${#services[@]}]}
    local category=${categories[$RANDOM % ${#categories[@]}]}
    local duration=${durations[$RANDOM % ${#durations[@]}]}
    local price=$((RANDOM % 200 + 25))
    
    cat << EOF
{
    "name": "$service_name",
    "description": "Professional $service_name service",
    "category": "$category",
    "price": $price,
    "duration": $duration,
    "requirements": {
        "minAdvanceNotice": 24,
        "bufferTime": 15
    },
    "companyId": "$company_id"
}
EOF
}

# Product data
generate_test_product() {
    local company_id="$1"
    local products=("Shampoo" "Conditioner" "Hair Gel" "Hair Spray" "Face Cream" "Hand Lotion" "Nail Polish" "Lip Balm")
    local categories=("HAIR_CARE" "SKIN_CARE" "NAIL_CARE" "TOOLS")
    
    local product_name=${products[$RANDOM % ${#products[@]}]}
    local category=${categories[$RANDOM % ${#categories[@]}]}
    local price=$((RANDOM % 100 + 10))
    local cost=$((price * 60 / 100)) # 60% cost ratio
    
    cat << EOF
{
    "name": "$product_name",
    "description": "Premium $product_name",
    "category": "$category",
    "price": $price,
    "cost": $cost,
    "sku": "PRD$(date +%s)$((RANDOM % 1000))",
    "barcode": "$(printf "%013d" $((RANDOM % 9999999999999)))",
    "trackInventory": true,
    "minStockLevel": $((RANDOM % 10 + 5)),
    "companyId": "$company_id"
}
EOF
}

# Appointment data
generate_test_appointment() {
    local company_id="$1"
    local client_id="$2"
    local staff_id="$3"
    local service_id="$4"
    local branch_id="$5"
    local date_time="${6:-$(generate_future_date 3)}"
    
    cat << EOF
{
    "clientId": "$client_id",
    "serviceIds": ["$service_id"],
    "staffId": "$staff_id",
    "branchId": "$branch_id",
    "dateTime": "$date_time",
    "status": "CONFIRMED",
    "notes": "Generated test appointment",
    "companyId": "$company_id"
}
EOF
}

# Invoice data
generate_test_invoice() {
    local company_id="$1"
    local client_id="$2"
    local items="$3" # JSON array of items
    local total_amount="$4"
    
    cat << EOF
{
    "clientId": "$client_id",
    "items": $items,
    "totalAmount": $total_amount,
    "taxAmount": $(echo "$total_amount * 0.08" | bc -l | xargs printf "%.2f"),
    "status": "PENDING",
    "dueDate": "$(generate_future_date 30)",
    "companyId": "$company_id"
}
EOF
}

# Financial account data
generate_test_financial_account() {
    local company_id="$1"
    local account_types=("CASH" "CHECKING" "SAVINGS" "CREDIT_CARD" "EXPENSE" "REVENUE")
    local account_type="${2:-${account_types[$RANDOM % ${#account_types[@]}]}}"
    local account_names=("Main Cash Register" "Business Checking" "Petty Cash" "Credit Card" "Office Expenses" "Service Revenue")
    local account_name=${account_names[$RANDOM % ${#account_names[@]}]}
    
    cat << EOF
{
    "name": "$account_name",
    "type": "$account_type",
    "accountNumber": "$(printf "%010d" $((RANDOM % 9999999999)))",
    "balance": $(echo "$((RANDOM % 10000))" | bc -l | xargs printf "%.2f"),
    "description": "Generated test account for $account_type",
    "companyId": "$company_id"
}
EOF
}

# Generate bulk test data
generate_bulk_clients() {
    local company_id="$1"
    local count="${2:-10}"
    
    echo "["
    for ((i=1; i<=count; i++)); do
        generate_test_client "$company_id"
        if [[ $i -lt $count ]]; then
            echo ","
        fi
    done
    echo "]"
}

generate_bulk_staff() {
    local company_id="$1"
    local branch_id="$2"
    local count="${3:-5}"
    
    echo "["
    for ((i=1; i<=count; i++)); do
        generate_test_staff "$company_id" "$branch_id"
        if [[ $i -lt $count ]]; then
            echo ","
        fi
    done
    echo "]"
}

generate_bulk_services() {
    local company_id="$1"
    local count="${2:-10}"
    
    echo "["
    for ((i=1; i<=count; i++)); do
        generate_test_service "$company_id"
        if [[ $i -lt $count ]]; then
            echo ","
        fi
    done
    echo "]"
}

generate_bulk_products() {
    local company_id="$1"
    local count="${2:-15}"
    
    echo "["
    for ((i=1; i<=count; i++)); do
        generate_test_product "$company_id"
        if [[ $i -lt $count ]]; then
            echo ","
        fi
    done
    echo "]"
}

# Cleanup helpers
generate_cleanup_script() {
    local company_id="$1"
    local test_prefix="${2:-Test}"
    
    cat << EOF
#!/bin/bash
# Cleanup script for test data

source "$(dirname "\${BASH_SOURCE[0]}")/../shared/api-client.sh"

echo "Cleaning up test data for company: $company_id"

# Delete test clients
echo "Deleting test clients..."
clients=\$(http_get "/clients?search=$test_prefix")
echo "\$clients" | jq -r '.data[]?.id // empty' | while read -r client_id; do
    if [[ -n "\$client_id" ]]; then
        http_delete "/clients/\$client_id" > /dev/null
        echo "Deleted client: \$client_id"
    fi
done

# Delete test appointments
echo "Deleting test appointments..."
appointments=\$(http_get "/appointments?status=ALL")
echo "\$appointments" | jq -r '.data[]?.id // empty' | while read -r appointment_id; do
    if [[ -n "\$appointment_id" ]]; then
        http_delete "/appointments/\$appointment_id" > /dev/null
        echo "Deleted appointment: \$appointment_id"
    fi
done

# Delete test invoices
echo "Deleting test invoices..."
invoices=\$(http_get "/invoices")
echo "\$invoices" | jq -r '.data[]?.id // empty' | while read -r invoice_id; do
    if [[ -n "\$invoice_id" ]]; then
        http_delete "/invoices/\$invoice_id" > /dev/null
        echo "Deleted invoice: \$invoice_id"
    fi
done

echo "Cleanup completed"
EOF
}

# Export all functions
export -f generate_uuid generate_timestamp generate_future_date generate_past_date
export -f generate_random_name generate_random_email generate_random_phone generate_random_address
export -f generate_test_company generate_test_user generate_test_client generate_test_staff
export -f generate_test_branch generate_test_service generate_test_product generate_test_appointment
export -f generate_test_invoice generate_test_financial_account
export -f generate_bulk_clients generate_bulk_staff generate_bulk_services generate_bulk_products
export -f generate_cleanup_script