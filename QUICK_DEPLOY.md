# Quick Deployment Guide

## 🚀 One-Command Deployment

Run the deployment script to deploy both security rules and Cloud Functions:

```bash
cd /Users/danielnortey/Documents/workspace/quickpaylink/admin-dashboard
./deploy.sh
```

That's it! The script will:
1. ✅ Check Firebase authentication (and re-authenticate if needed)
2. ✅ Verify you're deploying to the correct project
3. ✅ Build Cloud Functions
4. ✅ Deploy Firestore security rules
5. ✅ Deploy all 7 Cloud Functions
6. ✅ Show you next steps

## 📋 Deployment Options

### Deploy Everything (Default)
```bash
./deploy.sh
# or
./deploy.sh --all
```

### Deploy Only Security Rules
```bash
./deploy.sh --rules-only
```

### Deploy Only Cloud Functions
```bash
./deploy.sh --functions-only
```

### Show Help
```bash
./deploy.sh --help
```

## 🎯 What Gets Deployed

### Firestore Security Rules
- ✅ AI Prompt Templates (super admin only)
- ✅ AI Usage Logs (read by admins/merchants)
- ✅ Email Templates & Logs
- ✅ WhatsApp Templates & Messages
- ✅ Invoices (merchants can CRUD)
- ✅ Customers (merchants can CRUD)
- ✅ Products (merchants can CRUD)
- ✅ Payments (merchants can create/read)
- ✅ Team Members (merchant owners can manage)
- ✅ Notifications (users can read own)
- ✅ Reports (merchants can CRUD)
- ✅ **Merchant self-access enabled** (critical fix)

### Cloud Functions
- ✅ `sendOTP` - Send OTP via WhatsApp/SMS with rate limiting
- ✅ `verifyOTP` - Verify OTP and create custom auth token
- ✅ `requestPayout` - Handle merchant payout requests
- ✅ `validateMerchantData` - Validate merchant data on create/update
- ✅ `validateInvoiceData` - Validate invoice data and auto-update status
- ✅ `updateInvoiceOnPayment` - Auto-mark invoice as paid
- ✅ `notifyOnTicketUpdate` - Create notifications on ticket updates

## ⚡ Quick Start

If this is your first time deploying:

```bash
# 1. Navigate to admin dashboard
cd /Users/danielnortey/Documents/workspace/quickpaylink/admin-dashboard

# 2. Run deployment script
./deploy.sh

# 3. Follow prompts:
#    - Authenticate with Firebase if needed
#    - Select/confirm your project
#    - Confirm deployment (press 'y')

# 4. Wait for deployment to complete (~2-5 minutes)

# 5. Done! 🎉
```

## 🔧 After Deployment

### Configure External Services (Required for OTP)

#### Twilio (SMS OTP)
```bash
firebase functions:config:set twilio.account_sid="YOUR_ACCOUNT_SID"
firebase functions:config:set twilio.auth_token="YOUR_AUTH_TOKEN"
firebase functions:config:set twilio.phone_number="YOUR_PHONE_NUMBER"
```

#### 360Dialog (WhatsApp OTP)
```bash
firebase functions:config:set dialog360.api_key="YOUR_API_KEY"
firebase functions:config:set dialog360.namespace="YOUR_NAMESPACE"
```

After setting environment variables, redeploy functions:
```bash
./deploy.sh --functions-only
```

### Monitor Logs
```bash
# View real-time logs
firebase functions:log

# View logs for specific function
firebase functions:log --only sendOTP
```

### Test OTP Flow

From your admin dashboard or Flutter app console:

```javascript
// Test sending OTP
const functions = getFunctions();
const sendOTP = httpsCallable(functions, 'sendOTP');
const result = await sendOTP({ phoneNumber: '+1234567890' });
console.log(result.data); // { success: true, otp: '123456' } (in dev mode)

// Test verifying OTP
const verifyOTP = httpsCallable(functions, 'verifyOTP');
const verified = await verifyOTP({
  phoneNumber: '+1234567890',
  otp: '123456'
});
console.log(verified.data); // { success: true, customToken: '...', merchantId: '...' }
```

## 🔍 Verification

After deployment, verify in Firebase Console:

1. **Security Rules**: https://console.firebase.google.com/project/YOUR_PROJECT/firestore/rules
   - Check that rules show all new collections

2. **Cloud Functions**: https://console.firebase.google.com/project/YOUR_PROJECT/functions
   - All 7 functions should show "Healthy" status

3. **Function Logs**: https://console.firebase.google.com/project/YOUR_PROJECT/functions/logs
   - Check for any deployment errors

## 🛠️ Troubleshooting

### "Authentication Error"
```bash
firebase login --reauth
```

### "Permission Denied" when running script
```bash
chmod +x deploy.sh
```

### Functions deployment fails
- Check Firebase Console for quota limits
- Ensure you're on Blaze (pay-as-you-go) plan for Cloud Functions

### Build errors
```bash
cd functions
npm install
npm run build
```

### Security rules validation fails
- Check `firestore.rules` for syntax errors
- Use Firebase Console Rules Playground to test

## 📊 Deployment Time

Typical deployment times:
- Security Rules: ~10 seconds
- Cloud Functions: ~2-5 minutes
- Total: ~3-5 minutes

## 🔒 Security Notes

1. **OTP Logging**: Currently OTP is logged for development. Remove in production:
   - Edit `functions/src/index.ts` line 93
   - Remove: `console.log(\`OTP for ${phoneNumber}: ${otp}\`);`

2. **Rate Limiting**:
   - Max 5 OTP requests per hour per phone number
   - Max 3 verification attempts per OTP

3. **OTP Expiry**: 5 minutes

## 🔄 Rollback

If deployment causes issues:

### Rollback Security Rules
```bash
# View previous versions
firebase firestore:rules:list

# Rollback to specific version
firebase firestore:rules:release RULESET_ID
```

### Rollback Functions
```bash
# Checkout previous version
git checkout PREVIOUS_COMMIT

# Rebuild and redeploy
cd functions
npm run build
cd ..
./deploy.sh --functions-only
```

## 📞 Need Help?

- Firebase Docs: https://firebase.google.com/docs
- Deployment Instructions: See `DEPLOYMENT_INSTRUCTIONS.md` for detailed guide
- Issues: Check `FIREBASE_FIRESTORE_REVIEW.md` for known issues and solutions

## ✅ Success Indicators

After deployment, you should see:
- ✅ "Deploy complete!" message
- ✅ All functions listed in Firebase Console
- ✅ Security rules updated in Firestore
- ✅ No error messages in function logs
- ✅ Flutter app can authenticate with OTP

---

**Ready to deploy?** Just run: `./deploy.sh`
