#!/bin/bash

# Manual Test Execution Helper Script for Merchant Module
# This script provides an interactive menu to guide testers through test cases

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test results tracking
PASSED=0
FAILED=0
SKIPPED=0
TOTAL=0

# Print functions
print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_test_case() {
    echo -e "${CYAN}Test Case $1: $2${NC}"
    echo -e "${PURPLE}Priority: $3${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Function to record test result
record_result() {
    local result=$1
    TOTAL=$((TOTAL + 1))

    case $result in
        "pass")
            PASSED=$((PASSED + 1))
            print_success "Test PASSED"
            ;;
        "fail")
            FAILED=$((FAILED + 1))
            print_error "Test FAILED"
            ;;
        "skip")
            SKIPPED=$((SKIPPED + 1))
            print_warning "Test SKIPPED"
            ;;
    esac
    echo ""
}

# Function to get test result from user
get_test_result() {
    echo -e "${YELLOW}Enter test result:${NC}"
    echo "1) Pass"
    echo "2) Fail"
    echo "3) Skip"
    read -p "Choice (1-3): " result_choice

    case $result_choice in
        1) record_result "pass" ;;
        2)
            record_result "fail"
            read -p "Enter failure details: " failure_details
            echo "$failure_details" >> test-failures.log
            ;;
        3) record_result "skip" ;;
        *)
            print_warning "Invalid choice. Marking as skipped."
            record_result "skip"
            ;;
    esac
}

# Function to print test steps
print_steps() {
    echo -e "${CYAN}Steps:${NC}"
    local i=1
    for step in "$@"; do
        echo "  $i. $step"
        i=$((i + 1))
    done
    echo ""
}

# Function to print expected results
print_expected() {
    echo -e "${GREEN}Expected Results:${NC}"
    for result in "$@"; do
        echo "  ✓ $result"
    done
    echo ""
}

# Main menu
show_main_menu() {
    clear
    print_header "QuickLink Pay Admin Dashboard - Manual Test Runner"

    echo "Test Categories:"
    echo "1) Merchant Management Tests"
    echo "2) Support Ticket Management Tests"
    echo "3) Payout Processing Tests"
    echo "4) Permissions & RBAC Tests"
    echo "5) Integration Tests"
    echo "6) View Test Summary"
    echo "7) Generate Test Report"
    echo "8) Exit"
    echo ""
    read -p "Select category (1-8): " category_choice

    case $category_choice in
        1) run_merchant_tests ;;
        2) run_ticket_tests ;;
        3) run_payout_tests ;;
        4) run_rbac_tests ;;
        5) run_integration_tests ;;
        6) show_test_summary ;;
        7) generate_test_report ;;
        8) exit_script ;;
        *)
            print_error "Invalid choice"
            sleep 2
            show_main_menu
            ;;
    esac
}

# Merchant Management Tests
run_merchant_tests() {
    clear
    print_header "1. Merchant Management Tests"

    echo "Select test:"
    echo "1) Load Merchants Successfully (1.1.1)"
    echo "2) Filter Merchants by Status (1.1.2)"
    echo "3) Search Merchants (1.1.3)"
    echo "4) View Merchant Details (1.2.1)"
    echo "5) Create New Merchant (1.3.1)"
    echo "6) Update Merchant Information (1.3.3)"
    echo "7) Run All Merchant Tests"
    echo "8) Back to Main Menu"
    echo ""
    read -p "Select test (1-8): " test_choice

    case $test_choice in
        1) test_load_merchants ;;
        2) test_filter_merchants ;;
        3) test_search_merchants ;;
        4) test_view_merchant_details ;;
        5) test_create_merchant ;;
        6) test_update_merchant ;;
        7) run_all_merchant_tests ;;
        8) show_main_menu ;;
        *)
            print_error "Invalid choice"
            sleep 2
            run_merchant_tests
            ;;
    esac
}

# Individual test functions
test_load_merchants() {
    clear
    print_test_case "1.1.1" "Load Merchants Successfully" "High"

    print_info "Prerequisites:"
    echo "  - Admin user logged in with merchantManagement.read permission"
    echo "  - At least 10 merchants in database"
    echo ""

    print_steps \
        "Navigate to /merchants" \
        "Wait for data to load"

    print_expected \
        "Page loads without errors" \
        "Merchant list displays" \
        "Shows merchant business name, email, status, KYC status" \
        "Pagination controls visible" \
        "Loading state shown during fetch"

    read -p "Press Enter after completing test steps..."
    get_test_result

    run_merchant_tests
}

test_filter_merchants() {
    clear
    print_test_case "1.1.2" "Filter Merchants by Status" "High"

    print_steps \
        "Navigate to /merchants" \
        "Click status filter dropdown" \
        "Select 'Active'" \
        "Verify filtered results" \
        "Select 'Pending'" \
        "Verify filtered results"

    print_expected \
        "Only merchants with selected status are displayed" \
        "Filter persists on page refresh" \
        "Can clear filter to show all merchants" \
        "Counter shows correct number of filtered results"

    read -p "Press Enter after completing test steps..."
    get_test_result

    run_merchant_tests
}

test_search_merchants() {
    clear
    print_test_case "1.1.3" "Search Merchants" "High"

    print_info "Test Data:"
    echo "  - Search Term: 'Tech Solutions'"
    echo "  - Search Term: 'test@example.com'"
    echo ""

    print_steps \
        "Navigate to /merchants" \
        "Type 'Tech Solutions' in search box" \
        "Press Enter or wait for debounce" \
        "Verify results"

    print_expected \
        "Search filters merchants by business name" \
        "Search filters merchants by email" \
        "Search is case-insensitive" \
        "Shows 'No results' message when no matches" \
        "Clears results when search cleared"

    read -p "Press Enter after completing test steps..."
    get_test_result

    run_merchant_tests
}

test_view_merchant_details() {
    clear
    print_test_case "1.2.1" "View Merchant Details" "High"

    print_steps \
        "Navigate to /merchants" \
        "Click on a merchant row" \
        "Verify merchant details page loads"

    print_expected \
        "Shows business information" \
        "Shows account status" \
        "Shows KYC status and documents" \
        "Shows wallet balance" \
        "Shows subscription plan" \
        "Shows registration date" \
        "Shows transaction statistics"

    read -p "Press Enter after completing test steps..."
    get_test_result

    run_merchant_tests
}

test_create_merchant() {
    clear
    print_test_case "1.3.1" "Create New Merchant" "High"

    print_info "Test Data:"
    echo "  - Business Name: 'Test Merchant Ltd'"
    echo "  - Email: 'testmerchant@example.com'"
    echo "  - Phone: '+233XXXXXXXXX'"
    echo "  - Country: 'Ghana'"
    echo "  - Business Type: 'Retail'"
    echo ""

    print_steps \
        "Navigate to /merchants" \
        "Click 'Add Merchant' button" \
        "Fill all required fields with test data" \
        "Click 'Create Merchant'"

    print_expected \
        "Form validates all required fields" \
        "Success message displayed" \
        "Merchant appears in merchant list" \
        "Merchant ID auto-generated" \
        "Status set to 'pending' by default" \
        "Audit log entry created"

    read -p "Press Enter after completing test steps..."
    get_test_result

    run_merchant_tests
}

test_update_merchant() {
    clear
    print_test_case "1.3.3" "Update Merchant Information" "High"

    print_steps \
        "Open merchant details" \
        "Click 'Edit' button" \
        "Update business name to 'Updated Business Name'" \
        "Update phone number" \
        "Click 'Save Changes'"

    print_expected \
        "Changes saved successfully" \
        "Success message displayed" \
        "Updated information reflected immediately" \
        "Audit log entry created" \
        "updatedAt timestamp updated"

    read -p "Press Enter after completing test steps..."
    get_test_result

    run_merchant_tests
}

run_all_merchant_tests() {
    test_load_merchants
    test_filter_merchants
    test_search_merchants
    test_view_merchant_details
    test_create_merchant
    test_update_merchant
}

# Support Ticket Tests
run_ticket_tests() {
    clear
    print_header "2. Support Ticket Management Tests"

    echo "Select test:"
    echo "1) Load Support Tickets (2.1.1)"
    echo "2) Filter Tickets by Status (2.1.2)"
    echo "3) Create New Ticket (2.2.1)"
    echo "4) View Ticket Details (2.3.1)"
    echo "5) Assign Ticket to Agent (2.4.1)"
    echo "6) Resolve Ticket (2.5.3)"
    echo "7) Add Internal Note (2.6.1)"
    echo "8) Send Message to Merchant (2.6.2)"
    echo "9) Run All Ticket Tests"
    echo "10) Back to Main Menu"
    echo ""
    read -p "Select test (1-10): " test_choice

    case $test_choice in
        1) test_load_tickets ;;
        2) test_filter_tickets ;;
        3) test_create_ticket ;;
        4) test_view_ticket ;;
        5) test_assign_ticket ;;
        6) test_resolve_ticket ;;
        7) test_add_internal_note ;;
        8) test_send_merchant_message ;;
        9) run_all_ticket_tests ;;
        10) show_main_menu ;;
        *)
            print_error "Invalid choice"
            sleep 2
            run_ticket_tests
            ;;
    esac
}

test_load_tickets() {
    clear
    print_test_case "2.1.1" "Load Support Tickets" "High"

    print_steps \
        "Navigate to /merchants/support-tickets" \
        "Wait for tickets to load"

    print_expected \
        "Ticket list displays" \
        "Shows ticket number, merchant, subject, status, priority" \
        "Tickets sorted by created date (newest first)" \
        "Pagination works correctly" \
        "Loading state shown"

    read -p "Press Enter after completing test steps..."
    get_test_result

    run_ticket_tests
}

test_filter_tickets() {
    clear
    print_test_case "2.1.2" "Filter Tickets by Status" "High"

    print_steps \
        "Navigate to support tickets" \
        "Select status filter: 'Open'" \
        "Verify results" \
        "Change to 'Assigned'" \
        "Verify results"

    print_expected \
        "Only tickets with selected status shown" \
        "Filter persists on refresh" \
        "Can select multiple statuses" \
        "'Clear Filters' button works"

    read -p "Press Enter after completing test steps..."
    get_test_result

    run_ticket_tests
}

test_create_ticket() {
    clear
    print_test_case "2.2.1" "Create New Ticket" "Critical"

    print_info "Test Data:"
    echo "  - Merchant: 'Test Merchant Ltd'"
    echo "  - Subject: 'Payment processing issue'"
    echo "  - Description: 'Merchant reports failed transactions'"
    echo "  - Category: 'Payment Issue'"
    echo "  - Priority: 'High'"
    echo ""

    print_steps \
        "Navigate to /merchants/support-tickets" \
        "Click 'Create Ticket' button" \
        "Fill form with test data" \
        "Click 'Create Ticket'"

    print_expected \
        "Ticket created successfully" \
        "Auto-generated ticket number (TKT-XXXXXXXX)" \
        "Status set to 'open'" \
        "SLA timers start automatically" \
        "Ticket appears in list" \
        "Success message displayed" \
        "Activity log entry created"

    read -p "Press Enter after completing test steps..."
    get_test_result

    run_ticket_tests
}

test_view_ticket() {
    clear
    print_test_case "2.3.1" "View Ticket Details" "High"

    print_steps \
        "Click on a ticket from the list" \
        "Wait for details to load"

    print_expected \
        "Shows complete ticket information" \
        "Shows merchant details" \
        "Shows ticket status and priority with badges" \
        "Shows SLA timers" \
        "Shows assigned agent (if assigned)" \
        "Shows all messages/notes" \
        "Shows activity timeline"

    read -p "Press Enter after completing test steps..."
    get_test_result

    run_ticket_tests
}

test_assign_ticket() {
    clear
    print_test_case "2.4.1" "Assign Ticket to Agent" "High"

    print_steps \
        "Open unassigned ticket" \
        "Click 'Assign' button" \
        "Select agent from dropdown" \
        "Click 'Assign Ticket'"

    print_expected \
        "Ticket assigned successfully" \
        "Status changes to 'assigned'" \
        "Assignment info recorded" \
        "Activity log entry created" \
        "SLA timer continues"

    read -p "Press Enter after completing test steps..."
    get_test_result

    run_ticket_tests
}

test_resolve_ticket() {
    clear
    print_test_case "2.5.3" "Resolve Ticket" "Critical"

    print_steps \
        "Open ticket in progress" \
        "Click 'Resolve Ticket'" \
        "Select resolution type: 'Resolved'" \
        "Add resolution notes" \
        "Click 'Mark as Resolved'"

    print_expected \
        "Status changes to 'resolved'" \
        "Resolution info recorded" \
        "SLA metrics calculated" \
        "Activity log entry created" \
        "Auto-close timer starts (if configured)"

    read -p "Press Enter after completing test steps..."
    get_test_result

    run_ticket_tests
}

test_add_internal_note() {
    clear
    print_test_case "2.6.1" "Add Internal Note" "High"

    print_steps \
        "Open ticket" \
        "Switch to 'Internal Notes' tab" \
        "Type note: 'Investigating database logs'" \
        "Click 'Add Note'"

    print_expected \
        "Note added successfully" \
        "Note visible to admins only" \
        "Not visible to merchant" \
        "Timestamp and author recorded" \
        "Activity log entry created"

    read -p "Press Enter after completing test steps..."
    get_test_result

    run_ticket_tests
}

test_send_merchant_message() {
    clear
    print_test_case "2.6.2" "Send Message to Merchant" "Critical"

    print_steps \
        "Open ticket" \
        "Switch to 'Messages' tab" \
        "Type message: 'We've identified the issue'" \
        "Click 'Send Message'"

    print_expected \
        "Message sent successfully" \
        "Visible to merchant" \
        "Timestamp recorded" \
        "Activity log entry created" \
        "If first response: SLA first response time recorded"

    read -p "Press Enter after completing test steps..."
    get_test_result

    run_ticket_tests
}

run_all_ticket_tests() {
    test_load_tickets
    test_filter_tickets
    test_create_ticket
    test_view_ticket
    test_assign_ticket
    test_resolve_ticket
    test_add_internal_note
    test_send_merchant_message
}

# Payout Tests
run_payout_tests() {
    clear
    print_header "3. Payout Processing Tests"

    echo "Select test:"
    echo "1) Load Payouts (3.1.1)"
    echo "2) Process Manual Payout - Full Balance (3.2.1)"
    echo "3) Process Manual Payout - Partial Amount (3.2.2)"
    echo "4) Process Payout - Insufficient Balance (3.2.3)"
    echo "5) View Payout Details (3.3.1)"
    echo "6) Run All Payout Tests"
    echo "7) Back to Main Menu"
    echo ""
    read -p "Select test (1-7): " test_choice

    case $test_choice in
        1) test_load_payouts ;;
        2) test_process_payout_full ;;
        3) test_process_payout_partial ;;
        4) test_process_payout_insufficient ;;
        5) test_view_payout_details ;;
        6) run_all_payout_tests ;;
        7) show_main_menu ;;
        *)
            print_error "Invalid choice"
            sleep 2
            run_payout_tests
            ;;
    esac
}

test_load_payouts() {
    clear
    print_test_case "3.1.1" "Load Payouts" "High"

    print_steps \
        "Navigate to /merchants/payouts" \
        "Wait for data to load"

    print_expected \
        "Payout list displays" \
        "Shows payout ID, merchant, amount, status" \
        "Pagination works" \
        "Loading state shown"

    read -p "Press Enter after completing test steps..."
    get_test_result

    run_payout_tests
}

test_process_payout_full() {
    clear
    print_test_case "3.2.1" "Process Manual Payout - Full Balance" "Critical"

    print_info "Prerequisites:"
    echo "  - Merchant with balance > 0 (e.g., GHS 500)"
    echo "  - Paystack integration configured"
    echo ""

    print_steps \
        "Navigate to /merchants/payouts" \
        "Click 'Process Manual Payout'" \
        "Select merchant with balance" \
        "Leave amount field empty (process full balance)" \
        "Add description: 'Manual payout - weekly settlement'" \
        "Click 'Process Payout'"

    print_expected \
        "Payout initiated successfully" \
        "Transfer created in Paystack" \
        "Payout record created in Firestore" \
        "Success message with transfer code displayed" \
        "Merchant balance updated" \
        "Activity log entry created"

    read -p "Press Enter after completing test steps..."
    get_test_result

    run_payout_tests
}

test_process_payout_partial() {
    clear
    print_test_case "3.2.2" "Process Manual Payout - Partial Amount" "High"

    print_info "Test Data:"
    echo "  - Merchant balance: GHS 1000"
    echo "  - Payout amount: GHS 300"
    echo ""

    print_steps \
        "Click 'Process Manual Payout'" \
        "Select merchant with balance GHS 1000" \
        "Enter amount: GHS 300" \
        "Add description" \
        "Click 'Process Payout'"

    print_expected \
        "Payout for GHS 300 processed" \
        "Merchant balance reduced by GHS 300" \
        "Remaining balance: GHS 700" \
        "Success message displayed"

    read -p "Press Enter after completing test steps..."
    get_test_result

    run_payout_tests
}

test_process_payout_insufficient() {
    clear
    print_test_case "3.2.3" "Process Payout - Insufficient Balance" "High"

    print_info "This is a NEGATIVE test - should fail"
    echo ""

    print_steps \
        "Click 'Process Manual Payout'" \
        "Select merchant with balance GHS 100" \
        "Enter amount: GHS 500" \
        "Click 'Process Payout'"

    print_expected \
        "Error message: 'Insufficient balance'" \
        "Payout not created" \
        "Balance unchanged" \
        "No Paystack API call made"

    read -p "Press Enter after completing test steps..."
    get_test_result

    run_payout_tests
}

test_view_payout_details() {
    clear
    print_test_case "3.3.1" "View Payout Details" "Medium"

    print_steps \
        "Click on a payout from the list" \
        "View details modal/page"

    print_expected \
        "Shows payout ID" \
        "Shows merchant details" \
        "Shows amount and status" \
        "Shows transfer code" \
        "Shows initiated by and timestamp" \
        "Shows completed at (if completed)"

    read -p "Press Enter after completing test steps..."
    get_test_result

    run_payout_tests
}

run_all_payout_tests() {
    test_load_payouts
    test_process_payout_full
    test_process_payout_partial
    test_process_payout_insufficient
    test_view_payout_details
}

# RBAC Tests
run_rbac_tests() {
    clear
    print_header "4. Permissions & RBAC Tests"

    echo "Select test:"
    echo "1) Super Admin - Full Access (4.1.1)"
    echo "2) Support Lead - Ticket Management (4.2.1)"
    echo "3) Support Lead - Restricted Actions (4.2.2)"
    echo "4) Support Agent - Ticket Handling (4.3.1)"
    echo "5) Support Agent - Restricted Actions (4.3.2)"
    echo "6) Run All RBAC Tests"
    echo "7) Back to Main Menu"
    echo ""
    read -p "Select test (1-7): " test_choice

    case $test_choice in
        1) test_super_admin_access ;;
        2) test_support_lead_access ;;
        3) test_support_lead_restrictions ;;
        4) test_support_agent_access ;;
        5) test_support_agent_restrictions ;;
        6) run_all_rbac_tests ;;
        7) show_main_menu ;;
        *)
            print_error "Invalid choice"
            sleep 2
            run_rbac_tests
            ;;
    esac
}

test_super_admin_access() {
    clear
    print_test_case "4.1.1" "Super Admin - Full Access" "High"

    print_info "Prerequisites: Logged in as super_admin"
    echo ""

    print_steps \
        "Attempt to access all merchant module features" \
        "Verify full access granted"

    print_expected \
        "Can view all merchants" \
        "Can create/update/delete merchants" \
        "Can view/create/update tickets" \
        "Can delete tickets" \
        "Can process payouts" \
        "Can view audit logs" \
        "No permission errors"

    read -p "Press Enter after completing test steps..."
    get_test_result

    run_rbac_tests
}

test_support_lead_access() {
    clear
    print_test_case "4.2.1" "Support Lead - Ticket Management" "High"

    print_info "Prerequisites: Logged in as merchant_support_lead"
    echo ""

    print_steps \
        "Navigate to support tickets" \
        "Create new ticket" \
        "Assign ticket to agent" \
        "Escalate ticket" \
        "View ticket reports"

    print_expected \
        "Can view all tickets" \
        "Can create tickets" \
        "Can assign tickets" \
        "Can escalate tickets" \
        "Can view team performance" \
        "Can access reports"

    read -p "Press Enter after completing test steps..."
    get_test_result

    run_rbac_tests
}

test_support_lead_restrictions() {
    clear
    print_test_case "4.2.2" "Support Lead - Restricted Actions" "High"

    print_info "This is a NEGATIVE test - actions should be DENIED"
    echo ""

    print_steps \
        "Attempt to delete merchant" \
        "Attempt to modify system config" \
        "Attempt to delete audit logs"

    print_expected \
        "Delete merchant: DENIED" \
        "Modify system config: DENIED" \
        "Delete audit logs: DENIED" \
        "Appropriate error messages shown"

    read -p "Press Enter after completing test steps..."
    get_test_result

    run_rbac_tests
}

test_support_agent_access() {
    clear
    print_test_case "4.3.1" "Support Agent - Ticket Handling" "High"

    print_info "Prerequisites: Logged in as merchant_support_agent"
    echo ""

    print_steps \
        "View tickets assigned to agent" \
        "Update ticket status" \
        "Add messages and notes" \
        "Attempt to view unassigned tickets"

    print_expected \
        "Can view assigned tickets" \
        "Can update status of assigned tickets" \
        "Can add messages" \
        "Can add internal notes" \
        "Can view merchant details (read-only)"

    read -p "Press Enter after completing test steps..."
    get_test_result

    run_rbac_tests
}

test_support_agent_restrictions() {
    clear
    print_test_case "4.3.2" "Support Agent - Restricted Actions" "High"

    print_info "This is a NEGATIVE test - actions should be DENIED"
    echo ""

    print_steps \
        "Attempt to delete ticket" \
        "Attempt to assign ticket to another agent" \
        "Attempt to escalate ticket" \
        "Attempt to process payout"

    print_expected \
        "Delete ticket: DENIED" \
        "Assign ticket: DENIED (or limited)" \
        "Escalate ticket: DENIED (or limited)" \
        "Process payout: DENIED"

    read -p "Press Enter after completing test steps..."
    get_test_result

    run_rbac_tests
}

run_all_rbac_tests() {
    test_super_admin_access
    test_support_lead_access
    test_support_lead_restrictions
    test_support_agent_access
    test_support_agent_restrictions
}

# Integration Tests
run_integration_tests() {
    clear
    print_header "5. Integration Tests"

    echo "Select test:"
    echo "1) Complete Merchant Support Flow (5.1.1)"
    echo "2) Paystack - Create Transfer Recipient (5.2.1)"
    echo "3) Paystack - Initiate Transfer (5.2.2)"
    echo "4) Run All Integration Tests"
    echo "5) Back to Main Menu"
    echo ""
    read -p "Select test (1-5): " test_choice

    case $test_choice in
        1) test_complete_flow ;;
        2) test_paystack_recipient ;;
        3) test_paystack_transfer ;;
        4) run_all_integration_tests ;;
        5) show_main_menu ;;
        *)
            print_error "Invalid choice"
            sleep 2
            run_integration_tests
            ;;
    esac
}

test_complete_flow() {
    clear
    print_test_case "5.1.1" "Complete Merchant Support Flow" "High"

    print_steps \
        "Create new merchant" \
        "Merchant account activated" \
        "Create support ticket for merchant" \
        "Assign ticket to agent" \
        "Agent responds to ticket" \
        "Ticket resolved" \
        "Process payout for merchant"

    print_expected \
        "All steps complete successfully" \
        "Data consistent across collections" \
        "Audit logs created for each action" \
        "Notifications sent appropriately"

    read -p "Press Enter after completing test steps..."
    get_test_result

    run_integration_tests
}

test_paystack_recipient() {
    clear
    print_test_case "5.2.1" "Create Transfer Recipient" "High"

    print_info "Prerequisites: Merchant with bank details, first payout"
    echo ""

    print_steps \
        "Process payout for new merchant (first payout)" \
        "Cloud Function creates transfer recipient" \
        "Verify recipient created in Paystack"

    print_expected \
        "Recipient created in Paystack" \
        "Recipient code stored in merchant document" \
        "Subsequent payouts use existing recipient"

    read -p "Press Enter after completing test steps..."
    get_test_result

    run_integration_tests
}

test_paystack_transfer() {
    clear
    print_test_case "5.2.2" "Initiate Transfer" "Critical"

    print_steps \
        "Process payout" \
        "Cloud Function initiates transfer via Paystack API" \
        "Verify transfer created"

    print_expected \
        "Transfer initiated successfully" \
        "Transfer code returned" \
        "Transfer status = 'pending'" \
        "Payout record updated with transfer code"

    read -p "Press Enter after completing test steps..."
    get_test_result

    run_integration_tests
}

run_all_integration_tests() {
    test_complete_flow
    test_paystack_recipient
    test_paystack_transfer
}

# Test Summary
show_test_summary() {
    clear
    print_header "Test Summary"

    echo -e "${CYAN}Test Execution Statistics:${NC}"
    echo "  Total Tests Run:  $TOTAL"
    echo -e "  ${GREEN}Passed:           $PASSED${NC}"
    echo -e "  ${RED}Failed:           $FAILED${NC}"
    echo -e "  ${YELLOW}Skipped:          $SKIPPED${NC}"
    echo ""

    if [ $TOTAL -gt 0 ]; then
        PASS_RATE=$((PASSED * 100 / TOTAL))
        echo -e "  Pass Rate:        ${GREEN}$PASS_RATE%${NC}"
    fi

    echo ""

    if [ $FAILED -gt 0 ]; then
        print_warning "There were test failures. Check test-failures.log for details."
    else
        print_success "All tests passed!"
    fi

    echo ""
    read -p "Press Enter to return to main menu..."
    show_main_menu
}

# Generate Test Report
generate_test_report() {
    clear
    print_header "Generating Test Report"

    REPORT_FILE="test-report-$(date +%Y%m%d-%H%M%S).md"

    cat > "$REPORT_FILE" << EOF
# Merchant Module Test Execution Report

**Date**: $(date +"%Y-%m-%d %H:%M:%S")
**Tester**: $USER
**Environment**: Development
**Build Version**: $(git rev-parse --short HEAD 2>/dev/null || echo "N/A")

## Test Summary

| Metric | Count |
|--------|-------|
| Total Tests | $TOTAL |
| Passed | $PASSED |
| Failed | $FAILED |
| Skipped | $SKIPPED |

EOF

    if [ $TOTAL -gt 0 ]; then
        PASS_RATE=$((PASSED * 100 / TOTAL))
        echo "**Pass Rate**: $PASS_RATE%" >> "$REPORT_FILE"
    fi

    cat >> "$REPORT_FILE" << EOF

## Test Results

### Passed Tests
$PASSED tests passed successfully.

### Failed Tests
EOF

    if [ $FAILED -gt 0 ] && [ -f "test-failures.log" ]; then
        echo "" >> "$REPORT_FILE"
        cat test-failures.log >> "$REPORT_FILE"
    else
        echo "No failures recorded." >> "$REPORT_FILE"
    fi

    cat >> "$REPORT_FILE" << EOF

### Skipped Tests
$SKIPPED tests were skipped.

## Recommendations

- Review failed tests and log defects
- Investigate skipped tests
- Rerun failed tests after fixes

## Next Steps

1. Fix identified issues
2. Rerun failed test cases
3. Complete skipped test cases
4. Update test documentation

---

**Report Generated**: $(date +"%Y-%m-%d %H:%M:%S")
EOF

    print_success "Test report generated: $REPORT_FILE"
    echo ""
    read -p "Press Enter to return to main menu..."
    show_main_menu
}

# Exit
exit_script() {
    clear
    print_header "Test Session Complete"

    if [ $TOTAL -gt 0 ]; then
        show_test_summary
    fi

    echo ""
    print_info "Thank you for testing!"
    echo ""
    exit 0
}

# Initialize
clear
> test-failures.log  # Clear previous failures

# Start
show_main_menu
