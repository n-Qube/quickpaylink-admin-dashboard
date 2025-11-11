# Quick Start: Payouts & Settlements

This is a simplified guide to get payouts working quickly.

## Prerequisites

- Paystack account (Ghana or Nigeria)
- Paystack Secret Key (test or live)
- Firebase project with Firestore and Functions enabled

---

## 5-Minute Setup

### Step 1: Get Your Paystack Secret Key

1. Login to https://dashboard.paystack.com
2. Go to Settings → API Keys & Webhooks
3. Copy your **Secret Key** (starts with `sk_test_` or `sk_live_`)

### Step 2: Set Up Firebase Functions

```bash
# Navigate to your project root
cd /Users/danielnortey/Documents/workspace/quickpaylink/admin-dashboard

# Initialize Firebase Functions (if not done)
firebase init functions

# Install dependencies
cd functions
npm install axios
```

### Step 3: Configure Paystack Secret Key

```bash
# Set the secret key as an environment variable
firebase functions:config:set paystack.secret_key="YOUR_SECRET_KEY_HERE"
firebase functions:config:set paystack.domain="test"  # or "live"

# For local testing, create functions/.runtimeconfig.json:
echo '{
  "paystack": {
    "secret_key": "sk_test_YOUR_KEY",
    "domain": "test"
  }
}' > functions/.runtimeconfig.json
```

### Step 4: Copy the Implementation Files

I've created all the code you need. Copy these files to your `functions/src` directory:

**Required files:**
- `functions/src/services/paystack.service.ts` (from the guide)
- `functions/src/services/settlement.service.ts` (from the guide)
- `functions/src/index.ts` (from the guide)

### Step 5: Deploy Functions

```bash
cd functions
npm run build
firebase deploy --only functions
```

This will deploy:
- `processManualPayout` - For initiating payouts from admin UI
- `createTransferRecipient` - For setting up merchant recipients
- `paystackWebhook` - For receiving Paystack status updates
- `processScheduledPayouts` - For automated daily payouts

### Step 6: Configure Paystack Webhook

1. Go to https://dashboard.paystack.com → Settings → Webhooks
2. Add new webhook URL:
   ```
   https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/paystackWebhook
   ```
   Example: `https://us-central1-quickpaylink.cloudfunctions.net/paystackWebhook`

3. Subscribe to these events:
   - ✅ transfer.success
   - ✅ transfer.failed
   - ✅ transfer.reversed

4. Copy the webhook secret (you'll need this for verification)

---

## How to Use

### Creating a Transfer Recipient for a Merchant

Before you can pay out to a merchant, you need to create a recipient in Paystack:

```javascript
// In your admin dashboard, call this Cloud Function:
const functions = getFunctions();
const createRecipient = httpsCallable(functions, 'createTransferRecipient');

const result = await createRecipient({
  merchantId: 'merchant_123',
  type: 'bank' // or 'mobile_money'
});

// This will save the recipientCode to the merchant document
```

### Initiating a Manual Payout

Once a merchant has a recipient code, you can initiate payouts:

```javascript
const functions = getFunctions();
const processPayout = httpsCallable(functions, 'processManualPayout');

const result = await processPayout({
  merchantId: 'merchant_123',
  amount: 1000, // GHS 1000 (optional, uses pending balance if not provided)
  description: 'Weekly settlement'
});

// Response:
// { success: true, payoutId: 'payout_...', transferCode: 'TRF_...', status: 'pending' }
```

### From the Admin UI

The admin dashboard already has the UI ready. Just update the button handler in `src/pages/Payouts.tsx`:

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const handleProcessManualPayout = async (merchantId: string, amount?: number) => {
  try {
    setProcessingPayout(true);

    const functions = getFunctions();
    const processManualPayoutFn = httpsCallable(functions, 'processManualPayout');

    const result = await processManualPayoutFn({
      merchantId,
      amount,
      description: 'Manual payout from admin dashboard'
    });

    console.log('Payout result:', result.data);
    alert('Payout initiated successfully!');

    // Reload data
    await loadData();
  } catch (error: any) {
    console.error('Error:', error);
    alert(`Error: ${error.message}`);
  } finally {
    setProcessingPayout(false);
  }
};
```

---

## Testing

### Test with Paystack Test Mode

1. Use test secret key: `sk_test_...`
2. Use test bank account details:
   - Account Number: `0123456789`
   - Bank Code: `058` (GTBank for testing)
   - Account Name: Any name

3. Test mobile money:
   - Provider: MTN
   - Number: `0241234567`

### Check Payout Status

Paystack webhooks will automatically update the status. You can also manually check:

```javascript
const functions = getFunctions();
const verifyTransfer = httpsCallable(functions, 'verifyTransfer');

const result = await verifyTransfer({
  transferCode: 'TRF_...'
});
```

---

## Flow Diagram

```
Admin Dashboard
    ↓
Click "Process Payout" Button
    ↓
Call processManualPayout Cloud Function
    ↓
Create Payout Record in Firestore
    ↓
Call Paystack Transfer API
    ↓
Paystack Processes Transfer
    ↓
Paystack Sends Webhook (success/failed)
    ↓
paystackWebhook Function Updates Status
    ↓
Admin Dashboard Shows Updated Status
```

---

## Troubleshooting

### "Payouts not enabled for this merchant"
- Make sure merchant document has `payoutConfig.enabled = true`
- Ensure `payoutConfig.recipientCode` exists

### "No funds available for payout"
- Check `merchant.payoutStats.pendingPayout` has a value > 0
- Or pass explicit amount in the function call

### Webhook not receiving updates
- Check webhook URL is correct in Paystack dashboard
- Verify webhook signature validation
- Check Cloud Function logs: `firebase functions:log`

### Transfer failed in Paystack
- Check Paystack balance (need funds to transfer)
- Verify bank account details are correct
- Check Paystack limits and restrictions

---

## Monitoring

### View Function Logs

```bash
# View all function logs
firebase functions:log

# View specific function
firebase functions:log --only processManualPayout

# Follow logs in real-time
firebase functions:log --follow
```

### Check Paystack Dashboard

1. Go to https://dashboard.paystack.com
2. Navigate to Transactions → Transfers
3. View all transfer history and status

---

## Security Checklist

- ✅ Never expose Paystack secret key in frontend code
- ✅ Always verify webhook signatures
- ✅ Validate admin permissions before processing payouts
- ✅ Check merchant payout limits
- ✅ Implement audit logging
- ✅ Use HTTPS for webhook endpoints
- ✅ Test thoroughly in test mode before going live

---

## Next Steps

1. Set up automated settlements (already implemented in `processScheduledPayouts`)
2. Add payout approval workflow (optional)
3. Implement retry logic for failed payouts
4. Set up email notifications for payout events
5. Create payout reconciliation reports

---

## Cost Estimates

**Paystack Transfer Fees (Ghana):**
- GHS 1.00 flat fee per transfer
- No percentage fee

**Firebase Functions:**
- First 2 million invocations/month: Free
- Additional invocations: $0.40 per million

**Example Monthly Cost (100 payouts/month):**
- Paystack fees: GHS 100
- Firebase: Free (well within limits)

---

## Support

- Paystack Docs: https://paystack.com/docs/transfers/single-transfers
- Firebase Functions: https://firebase.google.com/docs/functions
- GitHub Issues: Create an issue in your repo

---

**Ready to go live?**

1. Switch to live Paystack key
2. Update Firebase config: `firebase functions:config:set paystack.domain="live"`
3. Redeploy functions: `firebase deploy --only functions`
4. Update webhook URL to production
5. Test with small amount first

Good luck! 🚀
