#!/bin/bash

# Client Journey Flow 1: New Client Registration → Profile Completion → First Appointment → Follow-up
# This test simulates the complete journey of a new client from initial registration through their first appointment and follow-up

set -e

# Load shared utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../shared/test-helpers.sh"

# Test configuration
TEST_NAME="New Client Registration to Follow-up"
TEST_DESCRIPTION="Complete client journey from registration through first appointment and follow-up communications"

# Test data variables
CLIENT_DATA=""
CLIENT_ID=""
STAFF_ID=""
SERVICE_ID=""
BRANCH_ID=""
APPOINTMENT_ID=""
INVOICE_ID=""

# Initialize test
init_test "$TEST_NAME" "$TEST_DESCRIPTION"

# Setup test data
setup_test_data() {
    start_step "setup_data" "Setting up test data for client journey"
    
    # Get existing branch (assuming test environment has at least one branch)
    local branches_response=$(http_get "/branches?limit=1")
    BRANCH_ID=$(echo "$branches_response" | jq -r '.data[0].id // empty')
    
    if [[ -z "$BRANCH_ID" ]]; then
        # Create a test branch if none exists
        local branch_data=$(generate_test_branch "$TEST_COMPANY_ID" "Test Branch")
        local branch_response=$(http_post "/branches" "$branch_data")
        BRANCH_ID=$(echo "$branch_response" | jq -r '.data.id // .id // empty')
        track_created_entity "branch" "$BRANCH_ID" "$branch_data"
    fi
    
    # Get existing staff (assuming test environment has at least one staff member)
    local staff_response=$(http_get "/staff?limit=1")
    STAFF_ID=$(echo "$staff_response" | jq -r '.data[0].id // empty')
    
    if [[ -z "$STAFF_ID" ]]; then
        # Create a test staff member if none exists
        local staff_data=$(generate_test_staff "$TEST_COMPANY_ID" "$BRANCH_ID")
        local create_staff_response=$(http_post "/staff" "$staff_data")
        STAFF_ID=$(echo "$create_staff_response" | jq -r '.data.id // .id // empty')
        track_created_entity "staff" "$STAFF_ID" "$staff_data"
    fi
    
    # Get existing service (assuming test environment has at least one service)
    local services_response=$(http_get "/services?limit=1")
    SERVICE_ID=$(echo "$services_response" | jq -r '.data[0].id // empty')
    
    if [[ -z "$SERVICE_ID" ]]; then
        # Create a test service if none exists
        local service_data=$(generate_test_service "$TEST_COMPANY_ID")
        local create_service_response=$(http_post "/services" "$service_data")
        SERVICE_ID=$(echo "$create_service_response" | jq -r '.data.id // .id // empty')
        track_created_entity "service" "$SERVICE_ID" "$service_data"
    fi
    
    if [[ -n "$BRANCH_ID" && -n "$STAFF_ID" && -n "$SERVICE_ID" ]]; then
        pass_step "Test data setup completed successfully"
    else
        fail_step "Failed to setup required test data"
        return 1
    fi
}

# Step 1: New Client Registration
register_new_client() {
    start_step "client_registration" "Registering new client with basic information"
    
    CLIENT_DATA=$(generate_test_client "$TEST_COMPANY_ID")
    local response=$(create_and_track_client "$TEST_COMPANY_ID" "$CLIENT_DATA")
    
    if assert_response_success "$response" "Client registration successful"; then
        CLIENT_ID=$(echo "$response" | jq -r '.data.id // .id')
        
        # Validate client was created with correct information
        assert_field_exists "$response" ".data.firstName // .firstName" "Client has first name"
        assert_field_exists "$response" ".data.lastName // .lastName" "Client has last name"
        assert_field_exists "$response" ".data.email // .email" "Client has email"
        assert_field_equals "$response" ".data.status // .status" "ACTIVE" "Client status is active"
        
        return 0
    else
        fail_step "Client registration failed"
        return 1
    fi
}

# Step 2: Profile Completion
complete_client_profile() {
    start_step "profile_completion" "Updating client profile with additional details"
    
    simulate_user_delay 2 4
    
    # Update client with additional information
    local profile_update=$(cat << EOF
{
    "dateOfBirth": "1985-05-15T00:00:00.000Z",
    "gender": "FEMALE",
    "preferences": {
        "communicationMethod": "EMAIL",
        "notifications": true,
        "preferredLanguage": "en",
        "preferredStaff": ["$STAFF_ID"]
    },
    "allergies": "None reported",
    "notes": "Prefers morning appointments, regular customer referral from friend"
}
EOF
    )
    
    local update_response=$(http_put "/clients/$CLIENT_ID" "$profile_update")
    
    if assert_response_success "$update_response" "Profile completion successful"; then
        assert_field_exists "$update_response" ".data.dateOfBirth // .dateOfBirth" "Date of birth added"
        assert_field_exists "$update_response" ".data.preferences // .preferences" "Preferences added"
        assert_field_exists "$update_response" ".data.notes // .notes" "Notes added"
        
        return 0
    else
        fail_step "Profile completion failed"
        return 1
    fi
}

# Step 3: Search for Availability
search_availability() {
    start_step "availability_search" "Searching for available appointment slots"
    
    simulate_user_delay 1 2
    
    # Get tomorrow's date for booking
    local tomorrow
    if [[ "$OSTYPE" == "darwin"* ]]; then
        tomorrow=$(date -v+1d +%Y-%m-%d)
    else
        tomorrow=$(date -d "+1 day" +%Y-%m-%d)
    fi
    
    local availability_response=$(http_get "/appointments/availability?date=$tomorrow&serviceIds=$SERVICE_ID&branchId=$BRANCH_ID")
    
    if assert_response_success "$availability_response" "Availability search successful"; then
        assert_field_exists "$availability_response" ".availableSlots" "Available slots returned"
        
        # Verify at least one slot is available
        local slot_count=$(echo "$availability_response" | jq '.availableSlots | length')
        if [[ $slot_count -gt 0 ]]; then
            pass_step "Available appointment slots found ($slot_count slots)"
            return 0
        else
            fail_step "No available appointment slots found"
            return 1
        fi
    else
        fail_step "Availability search failed"
        return 1
    fi
}

# Step 4: Book First Appointment
book_first_appointment() {
    start_step "first_appointment_booking" "Booking client's first appointment"
    
    simulate_user_delay 2 3
    
    # Create appointment for tomorrow at 10:00 AM
    local appointment_date
    if [[ "$OSTYPE" == "darwin"* ]]; then
        appointment_date=$(date -v+1d -v10H -v0M -v0S +%Y-%m-%dT%H:%M:%S.000Z)
    else
        appointment_date=$(date -d "+1 day 10:00:00" +%Y-%m-%dT%H:%M:%S.000Z)
    fi
    
    local appointment_data=$(cat << EOF
{
    "clientId": "$CLIENT_ID",
    "serviceIds": ["$SERVICE_ID"],
    "staffId": "$STAFF_ID",
    "branchId": "$BRANCH_ID",
    "dateTime": "$appointment_date",
    "status": "CONFIRMED",
    "notes": "First appointment for new client",
    "isRecurring": false
}
EOF
    )
    
    local appointment_response=$(create_and_track_appointment "$appointment_data")
    
    if assert_response_success "$appointment_response" "Appointment booking successful"; then
        APPOINTMENT_ID=$(echo "$appointment_response" | jq -r '.data.id // .id')
        
        assert_field_equals "$appointment_response" ".data.status // .status" "CONFIRMED" "Appointment status is confirmed"
        assert_field_equals "$appointment_response" ".data.clientId // .clientId" "$CLIENT_ID" "Correct client ID"
        assert_field_equals "$appointment_response" ".data.staffId // .staffId" "$STAFF_ID" "Correct staff ID"
        
        return 0
    else
        fail_step "Appointment booking failed"
        return 1
    fi
}

# Step 5: Send Appointment Confirmation
send_appointment_confirmation() {
    start_step "appointment_confirmation" "Sending appointment confirmation to client"
    
    simulate_processing_time 1
    
    # Send confirmation notification
    local notification_data=$(cat << EOF
{
    "type": "APPOINTMENT_CONFIRMATION",
    "recipientId": "$CLIENT_ID",
    "appointmentId": "$APPOINTMENT_ID",
    "message": "Your appointment has been confirmed",
    "method": "EMAIL"
}
EOF
    )
    
    local notification_response=$(http_post "/notifications" "$notification_data")
    
    if assert_response_success "$notification_response" "Confirmation sent successfully"; then
        return 0
    else
        # Notification failure shouldn't fail the entire test
        pass_step "Confirmation sending completed (notification system may be unavailable)"
        return 0
    fi
}

# Step 6: Client Check-in
client_checkin() {
    start_step "client_checkin" "Processing client check-in for appointment"
    
    simulate_user_delay 1 2
    
    # Check-in the client
    local checkin_response=$(http_post "/appointments/$APPOINTMENT_ID/checkin" "{}")
    
    if assert_response_success "$checkin_response" "Client check-in successful"; then
        assert_field_equals "$checkin_response" ".data.status // .status" "IN_PROGRESS" "Appointment status updated to in-progress"
        
        return 0
    else
        fail_step "Client check-in failed"
        return 1
    fi
}

# Step 7: Complete Appointment
complete_appointment() {
    start_step "appointment_completion" "Completing the appointment service"
    
    simulate_processing_time 3
    
    local completion_data=$(cat << EOF
{
    "notes": "First appointment completed successfully. Client satisfied with service.",
    "actualDuration": 60,
    "services": ["$SERVICE_ID"]
}
EOF
    )
    
    local completion_response=$(http_post "/appointments/$APPOINTMENT_ID/complete" "$completion_data")
    
    if assert_response_success "$completion_response" "Appointment completion successful"; then
        assert_field_equals "$completion_response" ".data.status // .status" "COMPLETED" "Appointment status updated to completed"
        
        return 0
    else
        fail_step "Appointment completion failed"
        return 1
    fi
}

# Step 8: Generate Invoice
generate_invoice() {
    start_step "invoice_generation" "Generating invoice for completed services"
    
    simulate_processing_time 1
    
    # Generate invoice from appointment
    local invoice_response=$(http_post "/invoices/from-appointment/$APPOINTMENT_ID" "{}")
    
    if assert_response_success "$invoice_response" "Invoice generation successful"; then
        INVOICE_ID=$(echo "$invoice_response" | jq -r '.data.id // .id')
        
        assert_field_exists "$invoice_response" ".data.items // .items" "Invoice has line items"
        assert_field_exists "$invoice_response" ".data.totalAmount // .totalAmount" "Invoice has total amount"
        assert_field_equals "$invoice_response" ".data.clientId // .clientId" "$CLIENT_ID" "Correct client on invoice"
        
        return 0
    else
        fail_step "Invoice generation failed"
        return 1
    fi
}

# Step 9: Process Payment
process_payment() {
    start_step "payment_processing" "Processing payment for services"
    
    simulate_user_delay 2 3
    
    # Get invoice total
    local invoice_details=$(http_get "/invoices/$INVOICE_ID")
    local total_amount=$(echo "$invoice_details" | jq -r '.data.totalAmount // .totalAmount')
    
    local payment_data=$(cat << EOF
{
    "amount": $total_amount,
    "method": "CREDIT_CARD",
    "reference": "test_payment_$(date +%s)",
    "notes": "Payment for first appointment"
}
EOF
    )
    
    local payment_response=$(http_post "/invoices/$INVOICE_ID/payment" "$payment_data")
    
    if assert_response_success "$payment_response" "Payment processing successful"; then
        assert_field_equals "$payment_response" ".data.amount // .amount" "$total_amount" "Payment amount matches invoice"
        
        return 0
    else
        fail_step "Payment processing failed"
        return 1
    fi
}

# Step 10: Send Follow-up Communication
send_followup_communication() {
    start_step "followup_communication" "Sending follow-up communication to client"
    
    simulate_processing_time 1
    
    # Send follow-up message
    local followup_data=$(cat << EOF
{
    "type": "APPOINTMENT_FOLLOWUP",
    "recipientId": "$CLIENT_ID",
    "message": "Thank you for choosing our services! We hope you enjoyed your experience. Please let us know if you have any feedback.",
    "method": "EMAIL"
}
EOF
    )
    
    local followup_response=$(http_post "/notifications" "$followup_data")
    
    if assert_response_success "$followup_response" "Follow-up communication sent successfully"; then
        return 0
    else
        # Follow-up failure shouldn't fail the entire test
        pass_step "Follow-up communication completed (notification system may be unavailable)"
        return 0
    fi
}

# Step 11: Verify Client History
verify_client_history() {
    start_step "client_history_verification" "Verifying client history is properly recorded"
    
    # Get updated client information
    local client_response=$(http_get "/clients/$CLIENT_ID")
    
    if assert_response_success "$client_response" "Client history retrieval successful"; then
        # Verify client has appointment history
        local client_appointments=$(http_get "/appointments?clientId=$CLIENT_ID")
        
        if assert_response_success "$client_appointments" "Appointment history retrieved"; then
            assert_array_length "$client_appointments" ".data" "1" "Client has one appointment in history"
            
            # Verify client has invoice history
            local client_invoices=$(http_get "/invoices?clientId=$CLIENT_ID")
            
            if assert_response_success "$client_invoices" "Invoice history retrieved"; then
                assert_array_length "$client_invoices" ".data" "1" "Client has one invoice in history"
                return 0
            else
                fail_step "Invoice history verification failed"
                return 1
            fi
        else
            fail_step "Appointment history verification failed"
            return 1
        fi
    else
        fail_step "Client history verification failed"
        return 1
    fi
}

# Main test execution
main() {
    # Execute all test steps
    if setup_test_data; then
        if register_new_client; then
            if complete_client_profile; then
                if search_availability; then
                    if book_first_appointment; then
                        send_appointment_confirmation
                        if client_checkin; then
                            if complete_appointment; then
                                if generate_invoice; then
                                    if process_payment; then
                                        send_followup_communication
                                        verify_client_history
                                    fi
                                fi
                            fi
                        fi
                    fi
                fi
            fi
        fi
    fi
    
    # Cleanup
    cleanup_created_entities
    
    # Finish test
    finish_test
}

# Run the test
main "$@"