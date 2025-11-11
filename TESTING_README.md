# Merchant Module Testing Guide

Quick guide for testing the QuickLink Pay Admin Dashboard Merchant Module.

## 📋 Test Documentation

### Available Test Documents

1. **MERCHANT_MODULE_TEST_CASES.md** - Comprehensive test cases covering:
   - Merchant Management (CRUD operations)
   - Support Ticket Management
   - Payout Processing
   - Permissions & RBAC
   - Integration Tests
   - Performance Tests
   - Security Tests

2. **run-manual-tests.sh** - Interactive test execution script

---

## 🚀 Quick Start

### 1. Start the Development Server

```bash
npm run dev
```

The app will be available at http://localhost:5173

### 2. Run the Interactive Test Runner

```bash
./run-manual-tests.sh
```

This script provides an interactive menu to guide you through test cases.

### 3. Manual Testing

Open `MERCHANT_MODULE_TEST_CASES.md` and follow the test cases step by step.

---

## 🧪 Test Categories

### 1. Merchant Management Tests (20+ test cases)

**Key Features to Test**:
- ✅ View merchant list with pagination
- ✅ Filter merchants by status, KYC status
- ✅ Search merchants by name, email
- ✅ View merchant details
- ✅ Create new merchant
- ✅ Update merchant information
- ✅ Update merchant status
- ✅ Delete merchant (with restrictions)

**Navigation**: `/merchants`

---

### 2. Support Ticket Management Tests (30+ test cases)

**Key Features to Test**:
- ✅ View ticket list with filters
- ✅ Filter by status, priority, category
- ✅ Search tickets
- ✅ **Create new ticket** ⭐ (Newly implemented)
- ✅ View ticket details
- ✅ Assign ticket to agent
- ✅ Update ticket status
- ✅ Add internal notes
- ✅ Send messages to merchant
- ✅ Escalate ticket
- ✅ Resolve ticket
- ✅ Close ticket
- ✅ Reopen ticket
- ✅ SLA tracking

**Navigation**: `/merchants/support-tickets`

---

### 3. Payout Processing Tests (15+ test cases)

**Key Features to Test**:
- ✅ View payout list
- ✅ Filter payouts by status
- ✅ **Process manual payout** ⭐ (Newly implemented)
  - Full balance payout
  - Partial amount payout
- ✅ View payout details
- ✅ Payout status updates (webhooks)
- ✅ Error handling (insufficient balance, API failures)

**Navigation**: `/merchants/payouts`

---

### 4. Permissions & RBAC Tests (10+ test cases)

**Key Features to Test**:
- ✅ Super Admin full access
- ✅ Merchant Support Lead permissions
- ✅ Merchant Support Agent permissions
- ✅ Finance Admin permissions
- ✅ Restricted actions for each role
- ✅ Firestore security rules enforcement

**Roles to Test**:
- `super_admin`
- `merchant_support_lead` ⭐ (New role)
- `merchant_support_agent` ⭐ (New role)
- `finance_admin`
- `support_admin`

---

### 5. Integration Tests (5+ test cases)

**Key Features to Test**:
- ✅ Complete merchant lifecycle flow
- ✅ Paystack integration (transfer recipient, initiate transfer)
- ✅ Webhook handling
- ✅ Cross-collection data consistency

---

## 📊 Test Execution Workflow

### Using the Interactive Script

```bash
./run-manual-tests.sh
```

**Features**:
- Interactive menu for test categories
- Step-by-step test guidance
- Test result tracking (Pass/Fail/Skip)
- Automatic test summary
- Test report generation

**Example Flow**:
1. Select "1) Merchant Management Tests"
2. Select specific test case
3. Follow the displayed steps
4. Enter test result (Pass/Fail/Skip)
5. View test summary
6. Generate test report

### Manual Testing

1. Open `MERCHANT_MODULE_TEST_CASES.md`
2. Navigate to the relevant test section
3. Follow the test steps
4. Verify expected results
5. Document any failures or issues

---

## 🧑‍💻 Test Environment Setup

### Prerequisites

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local

# Edit .env.local with your Firebase config
```

### Required Environment Variables

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### Test Data Setup

```bash
# Seed test data (if available)
node seed-test-data.js

# Create test admin users
node create-correct-admin.js
```

---

## 🎯 Test Scenarios

### Scenario 1: Create Ticket for Merchant

**Steps**:
1. Login as `merchant_support_lead` or `support_admin`
2. Navigate to `/merchants/support-tickets`
3. Click "Create Ticket"
4. Fill form:
   - Select merchant
   - Subject: "Payment processing issue"
   - Description: "Transactions failing"
   - Category: "Payment Issue"
   - Priority: "High"
5. Click "Create Ticket"

**Expected**:
- Ticket created with auto-generated number (TKT-XXXXXXXX)
- Status = "open"
- SLA timers start
- Ticket appears in list

---

### Scenario 2: Process Manual Payout

**Steps**:
1. Login as `finance_admin` or `super_admin`
2. Navigate to `/merchants/payouts`
3. Click "Process Manual Payout"
4. Select merchant with balance
5. Leave amount empty (process full balance)
6. Add description
7. Click "Process Payout"

**Expected**:
- Cloud Function called
- Paystack transfer initiated
- Payout record created
- Merchant balance updated
- Success message with transfer code

---

### Scenario 3: Test RBAC - Support Agent Restrictions

**Steps**:
1. Login as `merchant_support_agent`
2. Attempt to delete a ticket
3. Attempt to process a payout
4. Attempt to delete a merchant

**Expected**:
- All actions DENIED
- Appropriate error messages displayed
- Agent can only handle assigned tickets

---

## 📝 Test Report Template

After completing tests, generate a report:

```bash
./run-manual-tests.sh
# Select "7) Generate Test Report"
```

Or create manually:

```markdown
# Test Execution Report

**Date**: [Date]
**Tester**: [Name]
**Environment**: Development
**Build Version**: [Git commit hash]

## Test Summary

| Metric | Count |
|--------|-------|
| Total Tests | XX |
| Passed | XX |
| Failed | XX |
| Skipped | XX |

## Failed Tests

[List any failed tests with details]

## Recommendations

[Suggestions for improvements]
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Permission Denied Errors

**Symptoms**: "Permission denied" when accessing merchants or tickets

**Solutions**:
1. Check admin document exists in Firestore
2. Verify admin status is "active"
3. Verify admin has correct permissions
4. Check Firestore rules were deployed: `./deploy-firebase.sh`

---

### Issue 2: Create Ticket Not Working

**Symptoms**: Modal doesn't open or ticket not created

**Solutions**:
1. Check console for errors
2. Verify at least one merchant exists
3. Check Firebase configuration
4. Verify user has `merchantManagement.write` permission

---

### Issue 3: Process Payout Fails

**Symptoms**: Payout not initiated or error message

**Solutions**:
1. Check Paystack API keys configured
2. Verify Cloud Functions deployed
3. Check merchant has available balance
4. Verify user has payout processing permission
5. Check Firebase Functions logs

---

### Issue 4: SLA Timers Not Working

**Symptoms**: SLA timers not displayed or incorrect

**Solutions**:
1. Verify ticket has priority set
2. Check SLA configuration in ticket creation
3. Verify timestamps are being recorded correctly

---

## 🔍 Testing Tips

### 1. Test with Different Admin Roles

Create test accounts for each role:
- Super Admin
- System Admin
- Merchant Support Lead
- Merchant Support Agent
- Finance Admin
- Support Admin

### 2. Test Edge Cases

- Empty data sets (no merchants, no tickets)
- Large data sets (1000+ merchants)
- Invalid inputs (special characters, SQL injection attempts)
- Concurrent operations (multiple admins processing payouts)

### 3. Test Error Handling

- Network failures
- API errors (Paystack)
- Invalid data
- Insufficient permissions
- Missing required fields

### 4. Test Performance

- Page load times
- Search response times
- Filter performance with large datasets
- Pagination smoothness

### 5. Test Security

- Authentication expiration
- Unauthorized access attempts
- XSS prevention
- Input sanitization
- Audit log creation

---

## 📊 Test Coverage

### Current Implementation Status

| Feature | Status | Test Cases |
|---------|--------|------------|
| Merchant CRUD | ✅ Complete | 12 |
| Ticket Management | ✅ Complete | 32 |
| Payout Processing | ✅ Complete | 15 |
| RBAC | ✅ Complete | 10 |
| Integration | ⚠️ Partial | 5 |
| Performance | ⏳ Pending | 6 |
| Security | ⏳ Pending | 8 |

**Total Test Cases**: 88

---

## 🎉 Test Completion Checklist

After completing all tests:

- [ ] All merchant management features tested
- [ ] All ticket management features tested
- [ ] All payout features tested
- [ ] All admin roles tested
- [ ] Permission restrictions verified
- [ ] Security rules validated
- [ ] Integration flows tested
- [ ] Test report generated
- [ ] Defects logged (if any)
- [ ] Test summary reviewed

---

## 📞 Support

For issues or questions:

1. Check `MERCHANT_MODULE_TEST_CASES.md` for detailed test steps
2. Review browser console for errors
3. Check Firebase Console logs
4. Verify environment variables
5. Ensure all dependencies installed

---

## 🚀 Next Steps

After completing manual tests:

1. **Fix any identified issues**
2. **Implement automated tests** (Unit, Integration, E2E)
3. **Set up CI/CD** with automated testing
4. **Performance testing** with realistic data volumes
5. **Security audit** with penetration testing tools
6. **User acceptance testing** with real users
7. **Load testing** with multiple concurrent users

---

## 📚 Additional Resources

- **MERCHANT_MODULE_TEST_CASES.md** - Detailed test cases
- **DEPLOYMENT_README.md** - Deployment guide
- **FIREBASE_DEPLOYMENT_GUIDE.md** - Firebase setup
- **PAYOUT_IMPLEMENTATION_GUIDE.md** - Payout system details
- **TICKET_MANAGEMENT_GUIDE.md** - Ticket system details

---

**Happy Testing! 🧪**
