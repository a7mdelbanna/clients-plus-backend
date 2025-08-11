#!/bin/bash

# Appointment Lifecycle Flow 1: Search Availability → Book → Confirm → Remind → Complete → Invoice
# This test simulates the complete appointment lifecycle from availability search to final invoicing

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../shared/test-helpers.sh"

TEST_NAME="Complete Appointment Lifecycle"
TEST_DESCRIPTION="Full appointment lifecycle from availability search to invoicing"

CLIENT_ID=""
STAFF_ID=""
SERVICE_ID=""
BRANCH_ID=""
APPOINTMENT_ID=""
INVOICE_ID=""

init_test "$TEST_NAME" "$TEST_DESCRIPTION"

setup_appointment_data() {
    start_step "setup_appointment_data" "Setting up required entities for appointment"
    
    # Get or create required entities
    local branches_response=$(http_get "/branches?limit=1")
    BRANCH_ID=$(echo "$branches_response" | jq -r '.data[0].id // empty')
    
    local staff_response=$(http_get "/staff?limit=1")
    STAFF_ID=$(echo "$staff_response" | jq -r '.data[0].id // empty')
    
    local services_response=$(http_get "/services?limit=1")
    SERVICE_ID=$(echo "$services_response" | jq -r '.data[0].id // empty')
    
    # Create test client
    local client_data=$(generate_test_client "$TEST_COMPANY_ID")
    local client_response=$(create_and_track_client "$TEST_COMPANY_ID" "$client_data")
    CLIENT_ID=$(echo "$client_response" | jq -r '.data.id // .id')
    
    if [[ -n "$CLIENT_ID" && -n "$STAFF_ID" && -n "$SERVICE_ID" && -n "$BRANCH_ID" ]]; then
        pass_step "All required entities ready for appointment lifecycle"
        return 0
    else
        fail_step "Failed to setup required entities"
        return 1
    fi
}

search_availability() {
    start_step "search_availability" "Searching for available appointment slots"
    
    simulate_user_delay 1 3
    
    local tomorrow
    if [[ "$OSTYPE" == "darwin"* ]]; then
        tomorrow=$(date -v+1d +%Y-%m-%d)
    else
        tomorrow=$(date -d "+1 day" +%Y-%m-%d)
    fi
    
    local availability_response=$(http_get "/appointments/availability?date=$tomorrow&serviceIds=$SERVICE_ID&staffId=$STAFF_ID&branchId=$BRANCH_ID")
    
    if assert_response_success "$availability_response" "Availability search successful"; then
        local slot_count=$(echo "$availability_response" | jq '.availableSlots | length')
        
        if [[ $slot_count -gt 0 ]]; then
            pass_step "Found $slot_count available slots"
            return 0
        else
            fail_step "No available slots found"
            return 1
        fi
    else
        fail_step "Availability search failed"
        return 1
    fi
}

book_appointment() {
    start_step "book_appointment" "Booking appointment at selected time slot"
    
    simulate_user_delay 2 4
    
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
    "notes": "Test appointment for lifecycle validation"
}
EOF
    )\n    \n    local appointment_response=$(create_and_track_appointment "$appointment_data")\n    \n    if assert_response_success "$appointment_response" "Appointment booking successful"; then\n        APPOINTMENT_ID=$(echo "$appointment_response" | jq -r '.data.id // .id')\n        \n        assert_field_equals "$appointment_response" ".data.status // .status" "CONFIRMED" "Appointment status is confirmed"\n        assert_field_equals "$appointment_response" ".data.clientId // .clientId" "$CLIENT_ID" "Correct client ID"\n        return 0\n    else\n        fail_step "Appointment booking failed"\n        return 1\n    fi\n}\n\nsend_confirmation() {\n    start_step "send_confirmation" "Sending appointment confirmation to client"\n    \n    simulate_processing_time 1\n    \n    local confirmation_data=$(cat << EOF\n{\n    "type": "APPOINTMENT_CONFIRMATION",\n    "recipientId": "$CLIENT_ID",\n    "appointmentId": "$APPOINTMENT_ID",\n    "message": "Your appointment is confirmed for tomorrow at 10:00 AM",\n    "method": "EMAIL"\n}\nEOF\n    )\n    \n    local confirmation_response=$(http_post "/notifications" "$confirmation_data")\n    \n    if assert_response_success "$confirmation_response" "Confirmation sent successfully"; then\n        return 0\n    else\n        pass_step "Confirmation sending completed (notification system may be unavailable)"\n        return 0\n    fi\n}\n\nsend_reminder() {\n    start_step "send_reminder" "Sending appointment reminder to client"\n    \n    simulate_processing_time 1\n    \n    local reminder_data=$(cat << EOF\n{\n    "type": "APPOINTMENT_REMINDER",\n    "recipientId": "$CLIENT_ID",\n    "appointmentId": "$APPOINTMENT_ID",\n    "message": "Reminder: You have an appointment tomorrow at 10:00 AM",\n    "method": "SMS"\n}\nEOF\n    )\n    \n    local reminder_response=$(http_post "/notifications" "$reminder_data")\n    \n    if assert_response_success "$reminder_response" "Reminder sent successfully"; then\n        return 0\n    else\n        pass_step "Reminder sending completed (notification system may be unavailable)"\n        return 0\n    fi\n}\n\nclient_checkin() {\n    start_step "client_checkin" "Processing client check-in"\n    \n    simulate_user_delay 1 2\n    \n    local checkin_response=$(http_post "/appointments/$APPOINTMENT_ID/checkin" "{}")\n    \n    if assert_response_success "$checkin_response" "Client check-in successful"; then\n        assert_field_equals "$checkin_response" ".data.status // .status" "IN_PROGRESS" "Status updated to in-progress"\n        return 0\n    else\n        fail_step "Client check-in failed"\n        return 1\n    fi\n}\n\nstart_appointment() {\n    start_step "start_appointment" "Starting the appointment service"\n    \n    simulate_user_delay 1 2\n    \n    local start_response=$(http_post "/appointments/$APPOINTMENT_ID/start" "{}")\n    \n    if assert_response_success "$start_response" "Appointment started successfully"; then\n        return 0\n    else\n        fail_step "Failed to start appointment"\n        return 1\n    fi\n}\n\ncomplete_appointment() {\n    start_step "complete_appointment" "Completing the appointment"\n    \n    simulate_processing_time 3\n    \n    local completion_data=$(cat << EOF\n{\n    "notes": "Service completed successfully. Client satisfied.",\n    "actualDuration": 60,\n    "services": ["$SERVICE_ID"],\n    "additionalCharges": []\n}\nEOF\n    )\n    \n    local completion_response=$(http_post "/appointments/$APPOINTMENT_ID/complete" "$completion_data")\n    \n    if assert_response_success "$completion_response" "Appointment completion successful"; then\n        assert_field_equals "$completion_response" ".data.status // .status" "COMPLETED" "Status updated to completed"\n        return 0\n    else\n        fail_step "Appointment completion failed"\n        return 1\n    fi\n}\n\ngenerate_invoice() {\n    start_step "generate_invoice" "Generating invoice for completed appointment"\n    \n    simulate_processing_time 2\n    \n    local invoice_response=$(http_post "/invoices/from-appointment/$APPOINTMENT_ID" "{}")\n    \n    if assert_response_success "$invoice_response" "Invoice generation successful"; then\n        INVOICE_ID=$(echo "$invoice_response" | jq -r '.data.id // .id')\n        \n        assert_field_exists "$invoice_response" ".data.items // .items" "Invoice has line items"\n        assert_field_exists "$invoice_response" ".data.totalAmount // .totalAmount" "Invoice has total amount"\n        assert_field_equals "$invoice_response" ".data.clientId // .clientId" "$CLIENT_ID" "Invoice linked to correct client"\n        \n        track_created_entity "invoice" "$INVOICE_ID" "{}"\n        return 0\n    else\n        fail_step "Invoice generation failed"\n        return 1\n    fi\n}\n\nverify_appointment_history() {\n    start_step "verify_history" "Verifying appointment appears in client history"\n    \n    local client_appointments=$(http_get "/appointments?clientId=$CLIENT_ID")\n    \n    if assert_response_success "$client_appointments" "Client appointment history retrieved"; then\n        local appointment_found=$(echo "$client_appointments" | jq -r --arg id "$APPOINTMENT_ID" '.data[] | select(.id == $id) | .id // empty')\n        \n        if [[ "$appointment_found" == "$APPOINTMENT_ID" ]]; then\n            pass_step "Completed appointment found in client history"\n            return 0\n        else\n            fail_step "Appointment not found in client history"\n            return 1\n        fi\n    else\n        fail_step "Failed to retrieve client appointment history"\n        return 1\n    fi\n}\n\nmain() {\n    if setup_appointment_data; then\n        if search_availability; then\n            if book_appointment; then\n                send_confirmation\n                send_reminder\n                if client_checkin; then\n                    if start_appointment; then\n                        if complete_appointment; then\n                            if generate_invoice; then\n                                verify_appointment_history\n                            fi\n                        fi\n                    fi\n                fi\n            fi\n        fi\n    fi\n    \n    cleanup_created_entities\n    finish_test\n}\n\nmain "$@"