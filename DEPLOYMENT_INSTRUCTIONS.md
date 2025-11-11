# Firebase Deployment Instructions

## Prerequisites

All Priority 1 implementation work has been completed:

- ✅ Firestore security rules updated for all new collections
- ✅ Security rules added for merchant collections
- ✅ Cloud Functions implemented (sendOTP, verifyOTP, requestPayout, validation triggers)
- ✅ Cloud Functions built successfully
- ⏳ **Ready for deployment**

## Deployment Steps

### 1. Re-authenticate with Firebase

Your Firebase credentials have expired. Run:

```bash
cd /Users/danielnortey/Documents/workspace/quickpaylink/admin-dashboard
firebase login --reauth
```

This will open a browser window to re-authenticate with your Firebase account (niinortey@n-qube.com).

### 2. Verify Firebase Project

After authentication, verify the correct project is selected:

```bash
firebase projects:list
firebase use --add
```

Select your QuickLink Pay project from the list.

### 3. Deploy Firestore Security Rules

Deploy the updated security rules that now include:
- AI Prompt Templates, AI Usage Logs
- Email Logs, Email Templates
- WhatsApp Messages, WhatsApp Templates
- Merchant collections (invoices, customers, products, payments, teamMembers, notifications, reports)

```bash
firebase deploy --only firestore:rules
```

**Expected output:**
```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/<your-project-id>/overview
```

### 4. Deploy Cloud Functions

Deploy all 6 Cloud Functions:

```bash
firebase deploy --only functions
```

**Functions being deployed:**
- `sendOTP` - Send OTP via WhatsApp/SMS with rate limiting
- `verifyOTP` - Verify OTP and create custom auth token
- `requestPayout` - Handle merchant payout requests
- `validateMerchantData` - Validate merchant data on create/update
- `validateInvoiceData` - Validate invoice data and auto-update status
- `updateInvoiceOnPayment` - Auto-mark invoice as paid when payment recorded
- `notifyOnTicketUpdate` - Create notifications on ticket status changes

**Expected output:**
```
✔  functions[sendOTP(us-central1)] Successful create operation.
✔  functions[verifyOTP(us-central1)] Successful create operation.
✔  functions[requestPayout(us-central1)] Successful create operation.
✔  functions[validateMerchantData(us-central1)] Successful create operation.
✔  functions[validateInvoiceData(us-central1)] Successful create operation.
✔  functions[updateInvoiceOnPayment(us-central1)] Successful create operation.
✔  functions[notifyOnTicketUpdate(us-central1)] Successful create operation.

✔  Deploy complete!
```

### 5. Verify Deployment

#### Verify Security Rules

1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project
3. Navigate to **Firestore Database** > **Rules**
4. Verify that the rules show collections for:
   - emailTemplates
   - whatsappTemplates
   - aiPromptTemplates
   - emailLogs
   - whatsappMessages
   - aiUsageLogs
   - invoices
   - customers
   - products
   - payments
   - teamMembers
   - notifications
   - reports

#### Verify Cloud Functions

1. Go to **Functions** in Firebase Console
2. Verify all 7 functions are listed and status is "Healthy"
3. Check the function logs for any deployment errors

### 6. Test the Deployment

#### Test OTP Flow (Critical)

The Flutter mobile app depends on these functions for authentication:

```javascript
// From Flutter app or admin dashboard console
const functions = getFunctions();
const sendOTPFunction = httpsCallable(functions, 'sendOTP');

// Test sending OTP
try {
  const result = await sendOTPFunction({ phoneNumber: '+1234567890' });
  console.log('OTP sent:', result.data);
  // In emulator mode, the OTP will be returned in the response
} catch (error) {
  console.error('Error:', error);
}
```

#### Test OTP Verification

```javascript
const verifyOTPFunction = httpsCallable(functions, 'verifyOTP');

try {
  const result = await verifyOTPFunction({
    phoneNumber: '+1234567890',
    otp: '123456' // Use OTP from previous step
  });
  console.log('Verification success:', result.data);
  // Should return: { success: true, customToken: '...', merchantId: '...' }
} catch (error) {
  console.error('Verification error:', error);
}
```

### 7. Monitor After Deployment

After deployment, monitor the following:

#### Cloud Functions Logs

```bash
firebase functions:log
```

Or view in Firebase Console under **Functions** > **Logs**

#### Firestore Security Rules Testing

Test in Firebase Console:
1. Go to **Firestore Database** > **Rules** > **Playground**
2. Test merchant access to their own data:
   ```
   Location: /merchants/{merchantId}
   Auth: Authenticated as merchantId
   Operation: Read
   Expected: Allow
   ```

## Important Notes

### Environment Variables

The Cloud Functions may require environment variables for external services:

#### Twilio (for SMS OTP)
```bash
firebase functions:config:set twilio.account_sid="YOUR_TWILIO_ACCOUNT_SID"
firebase functions:config:set twilio.auth_token="YOUR_TWILIO_AUTH_TOKEN"
firebase functions:config:set twilio.phone_number="YOUR_TWILIO_PHONE_NUMBER"
```

#### 360Dialog (for WhatsApp OTP)
```bash
firebase functions:config:set dialog360.api_key="YOUR_360DIALOG_API_KEY"
firebase functions:config:set dialog360.namespace="YOUR_360DIALOG_NAMESPACE"
```

After setting environment variables, redeploy functions:
```bash
firebase deploy --only functions
```

### Security Considerations

1. **OTP in Logs**: Currently OTP is logged to console for development. Remove this in production:
   - Edit `functions/src/index.ts` line 93
   - Remove: `console.log(\`OTP for ${phoneNumber}: ${otp}\`);`

2. **Rate Limiting**: OTP sending is limited to 5 requests per hour per phone number

3. **OTP Expiry**: OTPs expire after 5 minutes

4. **Attempt Limiting**: Maximum 3 verification attempts per OTP

### Cost Considerations

Cloud Functions usage will incur costs based on:
- Invocations
- Compute time
- Network egress

Monitor usage in Firebase Console under **Usage and Billing**.

## Rollback Plan

If deployment causes issues:

### Rollback Security Rules

```bash
# View previous versions
firebase firestore:rules:list

# Rollback to specific version
firebase firestore:rules:release <RULESET_ID>
```

### Rollback Functions

Firebase doesn't support automatic rollback. To rollback:

1. Check out previous git commit
2. Rebuild and redeploy:
   ```bash
   git checkout <previous-commit>
   cd functions
   npm run build
   firebase deploy --only functions
   ```

## Troubleshooting

### "Authentication Error" during deployment

Run: `firebase login --reauth`

### Function deployment fails with "quota exceeded"

Check Firebase Console > Usage and Billing. You may need to upgrade to Blaze plan for Cloud Functions.

### Security rules deployment fails

Check for syntax errors in `firestore.rules` file. Use Firebase Console Rules Playground to test.

### Functions timeout

Default timeout is 60 seconds. To increase:

Edit `functions/src/index.ts` and add `.runWith()`:

```typescript
export const sendOTP = functions
  .runWith({ timeoutSeconds: 120 })
  .https.onCall(async (data, context) => {
    // ...
  });
```

## Next Steps After Deployment

Once deployment is successful, proceed with Priority 2 items from `FIREBASE_FIRESTORE_REVIEW.md`:

1. Add Firestore indexes for new collections
2. Update COLLECTIONS constant in `admin-dashboard/src/lib/firebase.ts`
3. Test Flutter mobile app authentication flow
4. Configure Twilio/360Dialog for OTP delivery

## Support

For issues or questions:
- Firebase Documentation: https://firebase.google.com/docs
- Firebase Support: https://firebase.google.com/support

---

**Deployment Status: READY FOR DEPLOYMENT**

All implementation work is complete. Follow the steps above to deploy to Firebase.
