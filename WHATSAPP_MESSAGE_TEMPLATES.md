# WhatsApp Message Templates for QuickLink Pay

## Overview
This document contains all WhatsApp message templates required for merchant communication via 360Dialog/WhatsApp Business API.

All templates must be submitted to WhatsApp for approval before use.

---

## Template Categories

WhatsApp templates are categorized as:
- **AUTHENTICATION** - OTP and verification codes
- **UTILITY** - Account updates, payment confirmations
- **MARKETING** - Promotional messages (requires opt-in)

---

## 1. Authentication Templates

### 1.1 OTP Verification (Registration)

**Template Name:** `merchant_otp_verification`
**Category:** AUTHENTICATION
**Language:** English (en)

```
Your QuickLink Pay verification code is: {{1}}

This code will expire in 5 minutes. Do not share this code with anyone.
```

**Variables:**
- `{{1}}` = OTP Code (6-digit number)

**Usage:**
```javascript
{
  messaging_product: "whatsapp",
  to: "+233XXXXXXXXX",
  type: "template",
  template: {
    name: "merchant_otp_verification",
    language: { code: "en" },
    components: [{
      type: "body",
      parameters: [{ type: "text", text: "123456" }]
    }]
  }
}
```

---

### 1.2 Login OTP

**Template Name:** `merchant_login_otp`
**Category:** AUTHENTICATION
**Language:** English (en)

```
Your QuickLink Pay login code is: {{1}}

Valid for 5 minutes. If you didn't request this, please ignore this message.
```

**Variables:**
- `{{1}}` = OTP Code

---

## 2. Account Management Templates

### 2.1 Welcome Message

**Template Name:** `merchant_welcome`
**Category:** UTILITY
**Language:** English (en)

```
Welcome to QuickLink Pay, {{1}}! 🎉

Your merchant account has been created successfully.

Business Name: {{2}}
Account ID: {{3}}

Complete your profile to start accepting payments.

Need help? Reply to this message or visit our help center.
```

**Variables:**
- `{{1}}` = Merchant Name
- `{{2}}` = Business Name
- `{{3}}` = Merchant ID

---

### 2.2 Account Approved

**Template Name:** `merchant_account_approved`
**Category:** UTILITY
**Language:** English (en)

```
Great news, {{1}}! ✅

Your QuickLink Pay merchant account has been approved and is now LIVE!

You can now:
✓ Accept payments
✓ Generate payment links
✓ View transactions

Start accepting payments now: {{2}}
```

**Variables:**
- `{{1}}` = Merchant Name
- `{{2}}` = Dashboard URL

---

### 2.3 KYC Verification Pending

**Template Name:** `merchant_kyc_pending`
**Category:** UTILITY
**Language:** English (en)

```
Hi {{1}},

Your KYC verification is being processed. This usually takes 24-48 hours.

We'll notify you once it's complete.

Documents submitted:
{{2}}

Need to update documents? Reply to this message.
```

**Variables:**
- `{{1}}` = Merchant Name
- `{{2}}` = Document list

---

### 2.4 KYC Verification Rejected

**Template Name:** `merchant_kyc_rejected`
**Category:** UTILITY
**Language:** English (en)

```
Hi {{1}},

We couldn't verify your KYC documents.

Reason: {{2}}

Please resubmit your documents through the app.

Need assistance? Contact support: {{3}}
```

**Variables:**
- `{{1}}` = Merchant Name
- `{{2}}` = Rejection reason
- `{{3}}` = Support phone/email

---

## 3. Transaction Notifications

### 3.1 Payment Received

**Template Name:** `payment_received`
**Category:** UTILITY
**Language:** English (en)

```
💰 Payment Received!

Amount: {{1}} {{2}}
From: {{3}}
Reference: {{4}}
Time: {{5}}

Your balance has been updated.

View details: {{6}}
```

**Variables:**
- `{{1}}` = Amount
- `{{2}}` = Currency
- `{{3}}` = Customer name/phone
- `{{4}}` = Transaction reference
- `{{5}}` = Timestamp
- `{{6}}` = Transaction details URL

---

### 3.2 Payout Initiated

**Template Name:** `payout_initiated`
**Category:** UTILITY
**Language:** English (en)

```
Hi {{1}},

Your payout request has been initiated.

Amount: {{2}} {{3}}
Account: {{4}}
Reference: {{5}}

Processing time: 1-3 business days.

Track status: {{6}}
```

**Variables:**
- `{{1}}` = Merchant Name
- `{{2}}` = Amount
- `{{3}}` = Currency
- `{{4}}` = Bank account (masked)
- `{{5}}` = Payout reference
- `{{6}}` = Status URL

---

### 3.3 Payout Completed

**Template Name:** `payout_completed`
**Category:** UTILITY
**Language:** English (en)

```
✅ Payout Completed!

Amount: {{1}} {{2}}
Account: {{3}}
Reference: {{4}}
Completed: {{5}}

Check your bank account.

View receipt: {{6}}
```

**Variables:**
- `{{1}}` = Amount
- `{{2}}` = Currency
- `{{3}}` = Bank account
- `{{4}}` = Reference
- `{{5}}` = Completion time
- `{{6}}` = Receipt URL

---

### 3.4 Payout Failed

**Template Name:** `payout_failed`
**Category:** UTILITY
**Language:** English (en)

```
⚠️ Payout Failed

Amount: {{1}} {{2}}
Reference: {{3}}
Reason: {{4}}

Your balance has been refunded.

Need help? Contact support: {{5}}
```

**Variables:**
- `{{1}}` = Amount
- `{{2}}` = Currency
- `{{3}}` = Reference
- `{{4}}` = Failure reason
- `{{5}}` = Support contact

---

## 4. Subscription & Billing

### 4.1 Subscription Renewal Reminder

**Template Name:** `subscription_renewal_reminder`
**Category:** UTILITY
**Language:** English (en)

```
Hi {{1}},

Your {{2}} subscription renews in {{3}} days.

Amount: {{4}} {{5}}
Renewal Date: {{6}}

Ensure sufficient balance for auto-renewal.

Manage subscription: {{7}}
```

**Variables:**
- `{{1}}` = Merchant Name
- `{{2}}` = Plan name
- `{{3}}` = Days until renewal
- `{{4}}` = Amount
- `{{5}}` = Currency
- `{{6}}` = Renewal date
- `{{7}}` = Subscription management URL

---

### 4.2 Subscription Renewed

**Template Name:** `subscription_renewed`
**Category:** UTILITY
**Language:** English (en)

```
✅ Subscription Renewed

Plan: {{1}}
Amount: {{2}} {{3}}
Valid until: {{4}}

Thank you for staying with QuickLink Pay!

View invoice: {{5}}
```

**Variables:**
- `{{1}}` = Plan name
- `{{2}}` = Amount
- `{{3}}` = Currency
- `{{4}}` = Expiry date
- `{{5}}` = Invoice URL

---

### 4.3 Payment Overdue

**Template Name:** `payment_overdue`
**Category:** UTILITY
**Language:** English (en)

```
⚠️ Payment Overdue

Hi {{1}},

Your payment of {{2}} {{3}} is overdue.

Invoice: {{4}}
Due Date: {{5}}

Please settle to avoid service interruption.

Pay now: {{6}}
```

**Variables:**
- `{{1}}` = Merchant Name
- `{{2}}` = Amount
- `{{3}}` = Currency
- `{{4}}` = Invoice number
- `{{5}}` = Due date
- `{{6}}` = Payment URL

---

## 5. Security Alerts

### 5.1 Suspicious Activity Detected

**Template Name:** `security_alert_suspicious_activity`
**Category:** UTILITY
**Language:** English (en)

```
🔒 Security Alert

We detected unusual activity on your account.

Activity: {{1}}
Time: {{2}}
Location: {{3}}

Was this you?

If not, secure your account immediately: {{4}}
```

**Variables:**
- `{{1}}` = Activity description
- `{{2}}` = Timestamp
- `{{3}}` = Location
- `{{4}}` = Security URL

---

### 5.2 Password Changed

**Template Name:** `password_changed_notification`
**Category:** UTILITY
**Language:** English (en)

```
🔐 Password Changed

Your QuickLink Pay password was changed successfully.

Time: {{1}}
Device: {{2}}

If you didn't make this change, contact support immediately: {{3}}
```

**Variables:**
- `{{1}}` = Timestamp
- `{{2}}` = Device info
- `{{3}}` = Support contact

---

## 6. System Notifications

### 6.1 Scheduled Maintenance

**Template Name:** `scheduled_maintenance_notice`
**Category:** UTILITY
**Language:** English (en)

```
🔧 Scheduled Maintenance

Hi {{1}},

QuickLink Pay will undergo maintenance:

Start: {{2}}
End: {{3}}
Duration: {{4}}

Services may be temporarily unavailable.

We appreciate your patience!
```

**Variables:**
- `{{1}}` = Merchant Name
- `{{2}}` = Start time
- `{{3}}` = End time
- `{{4}}` = Duration

---

### 6.2 Service Restored

**Template Name:** `service_restored_notification`
**Category:** UTILITY
**Language:** English (en)

```
✅ Service Restored

Hi {{1}},

All QuickLink Pay services are now fully operational.

Thank you for your patience during maintenance.

Any issues? Contact support: {{2}}
```

**Variables:**
- `{{1}}` = Merchant Name
- `{{2}}` = Support contact

---

## 7. Customer Support

### 7.1 Support Ticket Created

**Template Name:** `support_ticket_created`
**Category:** UTILITY
**Language:** English (en)

```
🎫 Support Ticket Created

Hi {{1}},

Your support request has been received.

Ticket ID: {{2}}
Subject: {{3}}
Priority: {{4}}

Our team will respond within {{5}} hours.

Track ticket: {{6}}
```

**Variables:**
- `{{1}}` = Merchant Name
- `{{2}}` = Ticket ID
- `{{3}}` = Subject
- `{{4}}` = Priority
- `{{5}}` = Response time
- `{{6}}` = Ticket URL

---

### 7.2 Support Ticket Resolved

**Template Name:** `support_ticket_resolved`
**Category:** UTILITY
**Language:** English (en)

```
✅ Ticket Resolved

Hi {{1}},

Your support ticket (#{{2}}) has been resolved.

Resolution: {{3}}

Was this helpful?
Reply YES or NO

View details: {{4}}
```

**Variables:**
- `{{1}}` = Merchant Name
- `{{2}}` = Ticket ID
- `{{3}}` = Resolution summary
- `{{4}}` = Ticket URL

---

## 8. Marketing Templates (Opt-in Required)

### 8.1 New Feature Announcement

**Template Name:** `new_feature_announcement`
**Category:** MARKETING
**Language:** English (en)

```
🚀 New Feature Alert!

Hi {{1}},

Introducing: {{2}}

{{3}}

Try it now: {{4}}

Stop receiving updates? Reply STOP
```

**Variables:**
- `{{1}}` = Merchant Name
- `{{2}}` = Feature name
- `{{3}}` = Feature description
- `{{4}}` = Feature URL

**Note:** Requires explicit opt-in for marketing messages

---

## Template Submission Process

### Step 1: Prepare Template
1. Choose appropriate category
2. Write clear, concise message
3. Use {{N}} for variables (max 1024 chars per variable)
4. Follow WhatsApp guidelines

### Step 2: Submit for Approval
1. Go to 360Dialog Partner Portal
2. Navigate to Message Templates
3. Click "Create Template"
4. Fill in details
5. Submit for review

### Step 3: Wait for Approval
- **Authentication**: ~24 hours
- **Utility**: ~48 hours
- **Marketing**: ~72 hours (may require business verification)

### Step 4: Implement
Once approved, use template in your code:

```javascript
const response = await axios.post(
  'https://waba.360dialog.io/v1/messages',
  {
    messaging_product: 'whatsapp',
    to: phoneNumber,
    type: 'template',
    template: {
      name: 'template_name',
      language: { code: 'en' },
      components: [{
        type: 'body',
        parameters: [
          { type: 'text', text: 'variable_value' }
        ]
      }]
    }
  },
  {
    headers: {
      'D360-API-KEY': process.env.DIALOG_360_API_KEY,
      'Content-Type': 'application/json'
    }
  }
);
```

---

## Best Practices

### 1. Message Timing
- Avoid sending between 10 PM - 8 AM (local time)
- Respect user preferences
- Implement quiet hours

### 2. Frequency
- Max 1 message per hour per user (non-urgent)
- Batch multiple updates when possible
- Allow users to opt-out

### 3. Content
- Keep messages concise (<300 characters when possible)
- Use emojis sparingly (1-2 per message)
- Include clear call-to-action
- Always provide opt-out option for marketing

### 4. Testing
- Test all templates in sandbox before production
- Use test phone numbers
- Verify variable substitution
- Check message rendering on different devices

---

## Compliance

- Obtain explicit consent before sending marketing messages
- Provide easy opt-out mechanism
- Respect user preferences
- Follow local data protection laws (GDPR, etc.)
- Maintain message logs for compliance audits

---

## Support

For template approval issues:
- Contact 360Dialog support: support@360dialog.com
- WhatsApp Business API support: https://business.whatsapp.com/support

---

## Template Update Log

| Date | Template | Change | Version |
|------|----------|--------|---------|
| 2025-11-06 | merchant_otp_verification | Initial creation | 1.0 |
| 2025-11-06 | merchant_welcome | Initial creation | 1.0 |

---

**Last Updated:** 2025-11-06
**Maintained By:** QuickLink Pay Platform Team
