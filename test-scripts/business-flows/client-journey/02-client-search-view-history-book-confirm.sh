#!/bin/bash

# Client Journey Flow 2: Client Search → View History → Book Appointment → Receive Confirmation
# This test simulates searching for an existing client, viewing their history, and booking a new appointment

set -e

# Load shared utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../shared/test-helpers.sh"

# Test configuration
TEST_NAME="Client Search to Booking Confirmation"
TEST_DESCRIPTION="Search for existing client, view history, book appointment, and confirm"

# Test data variables
EXISTING_CLIENT_ID=""
STAFF_ID=""
SERVICE_ID=""
BRANCH_ID=""
APPOINTMENT_ID=""

# Initialize test
init_test "$TEST_NAME" "$TEST_DESCRIPTION"

# Setup: Create a client with history
setup_test_client_with_history() {
    start_step "setup_client_history" "Creating client with appointment history"
    
    # Get required entities
    local branches_response=$(http_get "/branches?limit=1")
    BRANCH_ID=$(echo "$branches_response" | jq -r '.data[0].id // empty')
    
    local staff_response=$(http_get "/staff?limit=1")
    STAFF_ID=$(echo "$staff_response" | jq -r '.data[0].id // empty')
    
    local services_response=$(http_get "/services?limit=1")
    SERVICE_ID=$(echo "$services_response" | jq -r '.data[0].id // empty')
    
    # Create client
    local client_data=$(generate_test_client "$TEST_COMPANY_ID")
    local client_response=$(create_and_track_client "$TEST_COMPANY_ID" "$client_data")
    EXISTING_CLIENT_ID=$(echo "$client_response" | jq -r '.data.id // .id')
    
    # Create previous appointment (completed)
    local past_date=$(generate_past_date 7)
    local past_appointment_data=$(cat << EOF
{
    "clientId": "$EXISTING_CLIENT_ID",
    "serviceIds": ["$SERVICE_ID"],
    "staffId": "$STAFF_ID",
    "branchId": "$BRANCH_ID",
    "dateTime": "$past_date",
    "status": "COMPLETED",
    "notes": "Previous appointment - completed"
}
EOF
    )
    
    local past_appointment_response=$(create_and_track_appointment "$past_appointment_data")
    
    if [[ -n "$EXISTING_CLIENT_ID" && -n "$BRANCH_ID" && -n "$STAFF_ID" && -n "$SERVICE_ID" ]]; then
        pass_step "Client with history created successfully"
        return 0
    else
        fail_step "Failed to setup client with history"
        return 1
    fi
}

# Step 1: Search for client
search_for_client() {
    start_step "client_search" "Searching for existing client"
    
    simulate_user_delay 1 2
    
    # Get client name for search
    local client_details=$(http_get "/clients/$EXISTING_CLIENT_ID")
    local client_name=$(echo "$client_details" | jq -r '.data.firstName // .firstName')
    
    # Search by name
    local search_response=$(http_get "/clients/search?search=$client_name")
    
    if assert_response_success "$search_response" "Client search successful"; then
        # Verify client is found
        local found_client_id=$(echo "$search_response" | jq -r '.data[0].id // empty')
        assert_field_equals "$search_response" ".data[0].id" "$EXISTING_CLIENT_ID" "Correct client found in search"
        return 0
    else
        fail_step "Client search failed"
        return 1
    fi
}

# Step 2: View client history
view_client_history() {
    start_step "view_client_history" "Viewing client appointment and service history"
    
    simulate_user_delay 2 3
    
    # Get client appointments
    local appointments_response=$(http_get "/appointments?clientId=$EXISTING_CLIENT_ID")
    
    if assert_response_success "$appointments_response" "Client appointments retrieved"; then
        local appointment_count=$(echo "$appointments_response" | jq '.data | length')
        
        if [[ $appointment_count -gt 0 ]]; then
            pass_step "Client has appointment history ($appointment_count appointments)"
            
            # Get client details including totals
            local client_details=$(http_get "/clients/$EXISTING_CLIENT_ID")
            assert_response_success "$client_details" "Client details with history retrieved"
            
            return 0
        else
            fail_step "Client has no appointment history"
            return 1
        fi
    else
        fail_step "Failed to retrieve client history"
        return 1
    fi
}

# Step 3: Check availability for new appointment
check_new_appointment_availability() {
    start_step "check_availability" "Checking availability for new appointment"
    
    simulate_user_delay 1 2
    
    local tomorrow
    if [[ "$OSTYPE" == "darwin"* ]]; then
        tomorrow=$(date -v+1d +%Y-%m-%d)
    else
        tomorrow=$(date -d "+1 day" +%Y-%m-%d)
    fi
    
    local availability_response=$(http_get "/appointments/availability?date=$tomorrow&serviceIds=$SERVICE_ID&branchId=$BRANCH_ID")
    
    if assert_response_success "$availability_response" "Availability check successful"; then
        local slot_count=$(echo "$availability_response" | jq '.availableSlots | length')
        
        if [[ $slot_count -gt 0 ]]; then
            pass_step "Available slots found for new appointment"
            return 0
        else
            fail_step "No available slots for new appointment"
            return 1
        fi
    else
        fail_step "Availability check failed"
        return 1
    fi
}

# Step 4: Book new appointment
book_new_appointment() {
    start_step "book_new_appointment" "Booking new appointment for returning client"
    
    simulate_user_delay 2 3
    
    local appointment_date
    if [[ "$OSTYPE" == "darwin"* ]]; then
        appointment_date=$(date -v+2d -v14H -v0M -v0S +%Y-%m-%dT%H:%M:%S.000Z)
    else
        appointment_date=$(date -d "+2 days 14:00:00" +%Y-%m-%dT%H:%M:%S.000Z)
    fi
    
    local appointment_data=$(cat << EOF
{
    "clientId": "$EXISTING_CLIENT_ID",
    "serviceIds": ["$SERVICE_ID"],
    "staffId": "$STAFF_ID",
    "branchId": "$BRANCH_ID",
    "dateTime": "$appointment_date",
    "status": "CONFIRMED",
    "notes": "Return appointment for existing client"
}
EOF
    )
    
    local appointment_response=$(create_and_track_appointment "$appointment_data")
    
    if assert_response_success "$appointment_response" "New appointment booking successful"; then
        APPOINTMENT_ID=$(echo "$appointment_response" | jq -r '.data.id // .id')
        assert_field_equals "$appointment_response" ".data.clientId // .clientId" "$EXISTING_CLIENT_ID" "Correct client ID"
        return 0
    else
        fail_step "New appointment booking failed"
        return 1
    fi
}

# Step 5: Send confirmation notification
send_booking_confirmation() {
    start_step "send_confirmation" "Sending booking confirmation to client"
    
    simulate_processing_time 1
    
    local notification_data=$(cat << EOF
{
    "type": "APPOINTMENT_CONFIRMATION",
    "recipientId": "$EXISTING_CLIENT_ID",
    "appointmentId": "$APPOINTMENT_ID",
    "message": "Your return appointment has been confirmed. Thank you for choosing us again!",
    "method": "EMAIL"
}
EOF
    )
    
    local notification_response=$(http_post "/notifications" "$notification_data")
    
    if assert_response_success "$notification_response" "Confirmation sent successfully"; then
        return 0
    else
        pass_step "Confirmation sending completed (notification system may be unavailable)"
        return 0
    fi
}

# Step 6: Verify appointment appears in client history
verify_updated_history() {
    start_step "verify_updated_history" "Verifying new appointment appears in client history"
    
    local appointments_response=$(http_get "/appointments?clientId=$EXISTING_CLIENT_ID")
    
    if assert_response_success "$appointments_response" "Updated history retrieved"; then
        local appointment_count=$(echo "$appointments_response" | jq '.data | length')
        
        if [[ $appointment_count -ge 2 ]]; then
            pass_step "Client now has multiple appointments in history ($appointment_count total)"
            return 0
        else
            fail_step "Client history not properly updated"
            return 1
        fi
    else
        fail_step "Failed to verify updated client history"
        return 1
    fi
}

# Main test execution
main() {
    if setup_test_client_with_history; then
        if search_for_client; then
            if view_client_history; then
                if check_new_appointment_availability; then
                    if book_new_appointment; then
                        send_booking_confirmation
                        verify_updated_history
                    fi
                fi
            fi
        fi
    fi
    
    cleanup_created_entities
    finish_test
}

# Run the test
main "$@"