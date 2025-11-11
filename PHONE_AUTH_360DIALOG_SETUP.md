# Firebase Phone Authentication with 360Dialog Integration

## Overview
This document explains how to enable Firebase Phone Authentication for merchant mobile app registration and integrate it with 360Dialog for WhatsApp OTP delivery.

---

## Part 1: Enable Firebase Phone Authentication

### Step 1: Enable Phone Sign-in in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **quicklink-pay-admin**
3. Navigate to **Authentication** → **Sign-in method**
4. Click on **Phone** provider
5. Click **Enable**
6. Save changes

### Step 2: Configure App Verification (Important for Production)

Firebase Phone Auth requires reCAPTCHA verification for web apps:

#### For Web Apps:
```javascript
import { getAuth, RecaptchaVerifier } from 'firebase/auth';

const auth = getAuth();

// Initialize reCAPTCHA verifier
window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
  size: 'invisible',
  callback: (response) => {
    // reCAPTCHA solved
    onSignInSubmit();
  }
});
```

#### For Mobile Apps (React Native/Flutter):
- iOS: Automatic app verification via APNs
- Android: Automatic app verification via SafetyNet

---

## Part 2: 360Dialog Integration for WhatsApp OTP

### What is 360Dialog?

360Dialog is a WhatsApp Business API provider that allows you to send WhatsApp messages programmatically, including OTP codes.

### Step 1: Get 360Dialog Account

1. Sign up at [360Dialog Partner Portal](https://hub.360dialog.com/)
2. Complete business verification
3. Get your **API Key** and **WhatsApp Number ID**

### Step 2: Create WhatsApp Message Template for OTP

In 360Dialog dashboard:

1. Go to **Message Templates**
2. Click **Create Template**
3. Use the following template:

```
Template Name: merchant_otp_verification
Category: AUTHENTICATION
Language: English

Template Content:
---
Your QuickLink Pay verification code is: {{1}}

This code will expire in 5 minutes. Do not share this code with anyone.

---
```

**Template Variables:**
- `{{1}}` = OTP Code (6-digit number)

4. Submit for WhatsApp approval (usually takes 24-48 hours)

### Step 3: Store 360Dialog Credentials

Add to your backend `.env` file:

```env
# 360Dialog Configuration
DIALOG_360_API_KEY=your_360dialog_api_key_here
DIALOG_360_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
DIALOG_360_API_URL=https://waba.360dialog.io/v1
```

### Step 4: Create Backend API Endpoint for Sending OTP

Create a Cloud Function or Express API endpoint:

```javascript
// functions/src/sendWhatsAppOTP.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

const DIALOG_360_API_KEY = process.env.DIALOG_360_API_KEY;
const DIALOG_360_API_URL = process.env.DIALOG_360_API_URL;

exports.sendWhatsAppOTP = functions.https.onCall(async (data, context) => {
  const { phoneNumber } = data;

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Store OTP in Firestore with expiration
  const otpRef = admin.firestore().collection('otpCodes').doc(phoneNumber);
  await otpRef.set({
    code: otp,
    phoneNumber: phoneNumber,
    expiresAt: admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    ),
    verified: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Send OTP via 360Dialog WhatsApp
  try {
    const response = await axios.post(
      `${DIALOG_360_API_URL}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phoneNumber, // Format: +233XXXXXXXXX
        type: 'template',
        template: {
          name: 'merchant_otp_verification',
          language: {
            code: 'en'
          },
          components: [
            {
              type: 'body',
              parameters: [
                {
                  type: 'text',
                  text: otp
                }
              ]
            }
          ]
        }
      },
      {
        headers: {
          'D360-API-KEY': DIALOG_360_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('WhatsApp OTP sent successfully:', response.data);

    return {
      success: true,
      message: 'OTP sent successfully via WhatsApp',
    };
  } catch (error) {
    console.error('Error sending WhatsApp OTP:', error.response?.data || error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to send OTP via WhatsApp'
    );
  }
});
```

### Step 5: Verify OTP Function

```javascript
// functions/src/verifyWhatsAppOTP.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.verifyWhatsAppOTP = functions.https.onCall(async (data, context) => {
  const { phoneNumber, code } = data;

  // Get OTP from Firestore
  const otpRef = admin.firestore().collection('otpCodes').doc(phoneNumber);
  const otpDoc = await otpRef.get();

  if (!otpDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'OTP not found');
  }

  const otpData = otpDoc.data();

  // Check if OTP is expired
  if (otpData.expiresAt.toDate() < new Date()) {
    throw new functions.https.HttpsError('deadline-exceeded', 'OTP has expired');
  }

  // Check if OTP matches
  if (otpData.code !== code) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid OTP');
  }

  // Mark OTP as verified
  await otpRef.update({
    verified: true,
    verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Create custom token for Firebase Auth
  const customToken = await admin.auth().createCustomToken(phoneNumber);

  return {
    success: true,
    token: customToken,
    message: 'OTP verified successfully',
  };
});
```

---

## Part 3: Mobile App Implementation (React Native Example)

### Step 1: Install Dependencies

```bash
npm install @react-native-firebase/auth
npm install @react-native-firebase/app
```

### Step 2: Merchant Registration Flow

```javascript
// MerchantRegistration.js
import React, { useState } from 'react';
import { View, TextInput, Button, Text } from 'react-native';
import auth from '@react-native-firebase/auth';
import functions from '@react-native-firebase/functions';

export default function MerchantRegistration() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOTP] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' or 'verify'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Send OTP
  const sendOTP = async () => {
    try {
      setLoading(true);
      setError('');

      // Call backend function to send WhatsApp OTP
      const sendOTPFunction = functions().httpsCallable('sendWhatsAppOTP');
      const result = await sendOTPFunction({ phoneNumber });

      if (result.data.success) {
        setStep('verify');
        alert('OTP sent to your WhatsApp!');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and Sign In
  const verifyOTP = async () => {
    try {
      setLoading(true);
      setError('');

      // Call backend function to verify OTP
      const verifyOTPFunction = functions().httpsCallable('verifyWhatsAppOTP');
      const result = await verifyOTPFunction({ phoneNumber, code: otp });

      if (result.data.success) {
        // Sign in with custom token
        await auth().signInWithCustomToken(result.data.token);

        // Navigate to merchant dashboard or complete profile
        alert('Successfully signed in!');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      {step === 'phone' ? (
        <>
          <Text>Enter your phone number</Text>
          <TextInput
            placeholder="+233XXXXXXXXX"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            style={{ borderWidth: 1, padding: 10, marginVertical: 10 }}
          />
          <Button
            title="Send OTP"
            onPress={sendOTP}
            disabled={loading || !phoneNumber}
          />
        </>
      ) : (
        <>
          <Text>Enter the OTP sent to your WhatsApp</Text>
          <TextInput
            placeholder="123456"
            value={otp}
            onChangeText={setOTP}
            keyboardType="number-pad"
            maxLength={6}
            style={{ borderWidth: 1, padding: 10, marginVertical: 10 }}
          />
          <Button
            title="Verify OTP"
            onPress={verifyOTP}
            disabled={loading || otp.length !== 6}
          />
          <Button
            title="Resend OTP"
            onPress={sendOTP}
            disabled={loading}
          />
        </>
      )}

      {error && <Text style={{ color: 'red' }}>{error}</Text>}
    </View>
  );
}
```

---

## Part 4: Security Best Practices

### 1. Rate Limiting
Implement rate limiting to prevent OTP spam:

```javascript
// Check rate limit before sending OTP
const rateLimitRef = admin.firestore()
  .collection('rateLimits')
  .doc(phoneNumber);

const rateLimitDoc = await rateLimitRef.get();
const now = Date.now();

if (rateLimitDoc.exists) {
  const lastSent = rateLimitDoc.data().lastSent;
  if (now - lastSent < 60000) { // 1 minute
    throw new Error('Please wait before requesting another OTP');
  }
}

await rateLimitRef.set({
  lastSent: now,
  count: admin.firestore.FieldValue.increment(1),
});
```

### 2. OTP Attempt Limiting
Limit OTP verification attempts:

```javascript
// In verifyWhatsAppOTP function
if (otpData.attempts >= 3) {
  throw new functions.https.HttpsError(
    'resource-exhausted',
    'Maximum OTP attempts exceeded'
  );
}

await otpRef.update({
  attempts: admin.firestore.FieldValue.increment(1),
});
```

### 3. Phone Number Validation
Validate phone numbers before sending OTP:

```javascript
const parsePhoneNumber = require('libphonenumber-js');

function validatePhoneNumber(phoneNumber) {
  try {
    const parsedNumber = parsePhoneNumber(phoneNumber);
    return parsedNumber && parsedNumber.isValid();
  } catch {
    return false;
  }
}
```

---

## Part 5: Testing

### Test with 360Dialog Sandbox

Before going live, test with 360Dialog sandbox:

```javascript
// Test phone numbers (in sandbox mode)
const TEST_PHONE_NUMBERS = [
  '+1234567890', // Add your test numbers
];

if (process.env.NODE_ENV === 'development') {
  // Use test template or skip actual WhatsApp sending
  console.log(`Would send OTP ${otp} to ${phoneNumber}`);
}
```

---

## Part 6: Cost Considerations

### 360Dialog Pricing (Approximate)
- **Authentication template**: ~$0.005 - $0.01 per message
- **Monthly minimum**: Varies by plan
- **Free tier**: Limited messages per month

### Firebase Phone Auth Pricing
- Free for most use cases
- Charges may apply for high volume (>10k authentications/month)

---

## Summary Checklist

- [ ] Enable Phone Authentication in Firebase Console
- [ ] Create 360Dialog account and get API credentials
- [ ] Create and get approval for WhatsApp OTP template
- [ ] Deploy backend Cloud Functions for OTP sending/verification
- [ ] Implement mobile app registration flow
- [ ] Add rate limiting and security measures
- [ ] Test in sandbox environment
- [ ] Monitor costs and usage

---

## Support Resources

- **Firebase Phone Auth**: https://firebase.google.com/docs/auth/web/phone-auth
- **360Dialog API Docs**: https://docs.360dialog.com/
- **WhatsApp Business API**: https://developers.facebook.com/docs/whatsapp/
