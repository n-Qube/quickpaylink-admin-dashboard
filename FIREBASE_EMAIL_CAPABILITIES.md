# Firebase Email Sending Capabilities

## Overview
Yes, Firebase DOES support sending utility/transactional emails through several methods.

---

## Option 1: Firebase Extensions - Email Trigger (RECOMMENDED)

### What is it?
Official Firebase extension that sends emails using popular email service providers.

### Supported Email Providers:
1. **SendGrid** (Recommended - Best for transactional emails)
2. **Mailgun**
3. **Mailjet**
4. **SMTP** (Custom email server)

### Features:
- ✅ Send emails directly from Firestore triggers
- ✅ Template support with variables
- ✅ Batch email sending
- ✅ Queue management
- ✅ Delivery tracking
- ✅ Error handling and retries

### Installation:
```bash
firebase ext:install firebase/firestore-send-email
```

### Configuration:
```env
SMTP_CONNECTION_URI=smtps://username:password@smtp.sendgrid.net:465
DEFAULT_FROM=noreply@quickpaylink.com
DEFAULT_REPLY_TO=support@quickpaylink.com
```

### Usage:
Simply add documents to Firestore `mail` collection:

```javascript
// Backend - Trigger email
await db.collection('mail').add({
  to: 'merchant@example.com',
  template: {
    name: 'merchant_welcome',
    data: {
      merchantName: 'John Doe',
      businessName: 'ABC Store',
      dashboardUrl: 'https://merchant.quickpaylink.com'
    }
  }
});
```

---

## Option 2: SendGrid API (Direct Integration)

### Why SendGrid?
- ✅ **Free Tier**: 100 emails/day free
- ✅ **Transactional emails**: Designed for app notifications
- ✅ **Template engine**: Visual template editor
- ✅ **Analytics**: Open rates, click rates, bounces
- ✅ **High deliverability**: 99%+ delivery rate
- ✅ **Dynamic templates**: Variable substitution

### Setup Steps:

1. **Create SendGrid Account**
   - Go to https://sendgrid.com/
   - Sign up for free account
   - Verify your domain (for production)

2. **Get API Key**
   - Dashboard → Settings → API Keys
   - Create new API key with "Mail Send" permission

3. **Install SDK**
   ```bash
   npm install @sendgrid/mail
   ```

4. **Create Cloud Function**
   ```javascript
   // functions/src/sendEmail.js
   const sgMail = require('@sendgrid/mail');
   sgMail.setApiKey(process.env.SENDGRID_API_KEY);

   exports.sendEmail = functions.https.onCall(async (data, context) => {
     const { to, templateId, dynamicTemplateData } = data;

     const msg = {
       to: to,
       from: 'noreply@quickpaylink.com',
       templateId: templateId,
       dynamicTemplateData: dynamicTemplateData
     };

     try {
       await sgMail.send(msg);
       return { success: true };
     } catch (error) {
       console.error(error);
       throw new functions.https.HttpsError('internal', 'Failed to send email');
     }
   });
   ```

---

## Option 3: Mailgun API

### Why Mailgun?
- ✅ **Free Tier**: 5,000 emails/month for 3 months
- ✅ **Powerful API**: Easy integration
- ✅ **Template support**: Handlebars templates
- ✅ **EU servers available**: GDPR compliant

### Setup:
```bash
npm install mailgun-js
```

```javascript
const mailgun = require('mailgun-js')({
  apiKey: process.env.MAILGUN_API_KEY,
  domain: process.env.MAILGUN_DOMAIN
});

exports.sendEmail = functions.https.onCall(async (data, context) => {
  const emailData = {
    from: 'QuickLink Pay <noreply@quickpaylink.com>',
    to: data.to,
    subject: data.subject,
    template: data.template,
    'h:X-Mailgun-Variables': JSON.stringify(data.variables)
  };

  try {
    await mailgun.messages().send(emailData);
    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Failed to send email');
  }
});
```

---

## Recommended Solution for QuickLink Pay

### Use SendGrid for Email Templates

**Why?**
1. Best free tier for startups
2. Excellent template editor
3. High deliverability
4. Easy dynamic content
5. Great analytics dashboard

### Architecture:

```
Admin Creates Template → Stored in Firestore → Merchant Action Trigger →
Cloud Function → SendGrid API → Email Sent → Track in Analytics
```

### Template Storage in Firestore:

```javascript
// Collection: emailTemplates
{
  templateId: "merchant_welcome",
  name: "Merchant Welcome Email",
  description: "Sent when merchant account is approved",
  subject: "Welcome to QuickLink Pay, {{merchantName}}!",
  category: "onboarding",
  sendgridTemplateId: "d-1234567890abcdef", // Created in SendGrid
  variables: [
    { name: "merchantName", type: "string", required: true },
    { name: "businessName", type: "string", required: true },
    { name: "dashboardUrl", type: "url", required: true }
  ],
  status: "active",
  usageCount: 150,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  createdBy: "admin_id"
}
```

---

## Email Templates We Need

### 1. Authentication
- ✅ Welcome email after registration
- ✅ Password reset email
- ✅ Email verification
- ✅ Login from new device alert

### 2. Account Management
- ✅ Account approved
- ✅ KYC verification pending
- ✅ KYC approved/rejected
- ✅ Account suspended/reactivated

### 3. Transactions
- ✅ Payment received confirmation
- ✅ Payout initiated
- ✅ Payout completed
- ✅ Transaction receipt
- ✅ Invoice sent

### 4. Subscriptions
- ✅ Subscription renewal reminder
- ✅ Subscription renewed
- ✅ Payment failed
- ✅ Subscription cancelled

### 5. System
- ✅ Scheduled maintenance notice
- ✅ Service restored
- ✅ Important updates

---

## Cost Comparison

### SendGrid
- **Free**: 100 emails/day (3,000/month)
- **Essentials**: $15/month (40,000 emails)
- **Pro**: $60/month (120,000 emails)

### Mailgun
- **Free Trial**: 5,000 emails/month for 3 months
- **Foundation**: $35/month (50,000 emails)
- **Growth**: $80/month (100,000 emails)

### Firebase Extension (uses provider above)
- Extension itself: **FREE**
- Pay for your chosen email provider

---

## Deliverability Best Practices

### 1. Domain Authentication
```
SPF Record: v=spf1 include:sendgrid.net ~all
DKIM: Provided by SendGrid
DMARC: v=DMARC1; p=none; rua=mailto:admin@quickpaylink.com
```

### 2. Email Content
- ✅ Plain text alternative for HTML emails
- ✅ Unsubscribe link (marketing emails)
- ✅ Clear sender name and address
- ✅ Responsive design for mobile
- ✅ No spam trigger words

### 3. Monitoring
- Track bounce rates
- Monitor spam complaints
- Check open rates
- Maintain clean email list

---

## Implementation Steps

### Step 1: Choose Provider (SendGrid Recommended)
```bash
# Sign up at sendgrid.com
# Create API key
# Add to Firebase Functions config
firebase functions:config:set sendgrid.key="YOUR_API_KEY"
```

### Step 2: Install Dependencies
```bash
cd functions
npm install @sendgrid/mail
```

### Step 3: Create Email Service
See `src/services/emailService.ts` (will be created)

### Step 4: Create Cloud Functions
See `functions/src/email.js` (will be created)

### Step 5: Create Templates in SendGrid
1. Dashboard → Email API → Dynamic Templates
2. Create each template
3. Store template IDs in Firestore

---

## Summary

**YES, Firebase supports utility emails!**

**Recommended Stack:**
- **Email Provider**: SendGrid
- **Integration**: Firebase Extension OR Direct API
- **Template Storage**: Firestore
- **Template Creation**: Admin Dashboard (we'll build this)
- **Sending**: Cloud Functions triggered by Firestore

**Cost for QuickLink Pay:**
- Start with SendGrid free tier (100 emails/day)
- Upgrade to Essentials plan when needed ($15/month for 40k emails)
- Very affordable for growing business

---

**Next Steps:**
1. Create SendGrid account
2. Implement email template management in admin dashboard
3. Create Cloud Functions for sending emails
4. Test with development templates
