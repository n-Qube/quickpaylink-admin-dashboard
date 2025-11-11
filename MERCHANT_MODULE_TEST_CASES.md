# Merchant Module - Test Cases

Comprehensive test cases for the QuickLink Pay Admin Dashboard Merchant Module.

## Table of Contents

1. [Merchant Management Tests](#merchant-management-tests)
2. [Support Ticket Management Tests](#support-ticket-management-tests)
3. [Payout Processing Tests](#payout-processing-tests)
4. [Permissions & RBAC Tests](#permissions--rbac-tests)
5. [Integration Tests](#integration-tests)
6. [Performance Tests](#performance-tests)
7. [Security Tests](#security-tests)

---

## Test Environment Setup

### Prerequisites

```bash
# Install dependencies
npm install

# Set up test environment variables
cp .env.local.example .env.local.test

# Initialize Firebase emulators
firebase emulators:start
```

### Test Data

```bash
# Seed test data
node seed-test-data.js
```

---

## 1. Merchant Management Tests

### 1.1 Merchant List View

#### Test Case 1.1.1: Load Merchants Successfully
**Priority**: High
**Test Type**: Functional

**Prerequisites**:
- Admin user logged in with `merchantManagement.read` permission
- At least 10 merchants in database

**Steps**:
1. Navigate to `/merchants`
2. Wait for data to load

**Expected Results**:
- ✅ Page loads without errors
- ✅ Merchant list displays
- ✅ Shows merchant business name, email, status, KYC status
- ✅ Pagination controls visible (if > 20 merchants)
- ✅ Loading state shown during fetch

**Test Data**:
```javascript
// Test merchants should include:
- Active merchant with verified KYC
- Pending merchant with pending KYC
- Suspended merchant
- Inactive merchant
```

---

#### Test Case 1.1.2: Filter Merchants by Status
**Priority**: High
**Test Type**: Functional

**Steps**:
1. Navigate to `/merchants`
2. Click status filter dropdown
3. Select "Active"
4. Verify filtered results
5. Select "Pending"
6. Verify filtered results

**Expected Results**:
- ✅ Only merchants with selected status are displayed
- ✅ Filter persists on page refresh
- ✅ Can clear filter to show all merchants
- ✅ Counter shows correct number of filtered results

---

#### Test Case 1.1.3: Search Merchants
**Priority**: High
**Test Type**: Functional

**Steps**:
1. Navigate to `/merchants`
2. Type merchant business name in search box
3. Press Enter or wait for debounce
4. Verify results

**Expected Results**:
- ✅ Search filters merchants by business name
- ✅ Search filters merchants by email
- ✅ Search is case-insensitive
- ✅ Shows "No results" message when no matches
- ✅ Clears results when search cleared

**Test Data**:
```
Search Terms:
- "Tech Solutions"
- "test@example.com"
- "123-456-7890" (phone number)
```

---

### 1.2 Merchant Details View

#### Test Case 1.2.1: View Merchant Details
**Priority**: High
**Test Type**: Functional

**Prerequisites**:
- Admin user with `merchantManagement.read` permission
- Merchant exists with complete profile

**Steps**:
1. Navigate to `/merchants`
2. Click on a merchant row
3. Verify merchant details page loads

**Expected Results**:
- ✅ Shows business information (name, email, phone, address)
- ✅ Shows account status (active, pending, suspended, inactive)
- ✅ Shows KYC status and documents
- ✅ Shows wallet balance
- ✅ Shows subscription plan
- ✅ Shows registration date
- ✅ Shows last login date
- ✅ Shows transaction statistics

---

#### Test Case 1.2.2: View Merchant KYC Documents
**Priority**: High
**Test Type**: Functional

**Prerequisites**:
- Merchant with uploaded KYC documents
- Admin with `merchantManagement.read` permission

**Steps**:
1. Open merchant details
2. Navigate to KYC Documents section
3. Click on a document to view

**Expected Results**:
- ✅ Lists all uploaded KYC documents
- ✅ Shows document type (ID, Business Registration, etc.)
- ✅ Shows upload date
- ✅ Shows verification status (pending, verified, rejected)
- ✅ Can preview/download documents
- ✅ Shows rejection reason (if rejected)

---

### 1.3 Merchant Creation/Update

#### Test Case 1.3.1: Create New Merchant (Success)
**Priority**: High
**Test Type**: Functional

**Prerequisites**:
- Admin with `merchantManagement.write` permission

**Steps**:
1. Navigate to `/merchants`
2. Click "Add Merchant" button
3. Fill all required fields:
   - Business Name: "Test Merchant Ltd"
   - Email: "testmerchant@example.com"
   - Phone: "+233XXXXXXXXX"
   - Country: "Ghana"
   - Business Type: "Retail"
4. Click "Create Merchant"

**Expected Results**:
- ✅ Form validates all required fields
- ✅ Success message displayed
- ✅ Merchant appears in merchant list
- ✅ Email sent to merchant (if configured)
- ✅ Audit log entry created
- ✅ Merchant ID auto-generated
- ✅ Status set to "pending" by default

**Verification Queries**:
```javascript
// Check Firestore
const merchantRef = db.collection('merchants').doc(merchantId);
const merchant = await merchantRef.get();

// Verify fields
merchant.data().businessInfo.businessName === "Test Merchant Ltd"
merchant.data().status === "pending"
merchant.data().createdBy === adminId
```

---

#### Test Case 1.3.2: Create Merchant (Validation Errors)
**Priority**: High
**Test Type**: Negative

**Steps**:
1. Click "Add Merchant"
2. Submit form with missing required fields
3. Verify error messages

**Test Scenarios**:
| Field Missing | Expected Error Message |
|--------------|------------------------|
| Business Name | "Business name is required" |
| Email | "Email is required" |
| Invalid Email | "Invalid email format" |
| Phone | "Phone number is required" |
| Country | "Country is required" |

**Expected Results**:
- ✅ Form does not submit
- ✅ Error messages displayed for each field
- ✅ First error field is focused
- ✅ No network request made

---

#### Test Case 1.3.3: Update Merchant Information
**Priority**: High
**Test Type**: Functional

**Prerequisites**:
- Admin with `merchantManagement.write` permission
- Existing merchant

**Steps**:
1. Open merchant details
2. Click "Edit" button
3. Update business name to "Updated Business Name"
4. Update phone number
5. Click "Save Changes"

**Expected Results**:
- ✅ Changes saved successfully
- ✅ Success message displayed
- ✅ Updated information reflected immediately
- ✅ Audit log entry created
- ✅ `updatedAt` timestamp updated
- ✅ `updatedBy` set to current admin

---

#### Test Case 1.3.4: Update Merchant Status
**Priority**: High
**Test Type**: Functional

**Prerequisites**:
- Admin with `merchantManagement.write` permission

**Steps**:
1. Open merchant details
2. Change status from "Active" to "Suspended"
3. Enter suspension reason
4. Click "Update Status"

**Expected Results**:
- ✅ Status updated successfully
- ✅ Merchant receives notification (if configured)
- ✅ Merchant's API access disabled (for suspended/inactive)
- ✅ Audit log entry with reason
- ✅ Status change timestamp recorded

---

### 1.4 Merchant Deletion

#### Test Case 1.4.1: Delete Merchant (Success)
**Priority**: Medium
**Test Type**: Functional

**Prerequisites**:
- Admin with super_admin or `merchantManagement.delete` permission
- Merchant with no active transactions or pending payouts

**Steps**:
1. Open merchant details
2. Click "Delete Merchant" button
3. Confirm deletion in modal
4. Enter confirmation text

**Expected Results**:
- ✅ Confirmation modal displayed
- ✅ Warning about irreversible action
- ✅ Merchant deleted from database
- ✅ Redirected to merchant list
- ✅ Success message displayed
- ✅ Audit log entry created

---

#### Test Case 1.4.2: Delete Merchant (Blocked - Active Transactions)
**Priority**: High
**Test Type**: Negative

**Prerequisites**:
- Merchant with active transactions or pending payouts

**Steps**:
1. Attempt to delete merchant with active transactions

**Expected Results**:
- ✅ Deletion blocked
- ✅ Error message: "Cannot delete merchant with active transactions"
- ✅ Suggests alternative: "Suspend merchant instead"
- ✅ No database changes made

---

## 2. Support Ticket Management Tests

### 2.1 Ticket List View

#### Test Case 2.1.1: Load Support Tickets
**Priority**: High
**Test Type**: Functional

**Prerequisites**:
- Admin with `merchantManagement.read` permission
- At least 10 tickets in database

**Steps**:
1. Navigate to `/merchants/support-tickets`
2. Wait for tickets to load

**Expected Results**:
- ✅ Ticket list displays
- ✅ Shows ticket number, merchant, subject, status, priority, created date
- ✅ Tickets sorted by created date (newest first)
- ✅ Pagination works correctly
- ✅ Loading state shown

---

#### Test Case 2.1.2: Filter Tickets by Status
**Priority**: High
**Test Type**: Functional

**Steps**:
1. Navigate to support tickets
2. Select status filter: "Open"
3. Verify results
4. Change to "Assigned"
5. Verify results

**Expected Results**:
- ✅ Only tickets with selected status shown
- ✅ Filter persists on refresh
- ✅ Can select multiple statuses
- ✅ "Clear Filters" button works

**Test Data**:
```javascript
Statuses to test:
- open
- assigned
- in_progress
- waiting_merchant
- waiting_internal
- resolved
- closed
- reopened
```

---

#### Test Case 2.1.3: Filter Tickets by Priority
**Priority**: Medium
**Test Type**: Functional

**Steps**:
1. Select priority filter: "Critical"
2. Verify only critical tickets shown
3. Change to "High"
4. Verify results

**Expected Results**:
- ✅ Priority filter works correctly
- ✅ Priority badge colors match:
  - Low: Gray
  - Medium: Blue
  - High: Orange
  - Urgent: Red
  - Critical: Dark Red

---

#### Test Case 2.1.4: Filter Tickets by Category
**Priority**: Medium
**Test Type**: Functional

**Steps**:
1. Select category filter: "Technical Issue"
2. Verify only technical tickets shown

**Expected Results**:
- ✅ Category filter works
- ✅ All 10+ categories available:
  - General Inquiry
  - Technical Issue
  - Payment Issue
  - KYC Issue
  - Payout Issue
  - Account Issue
  - Settlement Issue
  - Compliance Issue
  - Feature Request
  - Bug Report
  - Other

---

#### Test Case 2.1.5: Search Tickets
**Priority**: High
**Test Type**: Functional

**Steps**:
1. Enter ticket number in search: "TKT-12345678"
2. Verify ticket found
3. Clear search
4. Search by merchant name
5. Verify results

**Expected Results**:
- ✅ Search by ticket number works
- ✅ Search by merchant name works
- ✅ Search by subject works
- ✅ Search is case-insensitive
- ✅ Shows "No results" when no matches

---

### 2.2 Create Ticket

#### Test Case 2.2.1: Create New Ticket (Success)
**Priority**: Critical
**Test Type**: Functional

**Prerequisites**:
- Admin with `merchantManagement.write` permission
- At least one active merchant

**Steps**:
1. Navigate to `/merchants/support-tickets`
2. Click "Create Ticket" button
3. Fill form:
   - Select Merchant: "Test Merchant Ltd"
   - Subject: "Payment processing issue"
   - Description: "Merchant reports failed transactions"
   - Category: "Payment Issue"
   - Priority: "High"
4. Click "Create Ticket"

**Expected Results**:
- ✅ Ticket created successfully
- ✅ Auto-generated ticket number (TKT-XXXXXXXX)
- ✅ Status set to "open"
- ✅ Created by admin info recorded
- ✅ SLA timers start automatically
- ✅ Ticket appears in list
- ✅ Success message displayed
- ✅ Activity log entry created
- ✅ Merchant notified (if configured)

**Verification**:
```javascript
// Check ticket in Firestore
const ticketRef = db.collection('supportTickets').doc(ticketId);
const ticket = await ticketRef.get();

// Verify SLA
ticket.data().sla.firstResponseTime.targetMinutes > 0
ticket.data().sla.resolutionTime.targetMinutes > 0
ticket.data().status === 'open'
ticket.data().createdBy.adminId === adminId
```

---

#### Test Case 2.2.2: Create Ticket (Validation Errors)
**Priority**: High
**Test Type**: Negative

**Steps**:
1. Click "Create Ticket"
2. Submit with missing fields

**Test Scenarios**:
| Field Missing | Expected Error |
|--------------|----------------|
| Merchant | "Please select a merchant" |
| Subject | "Subject is required" |
| Description | "Description is required" |
| Category | "Please select a category" |
| Priority | "Please select a priority" |

**Expected Results**:
- ✅ Form validation prevents submission
- ✅ Error messages displayed
- ✅ No network request made

---

### 2.3 View Ticket Details

#### Test Case 2.3.1: View Ticket Details
**Priority**: High
**Test Type**: Functional

**Steps**:
1. Click on a ticket from the list
2. Wait for details to load

**Expected Results**:
- ✅ Shows complete ticket information
- ✅ Shows merchant details
- ✅ Shows ticket status and priority with badges
- ✅ Shows SLA timers (first response, resolution)
- ✅ Shows creation and last update timestamps
- ✅ Shows assigned agent (if assigned)
- ✅ Shows all messages/notes
- ✅ Shows activity timeline

---

#### Test Case 2.3.2: View Ticket Messages
**Priority**: High
**Test Type**: Functional

**Steps**:
1. Open ticket with existing messages
2. Scroll through message history

**Expected Results**:
- ✅ Messages displayed chronologically
- ✅ Internal notes have different styling
- ✅ Merchant-visible messages clearly marked
- ✅ Shows sender name and timestamp
- ✅ Shows admin avatar/initials
- ✅ Can distinguish between types:
  - Admin → Merchant
  - Merchant → Admin
  - Internal Note (admin only)

---

### 2.4 Ticket Assignment

#### Test Case 2.4.1: Assign Ticket to Agent
**Priority**: High
**Test Type**: Functional

**Prerequisites**:
- Admin with `merchantManagement.write` permission
- Support agents exist in system
- Unassigned ticket

**Steps**:
1. Open unassigned ticket
2. Click "Assign" button
3. Select agent from dropdown
4. Click "Assign Ticket"

**Expected Results**:
- ✅ Ticket assigned successfully
- ✅ Status changes to "assigned"
- ✅ Assignment info recorded:
  - assignedTo: agent ID
  - assignedBy: admin ID
  - assignedAt: timestamp
- ✅ Agent notified
- ✅ Activity log entry created
- ✅ SLA timer continues

---

#### Test Case 2.4.2: Reassign Ticket
**Priority**: Medium
**Test Type**: Functional

**Steps**:
1. Open assigned ticket
2. Click "Reassign"
3. Select different agent
4. Enter reassignment reason
5. Click "Reassign"

**Expected Results**:
- ✅ Ticket reassigned successfully
- ✅ Previous agent notified
- ✅ New agent notified
- ✅ Reassignment reason recorded
- ✅ Activity log shows reassignment with reason

---

### 2.5 Ticket Status Updates

#### Test Case 2.5.1: Update Ticket Status to In Progress
**Priority**: High
**Test Type**: Functional

**Steps**:
1. Open assigned ticket
2. Click "Start Working"
3. Verify status change

**Expected Results**:
- ✅ Status changes to "in_progress"
- ✅ Timestamp recorded
- ✅ Activity log entry created
- ✅ Merchant notified (if configured)

---

#### Test Case 2.5.2: Update Ticket Status to Waiting for Merchant
**Priority**: High
**Test Type**: Functional

**Steps**:
1. Open ticket in progress
2. Click "Waiting for Merchant"
3. Add note explaining what's needed
4. Submit

**Expected Results**:
- ✅ Status changes to "waiting_merchant"
- ✅ SLA timer paused
- ✅ Merchant notified with note
- ✅ Activity log entry created

---

#### Test Case 2.5.3: Resolve Ticket
**Priority**: Critical
**Test Type**: Functional

**Steps**:
1. Open ticket in progress
2. Click "Resolve Ticket"
3. Select resolution type:
   - "Resolved"
   - "Not Fixable"
   - "Duplicate"
   - "Spam"
4. Add resolution notes
5. Click "Mark as Resolved"

**Expected Results**:
- ✅ Status changes to "resolved"
- ✅ Resolution info recorded:
  - resolutionType
  - resolvedBy
  - resolvedAt
  - resolution notes
- ✅ SLA metrics calculated
- ✅ Merchant notified
- ✅ Activity log entry created
- ✅ Auto-close timer starts (if configured)

**Verification**:
```javascript
// Check SLA metrics
ticket.data().sla.firstResponseTime.actualMinutes >= 0
ticket.data().sla.resolutionTime.actualMinutes >= 0
ticket.data().sla.resolutionTime.breached === false // if resolved on time
```

---

#### Test Case 2.5.4: Close Ticket
**Priority**: High
**Test Type**: Functional

**Steps**:
1. Open resolved ticket
2. Wait for auto-close period (or manually close)
3. Click "Close Ticket"
4. Confirm closure

**Expected Results**:
- ✅ Status changes to "closed"
- ✅ Ticket marked as closed
- ✅ Timestamp recorded
- ✅ Activity log entry created
- ✅ Ticket archived (if configured)

---

#### Test Case 2.5.5: Reopen Ticket
**Priority**: Medium
**Test Type**: Functional

**Steps**:
1. Open closed/resolved ticket
2. Click "Reopen Ticket"
3. Enter reason for reopening
4. Submit

**Expected Results**:
- ✅ Status changes to "reopened"
- ✅ SLA timers reset/restart
- ✅ Reopening reason recorded
- ✅ Activity log entry created
- ✅ Assigned agent notified

---

### 2.6 Ticket Messaging

#### Test Case 2.6.1: Add Internal Note
**Priority**: High
**Test Type**: Functional

**Steps**:
1. Open ticket
2. Switch to "Internal Notes" tab
3. Type note: "Investigating database logs"
4. Click "Add Note"

**Expected Results**:
- ✅ Note added successfully
- ✅ Note visible to admins only
- ✅ Not visible to merchant
- ✅ Timestamp and author recorded
- ✅ Activity log entry created

---

#### Test Case 2.6.2: Send Message to Merchant
**Priority**: Critical
**Test Type**: Functional

**Steps**:
1. Open ticket
2. Switch to "Messages" tab
3. Type message: "We've identified the issue and are working on a fix"
4. Click "Send Message"

**Expected Results**:
- ✅ Message sent successfully
- ✅ Visible to merchant
- ✅ Merchant receives email notification
- ✅ Timestamp recorded
- ✅ Activity log entry created
- ✅ If first response: SLA first response time recorded

---

#### Test Case 2.6.3: Add Message with Attachment
**Priority**: Medium
**Test Type**: Functional

**Steps**:
1. Open ticket
2. Click "Attach File"
3. Select file (screenshot, PDF, etc.)
4. Add message text
5. Click "Send"

**Expected Results**:
- ✅ File uploaded successfully
- ✅ File URL stored in message
- ✅ Merchant can download file
- ✅ Supported file types only (images, PDFs, docs)
- ✅ File size limit enforced (e.g., 10MB)

---

### 2.7 Ticket Escalation

#### Test Case 2.7.1: Escalate Ticket
**Priority**: High
**Test Type**: Functional

**Prerequisites**:
- Ticket with SLA breach or critical priority

**Steps**:
1. Open ticket
2. Click "Escalate" button
3. Select escalation level: "Level 1", "Level 2", "Level 3"
4. Enter escalation reason
5. Submit

**Expected Results**:
- ✅ Ticket escalated successfully
- ✅ Escalation info recorded:
  - escalatedTo: level
  - escalatedBy: admin ID
  - escalatedAt: timestamp
  - reason
- ✅ Priority automatically increased (if not already critical)
- ✅ Escalation team notified
- ✅ Activity log entry created

---

#### Test Case 2.7.2: De-escalate Ticket
**Priority**: Medium
**Test Type**: Functional

**Steps**:
1. Open escalated ticket
2. Click "De-escalate"
3. Enter reason
4. Submit

**Expected Results**:
- ✅ Escalation cleared
- ✅ Original priority restored (if changed)
- ✅ Activity log entry created

---

### 2.8 SLA Monitoring

#### Test Case 2.8.1: SLA First Response Timer
**Priority**: High
**Test Type**: Functional

**Prerequisites**:
- Newly created ticket with no responses

**Steps**:
1. Create ticket with "High" priority
2. Wait for first response target time to approach
3. Add first response

**Expected Results**:
- ✅ Timer starts when ticket created
- ✅ Target time based on priority:
  - Critical: 15 minutes
  - Urgent: 30 minutes
  - High: 1 hour
  - Medium: 2 hours
  - Low: 4 hours
- ✅ Timer displayed on ticket
- ✅ Warning shown when approaching breach
- ✅ Marked as breached if exceeded
- ✅ Timer stops on first admin response

---

#### Test Case 2.8.2: SLA Resolution Timer
**Priority**: High
**Test Type**: Functional

**Steps**:
1. Create ticket with "Critical" priority
2. Monitor resolution timer
3. Resolve ticket

**Expected Results**:
- ✅ Timer starts when ticket created
- ✅ Target time based on priority:
  - Critical: 4 hours
  - Urgent: 8 hours
  - High: 24 hours
  - Medium: 48 hours
  - Low: 120 hours
- ✅ Paused during "waiting_merchant" status
- ✅ Resumes when status changes back
- ✅ Marked as breached if exceeded
- ✅ Final time recorded on resolution

---

#### Test Case 2.8.3: SLA Breach Notification
**Priority**: High
**Test Type**: Functional

**Steps**:
1. Create ticket
2. Wait for SLA breach (or simulate time)
3. Check notifications

**Expected Results**:
- ✅ Warning notification before breach (e.g., 80% of time)
- ✅ Breach notification when exceeded
- ✅ Escalation triggered automatically
- ✅ Manager/lead notified
- ✅ Ticket marked with "SLA Breached" badge

---

## 3. Payout Processing Tests

### 3.1 Payout List View

#### Test Case 3.1.1: Load Payouts
**Priority**: High
**Test Type**: Functional

**Prerequisites**:
- Admin with `merchantManagement.read` permission

**Steps**:
1. Navigate to `/merchants/payouts`
2. Wait for data to load

**Expected Results**:
- ✅ Payout list displays
- ✅ Shows payout ID, merchant, amount, status, created date
- ✅ Pagination works
- ✅ Loading state shown

---

#### Test Case 3.1.2: Filter Payouts by Status
**Priority**: High
**Test Type**: Functional

**Steps**:
1. Select status filter: "Pending"
2. Verify only pending payouts shown
3. Change to "Completed"
4. Verify results

**Expected Results**:
- ✅ Status filter works correctly
- ✅ Available statuses:
  - Pending
  - Processing
  - Completed
  - Failed
  - Cancelled

---

### 3.2 Process Manual Payout

#### Test Case 3.2.1: Process Manual Payout - Full Balance (Success)
**Priority**: Critical
**Test Type**: Functional

**Prerequisites**:
- Admin with `merchantManagement.write` permission
- Merchant with available balance > 0
- Paystack integration configured

**Steps**:
1. Navigate to `/merchants/payouts`
2. Click "Process Manual Payout"
3. Select merchant with balance GHS 500
4. Leave amount field empty (process full balance)
5. Add description: "Manual payout - weekly settlement"
6. Click "Process Payout"

**Expected Results**:
- ✅ Payout initiated successfully
- ✅ Cloud Function called with correct parameters
- ✅ Transfer created in Paystack
- ✅ Payout record created in Firestore:
  - payoutId auto-generated
  - merchantId recorded
  - amount = full balance
  - status = "pending"
  - initiatedBy = admin ID
- ✅ Success message with transfer code displayed
- ✅ Merchant balance updated
- ✅ Activity log entry created
- ✅ Merchant notified

**Verification**:
```javascript
// Check payout record
const payoutRef = db.collection('payouts').doc(payoutId);
const payout = await payoutRef.get();

payout.data().amount === 500
payout.data().status === 'pending'
payout.data().paystackTransferCode // exists
payout.data().initiatedBy.adminId === adminId

// Check merchant balance
const merchantRef = db.collection('merchants').doc(merchantId);
const merchant = await merchantRef.get();

merchant.data().wallet.availableBalance === 0 // or reduced by amount
```

---

#### Test Case 3.2.2: Process Manual Payout - Partial Amount (Success)
**Priority**: High
**Test Type**: Functional

**Steps**:
1. Click "Process Manual Payout"
2. Select merchant with balance GHS 1000
3. Enter amount: GHS 300
4. Add description
5. Click "Process Payout"

**Expected Results**:
- ✅ Payout for GHS 300 processed
- ✅ Merchant balance reduced by GHS 300
- ✅ Remaining balance: GHS 700
- ✅ Success message displayed

---

#### Test Case 3.2.3: Process Payout (Insufficient Balance)
**Priority**: High
**Test Type**: Negative

**Steps**:
1. Click "Process Manual Payout"
2. Select merchant with balance GHS 100
3. Enter amount: GHS 500
4. Click "Process Payout"

**Expected Results**:
- ✅ Error message: "Insufficient balance"
- ✅ Payout not created
- ✅ Balance unchanged
- ✅ No Paystack API call made

---

#### Test Case 3.2.4: Process Payout (Paystack API Failure)
**Priority**: High
**Test Type**: Negative

**Prerequisites**:
- Simulate Paystack API failure (invalid recipient, network error, etc.)

**Steps**:
1. Attempt to process payout
2. Paystack API returns error

**Expected Results**:
- ✅ Error message displayed with Paystack error details
- ✅ Payout status set to "failed"
- ✅ Merchant balance restored (if deducted)
- ✅ Error details logged
- ✅ Admin can retry

---

#### Test Case 3.2.5: Process Payout (Validation Errors)
**Priority**: Medium
**Test Type**: Negative

**Test Scenarios**:
| Input | Expected Error |
|-------|----------------|
| No merchant selected | "Please select a merchant" |
| Amount = 0 | "Amount must be greater than 0" |
| Amount negative | "Amount must be greater than 0" |
| Amount > balance | "Amount exceeds available balance" |
| Invalid amount format | "Invalid amount format" |

**Expected Results**:
- ✅ Form validation prevents submission
- ✅ Error messages displayed
- ✅ No network request made

---

### 3.3 View Payout Details

#### Test Case 3.3.1: View Payout Details
**Priority**: Medium
**Test Type**: Functional

**Steps**:
1. Click on a payout from the list
2. View details modal/page

**Expected Results**:
- ✅ Shows complete payout information:
  - Payout ID
  - Merchant details
  - Amount
  - Status
  - Transfer code
  - Recipient details
  - Initiated by
  - Initiated at
  - Completed at (if completed)
  - Error details (if failed)

---

#### Test Case 3.3.2: View Payout Status History
**Priority**: Low
**Test Type**: Functional

**Steps**:
1. Open payout details
2. View status history timeline

**Expected Results**:
- ✅ Shows all status changes:
  - Pending → Processing → Completed
  - Or: Pending → Failed
- ✅ Timestamp for each status
- ✅ Admin who initiated shown

---

### 3.4 Payout Status Updates

#### Test Case 3.4.1: Webhook - Payout Completed
**Priority**: High
**Test Type**: Integration

**Prerequisites**:
- Payout in "pending" or "processing" status
- Paystack webhook configured

**Steps**:
1. Paystack sends webhook: `transfer.success`
2. Cloud Function processes webhook
3. Check payout status update

**Expected Results**:
- ✅ Payout status updated to "completed"
- ✅ Completed timestamp recorded
- ✅ Merchant notified
- ✅ Activity log entry created

---

#### Test Case 3.4.2: Webhook - Payout Failed
**Priority**: High
**Test Type**: Integration

**Steps**:
1. Paystack sends webhook: `transfer.failed`
2. Cloud Function processes webhook
3. Check payout status and merchant balance

**Expected Results**:
- ✅ Payout status updated to "failed"
- ✅ Failure reason recorded
- ✅ Merchant balance restored
- ✅ Admin notified
- ✅ Merchant notified

---

### 3.5 Payout Reports

#### Test Case 3.5.1: Export Payout Report
**Priority**: Low
**Test Type**: Functional

**Steps**:
1. Navigate to payouts
2. Apply filters (date range, status)
3. Click "Export Report"
4. Select format: CSV or PDF

**Expected Results**:
- ✅ Report generated successfully
- ✅ Contains filtered data
- ✅ Includes all relevant fields
- ✅ File downloads automatically

---

## 4. Permissions & RBAC Tests

### 4.1 Super Admin Permissions

#### Test Case 4.1.1: Super Admin - Full Access
**Priority**: High
**Test Type**: Security

**Prerequisites**:
- User logged in as super_admin

**Steps**:
1. Attempt to access all merchant module features
2. Verify full access granted

**Expected Results**:
- ✅ Can view all merchants
- ✅ Can create/update/delete merchants
- ✅ Can view/create/update tickets
- ✅ Can delete tickets
- ✅ Can process payouts
- ✅ Can view audit logs
- ✅ No permission errors

---

### 4.2 Merchant Support Lead Permissions

#### Test Case 4.2.1: Support Lead - Ticket Management
**Priority**: High
**Test Type**: Security

**Prerequisites**:
- User logged in as merchant_support_lead

**Steps**:
1. Navigate to support tickets
2. Create new ticket
3. Assign ticket to agent
4. Escalate ticket
5. View ticket reports

**Expected Results**:
- ✅ Can view all tickets
- ✅ Can create tickets
- ✅ Can assign tickets
- ✅ Can escalate tickets
- ✅ Can view team performance
- ✅ Can access reports

---

#### Test Case 4.2.2: Support Lead - Restricted Actions
**Priority**: High
**Test Type**: Security (Negative)

**Steps**:
1. Attempt to delete merchant
2. Attempt to modify system config
3. Attempt to delete audit logs

**Expected Results**:
- ✅ Delete merchant: DENIED
- ✅ Modify system config: DENIED
- ✅ Delete audit logs: DENIED
- ✅ Appropriate error messages shown

---

### 4.3 Merchant Support Agent Permissions

#### Test Case 4.3.1: Support Agent - Ticket Handling
**Priority**: High
**Test Type**: Security

**Prerequisites**:
- User logged in as merchant_support_agent

**Steps**:
1. View tickets assigned to agent
2. Update ticket status
3. Add messages and notes
4. Attempt to view unassigned tickets

**Expected Results**:
- ✅ Can view assigned tickets
- ✅ Can update status of assigned tickets
- ✅ Can add messages
- ✅ Can add internal notes
- ✅ Can view merchant details (read-only)
- ✅ Can view unassigned tickets (if configured)

---

#### Test Case 4.3.2: Support Agent - Restricted Actions
**Priority**: High
**Test Type**: Security (Negative)

**Steps**:
1. Attempt to delete ticket
2. Attempt to assign ticket to another agent
3. Attempt to escalate ticket
4. Attempt to process payout

**Expected Results**:
- ✅ Delete ticket: DENIED
- ✅ Assign ticket: DENIED (or limited)
- ✅ Escalate ticket: DENIED (or limited to level 1)
- ✅ Process payout: DENIED

---

### 4.4 Finance Admin Permissions

#### Test Case 4.4.1: Finance Admin - Payout Access
**Priority**: High
**Test Type**: Security

**Prerequisites**:
- User logged in as finance_admin

**Steps**:
1. Navigate to payouts
2. Process manual payout
3. View payout reports
4. Attempt to create support ticket

**Expected Results**:
- ✅ Can view all payouts
- ✅ Can process payouts
- ✅ Can view reports
- ✅ Create ticket: DENIED (or limited)

---

### 4.5 Firestore Security Rules

#### Test Case 4.5.1: Unauthenticated Access
**Priority**: Critical
**Test Type**: Security (Negative)

**Steps**:
1. Attempt to read merchants collection without authentication

**Expected Results**:
- ✅ Access DENIED
- ✅ Error: "PERMISSION_DENIED"
- ✅ No data returned

---

#### Test Case 4.5.2: Authenticated but No Permission
**Priority**: High
**Test Type**: Security (Negative)

**Prerequisites**:
- User authenticated but no `merchantManagement.read` permission

**Steps**:
1. Attempt to read merchants collection

**Expected Results**:
- ✅ Access DENIED
- ✅ Error message displayed
- ✅ No data returned

---

#### Test Case 4.5.3: Role-Based Access Control
**Priority**: High
**Test Type**: Security

**Steps**:
1. Verify Firestore rules enforce RBAC
2. Test rules for each collection:
   - merchants
   - supportTickets
   - payouts
   - auditLogs

**Expected Results**:
- ✅ Rules check user authentication
- ✅ Rules check admin document exists
- ✅ Rules check admin status is "active"
- ✅ Rules check specific permissions
- ✅ Super admin has full access
- ✅ Audit logs are immutable (no client writes)

---

## 5. Integration Tests

### 5.1 End-to-End: Create Merchant → Create Ticket → Resolve

#### Test Case 5.1.1: Complete Merchant Support Flow
**Priority**: High
**Test Type**: Integration

**Steps**:
1. Create new merchant
2. Merchant account activated
3. Create support ticket for merchant
4. Assign ticket to agent
5. Agent responds to ticket
6. Ticket resolved
7. Process payout for merchant

**Expected Results**:
- ✅ All steps complete successfully
- ✅ Data consistent across collections
- ✅ Audit logs created for each action
- ✅ Notifications sent appropriately

---

### 5.2 Paystack Integration

#### Test Case 5.2.1: Create Transfer Recipient
**Priority**: High
**Test Type**: Integration

**Prerequisites**:
- Paystack API keys configured
- Merchant with bank details

**Steps**:
1. Process payout for new merchant (first payout)
2. Cloud Function creates transfer recipient
3. Verify recipient created in Paystack

**Expected Results**:
- ✅ Recipient created in Paystack
- ✅ Recipient code stored in merchant document
- ✅ Subsequent payouts use existing recipient

---

#### Test Case 5.2.2: Initiate Transfer
**Priority**: Critical
**Test Type**: Integration

**Steps**:
1. Process payout
2. Cloud Function initiates transfer via Paystack API
3. Verify transfer created

**Expected Results**:
- ✅ Transfer initiated successfully
- ✅ Transfer code returned
- ✅ Transfer status = "pending"
- ✅ Payout record updated with transfer code

---

#### Test Case 5.2.3: Handle Paystack Webhook
**Priority**: High
**Test Type**: Integration

**Steps**:
1. Paystack sends webhook to your endpoint
2. Verify webhook signature
3. Process webhook event
4. Update payout status

**Expected Results**:
- ✅ Webhook received and verified
- ✅ Event processed correctly
- ✅ Payout status updated
- ✅ Merchant balance updated (if failed)

---

## 6. Performance Tests

### 6.1 Load Time

#### Test Case 6.1.1: Merchant List Load Time
**Priority**: Medium
**Test Type**: Performance

**Test Data**: 1000 merchants in database

**Steps**:
1. Navigate to `/merchants`
2. Measure time to first render
3. Measure time to interactive

**Expected Results**:
- ✅ First render: < 1 second
- ✅ Interactive: < 2 seconds
- ✅ Pagination limits query (20-50 items per page)

---

#### Test Case 6.1.2: Ticket List Load Time
**Priority**: Medium
**Test Type**: Performance

**Test Data**: 5000 tickets in database

**Steps**:
1. Navigate to `/merchants/support-tickets`
2. Measure load time

**Expected Results**:
- ✅ Load time: < 2 seconds
- ✅ Pagination implemented
- ✅ Filters applied efficiently

---

### 6.2 Concurrent Users

#### Test Case 6.2.1: Multiple Admins Processing Payouts
**Priority**: Medium
**Test Type**: Performance/Concurrency

**Steps**:
1. Simulate 10 admins processing payouts simultaneously
2. Verify no race conditions
3. Verify all payouts processed correctly

**Expected Results**:
- ✅ No duplicate payouts
- ✅ Merchant balance accurate
- ✅ No transaction conflicts
- ✅ Cloud Functions handle concurrency correctly

---

### 6.3 Large Data Sets

#### Test Case 6.3.1: Search with Large Result Set
**Priority**: Low
**Test Type**: Performance

**Steps**:
1. Search merchants with broad term
2. Measure response time with 500+ results

**Expected Results**:
- ✅ Results returned in < 3 seconds
- ✅ Pagination implemented
- ✅ No browser freeze

---

## 7. Security Tests

### 7.1 Authentication

#### Test Case 7.1.1: Expired Session
**Priority**: High
**Test Type**: Security

**Steps**:
1. Login to dashboard
2. Wait for session to expire (or force expiration)
3. Attempt to access merchant module

**Expected Results**:
- ✅ Redirected to login page
- ✅ Session cleared
- ✅ No data accessible

---

### 7.2 Authorization

#### Test Case 7.2.1: Direct URL Access
**Priority**: High
**Test Type**: Security (Negative)

**Steps**:
1. Login as support agent
2. Manually navigate to `/merchants/payouts`
3. Attempt to access payout processing

**Expected Results**:
- ✅ Access DENIED
- ✅ Error message displayed
- ✅ Redirected or blocked

---

### 7.3 Input Validation

#### Test Case 7.3.1: XSS Prevention
**Priority**: Critical
**Test Type**: Security

**Steps**:
1. Create ticket with malicious script in subject:
   ```
   <script>alert('XSS')</script>
   ```
2. View ticket details

**Expected Results**:
- ✅ Script tags escaped/sanitized
- ✅ No script execution
- ✅ Data stored safely

---

#### Test Case 7.3.2: SQL Injection Prevention
**Priority**: Critical
**Test Type**: Security

**Steps**:
1. Search merchants with SQL injection attempt:
   ```
   ' OR '1'='1
   ```
2. Verify no database breach

**Expected Results**:
- ✅ No data leak
- ✅ Query returns normal results or error
- ✅ Firestore queries parameterized correctly

---

### 7.4 Data Privacy

#### Test Case 7.4.1: Audit Log Immutability
**Priority**: High
**Test Type**: Security

**Steps**:
1. Create audit log entry
2. Attempt to modify or delete via console
3. Attempt to modify via API

**Expected Results**:
- ✅ Modification DENIED by Firestore rules
- ✅ Deletion DENIED
- ✅ Error message displayed

---

#### Test Case 7.4.2: PII Protection
**Priority**: High
**Test Type**: Security/Compliance

**Steps**:
1. View merchant details
2. Verify sensitive data masked appropriately
3. Check audit logs for PII

**Expected Results**:
- ✅ Bank account numbers partially masked
- ✅ Full details visible only to authorized admins
- ✅ Audit logs don't contain raw PII

---

## Test Execution

### Manual Testing

```bash
# Run development server
npm run dev

# Execute test cases manually using browser
# Document results in test report
```

### Automated Testing (Future)

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

---

## Test Report Template

### Test Execution Report

**Date**: [Date]
**Tester**: [Name]
**Environment**: [Dev/Staging/Production]
**Build Version**: [Version]

| Test Case ID | Test Case Name | Status | Notes |
|--------------|----------------|--------|-------|
| 1.1.1 | Load Merchants Successfully | ✅ Pass | |
| 1.1.2 | Filter Merchants by Status | ✅ Pass | |
| ... | ... | ... | ... |

**Summary**:
- Total Test Cases: XX
- Passed: XX
- Failed: XX
- Blocked: XX
- Not Executed: XX

**Defects Found**: [List any bugs discovered]

**Recommendations**: [Any suggestions for improvements]

---

## Appendix: Test Data

### Sample Merchants

```javascript
{
  merchantId: "test_merchant_001",
  businessInfo: {
    businessName: "Tech Solutions Ltd",
    email: "test@techsolutions.com",
    phoneNumber: "+233XXXXXXXXX",
  },
  wallet: {
    availableBalance: 1000,
    pendingBalance: 0,
  },
  status: "active",
  kycStatus: "verified",
}
```

### Sample Support Tickets

```javascript
{
  ticketId: "ticket_001",
  ticketNumber: "TKT-12345678",
  merchant: {
    merchantId: "test_merchant_001",
    businessName: "Tech Solutions Ltd",
    email: "test@techsolutions.com",
  },
  subject: "Payment processing issue",
  description: "Transactions are failing",
  category: "payment_issue",
  priority: "high",
  status: "open",
}
```

### Sample Payouts

```javascript
{
  payoutId: "payout_001",
  merchantId: "test_merchant_001",
  amount: 500,
  status: "pending",
  transferCode: "TRF_xxxxxxxxxx",
}
```

---

**End of Test Cases Document**
