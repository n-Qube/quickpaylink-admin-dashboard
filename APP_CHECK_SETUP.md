# Firebase App Check Setup Guide

## 🔐 What is Firebase App Check?

Firebase App Check helps protect your backend resources (Firestore, Cloud Functions, Storage) from abuse such as billing fraud and phishing. It ensures that only legitimate clients from your registered apps can access your backend.

**Without App Check:** Anyone can call your Cloud Functions or access your Firestore database if they know your Firebase config.

**With App Check:** Only verified clients (your web app, iOS app, Android app) can access your resources.

---

## 📦 What's Already Implemented

### Admin Dashboard (Web) ✅
- ✅ App Check initialized in `src/lib/appCheck.ts`
- ✅ Auto-initialization in `src/main.tsx`
- ✅ Environment variable configuration
- ✅ Development/production mode support
- ✅ Debug token support for localhost

### Cloud Functions ✅
- ✅ App Check verification helper function
- ✅ Token verification in `sendOTP` function
- ✅ Emulator bypass for development
- ✅ Production enforcement ready

### Flutter App ⏳
- ⏳ Needs implementation (see below)

---

## 🚀 Setup Steps

### Step 1: Register Your Apps in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `quicklink-pay-admin`
3. Navigate to **Build** > **App Check**
4. Click **Get Started** if you haven't already

### Step 2: Configure Web App (Admin Dashboard)

#### A. Register reCAPTCHA v3

1. Go to [Google Cloud Console - reCAPTCHA](https://console.cloud.google.com/security/recaptcha)
2. Click **Create Key**
3. Configure:
   - **Label**: QuickLink Pay Admin Dashboard
   - **reCAPTCHA type**: Score based (v3)
   - **Domains**:
     - `localhost` (for development)
     - `quicklink-pay-admin.web.app` (Firebase Hosting)
     - `quicklink-pay-admin.firebaseapp.com`
     - Your custom domain (if any)
4. Click **Submit**
5. Copy the **Site Key**

#### B. Add Site Key to Firebase App Check

1. In Firebase Console > App Check
2. Under **Apps**, find your web app
3. Click **⋮** (three dots) > **Manage**
4. Select **reCAPTCHA v3**
5. Paste your site key
6. Click **Save**

#### C. Add Site Key to Environment Variables

Update your `.env.local` file:

```bash
# Firebase App Check (Security)
VITE_RECAPTCHA_SITE_KEY=your-recaptcha-site-key-here
```

**Important:** Also update `.env.example` for other developers.

#### D. Test Locally with Debug Tokens

For localhost testing:

1. Open your app in the browser: `http://localhost:5173`
2. Open browser console (F12)
3. Run:
   ```javascript
   enableAppCheckDebugMode()
   ```
4. Reload the page
5. Copy the debug token from the console (looks like: `550E8400-E29B-41D4-A716-446655440000`)
6. In Firebase Console > App Check > Apps > Web App > **Debug tokens**
7. Click **Add debug token**
8. Paste the token and give it a name (e.g., "Local Development")
9. Click **Add**

Now your localhost can pass App Check verification!

### Step 3: Configure iOS App (Flutter)

#### A. Register App Attest

1. In Firebase Console > App Check
2. Find your iOS app
3. Click **⋮** > **Manage**
4. Select **App Attest**
5. Click **Save**

#### B. Add App Check to Flutter (iOS)

1. Open `ios/Runner.xcworkspace` in Xcode
2. Add App Attest capability:
   - Select your app target
   - Go to **Signing & Capabilities**
   - Click **+ Capability**
   - Add **App Attest**

3. Update `ios/Podfile`:
   ```ruby
   pod 'FirebaseAppCheck'
   ```

4. Run:
   ```bash
   cd ios && pod install && cd ..
   ```

5. Update Flutter code (see Flutter implementation section below)

### Step 4: Configure Android App (Flutter)

#### A. Register Play Integrity

1. In Firebase Console > App Check
2. Find your Android app
3. Click **⋮** > **Manage**
4. Select **Play Integrity**
5. Click **Save**

#### B. Enable Play Integrity API

1. Go to [Google Cloud Console - Play Integrity API](https://console.cloud.google.com/apis/library/playintegrity.googleapis.com)
2. Make sure your Firebase project is selected
3. Click **Enable**

#### C. Link to Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app
3. Go to **Release** > **Setup** > **App integrity**
4. Link to your Google Cloud project

5. Update Flutter code (see Flutter implementation section below)

### Step 5: Enforce App Check in Firestore Rules

Update `firestore.rules` to require App Check:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper to check App Check
    function hasValidAppCheck() {
      return request.auth != null && request.auth.token.firebase.sign_in_provider != null;
    }

    // Example: Require App Check for all collections
    match /{document=**} {
      allow read, write: if hasValidAppCheck();
    }
  }
}
```

### Step 6: Deploy Changes

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Cloud Functions (with App Check verification)
firebase deploy --only functions
```

---

## 🔧 Flutter Implementation

### 1. Add Dependencies

Update `pubspec.yaml`:

```yaml
dependencies:
  firebase_app_check: ^0.2.1+0  # Check for latest version
```

Run:
```bash
flutter pub get
```

### 2. Initialize App Check

Create `lib/core/services/app_check_service.dart`:

```dart
import 'package:firebase_app_check/firebase_app_check.dart';
import 'package:flutter/foundation.dart';

class AppCheckService {
  static Future<void> initialize() async {
    try {
      await FirebaseAppCheck.instance.activate(
        // iOS: App Attest (production)
        appleProvider: kDebugMode
            ? AppleProvider.debug
            : AppleProvider.appAttest,

        // Android: Play Integrity (production)
        androidProvider: kDebugMode
            ? AndroidProvider.debug
            : AndroidProvider.playIntegrity,

        // Web: reCAPTCHA (handled by JS SDK)
        webProvider: ReCaptchaV3Provider('your-recaptcha-site-key'),
      );

      print('✅ App Check initialized');
    } catch (e) {
      print('❌ App Check initialization failed: $e');
      // In production, you might want to block the app here
      if (!kDebugMode) {
        throw Exception('App Check is required in production');
      }
    }
  }
}
```

### 3. Initialize in main.dart

```dart
import 'package:firebase_core/firebase_core.dart';
import 'core/services/app_check_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  // Initialize App Check BEFORE any Firebase operations
  await AppCheckService.initialize();

  runApp(MyApp());
}
```

### 4. Debug Tokens for Development

#### iOS Simulator:
```bash
# Get debug token
firebase appcheck:debug-token ios --bundle-id com.example.yourapp

# Add to Firebase Console
```

#### Android Emulator:
```bash
# Get debug token
firebase appcheck:debug-token android --package-name com.example.yourapp

# Add to Firebase Console
```

---

## ✅ Verification & Testing

### Test Web App

1. Open dev tools console
2. Look for:
   ```
   ✅ App Check initialized successfully
   Mode: Development (or Production)
   ```

3. Try calling a Cloud Function:
   ```javascript
   import { getFunctions, httpsCallable } from 'firebase/functions';

   const functions = getFunctions();
   const sendOTP = httpsCallable(functions, 'sendOTP');

   try {
     const result = await sendOTP({ phoneNumber: '+1234567890' });
     console.log('Success:', result.data);
   } catch (error) {
     console.error('Error:', error);
   }
   ```

4. If App Check fails, you'll see:
   ```
   Error: failed-precondition
   App Check verification failed. Please use an official app.
   ```

### Test Flutter App

1. Run the app:
   ```bash
   flutter run
   ```

2. Check logs for:
   ```
   ✅ App Check initialized
   ```

3. Try a Firebase operation (e.g., read from Firestore)

4. If App Check fails:
   - **iOS**: Check App Attest is enabled in Xcode
   - **Android**: Check Play Integrity API is enabled
   - **Both**: Add debug tokens for development devices

### Monitor in Firebase Console

1. Go to Firebase Console > App Check > Metrics
2. View:
   - **Requests**: Total requests with App Check tokens
   - **Verification rate**: % of valid tokens
   - **App Check usage**: Which apps are sending tokens

---

## 🐛 Troubleshooting

### "App Check token is missing" Error

**Cause:** Client didn't send App Check token

**Solutions:**
- Verify App Check is initialized before Firebase operations
- Check environment variable `VITE_RECAPTCHA_SITE_KEY` is set
- For localhost, add debug token

### "App Check verification failed" Error

**Cause:** Token verification failed on server

**Solutions:**
- Check reCAPTCHA site key is correct
- Verify domain is registered in reCAPTCHA settings
- For development, use debug tokens
- Check Firebase Console > App Check > Metrics for errors

### iOS: "App Attest is not available" Error

**Cause:** App Attest requires iOS 14+ and real device

**Solutions:**
- Use debug provider for simulators
- Test on real device with iOS 14+
- In development, use `AppleProvider.debug`

### Android: "Play Integrity API not enabled" Error

**Cause:** Play Integrity API not enabled in Google Cloud

**Solutions:**
- Enable Play Integrity API in Google Cloud Console
- Link app to Play Console
- Use debug provider for emulators

### reCAPTCHA Badge Showing on Page

**Cause:** reCAPTCHA v3 shows a badge by default

**Solutions:**
- Add CSS to hide it (allowed by reCAPTCHA ToS):
  ```css
  .grecaptcha-badge {
    visibility: hidden;
  }
  ```
- Add "Protected by reCAPTCHA" notice to your privacy policy

---

## 🔒 Security Best Practices

### 1. Use Strong Enforcement in Production

In Cloud Functions:

```typescript
// Enforce App Check in production only
if (!isValidAppCheck && process.env.NODE_ENV === 'production') {
  throw new functions.https.HttpsError(
    'failed-precondition',
    'App Check verification failed'
  );
}
```

### 2. Rotate Debug Tokens Regularly

- Delete old debug tokens
- Generate new ones for each developer
- Don't share debug tokens publicly

### 3. Monitor App Check Metrics

- Check verification rate (should be > 95%)
- Investigate failed verifications
- Set up alerts for suspicious activity

### 4. Combine with Authentication

App Check verifies the app is legitimate.
Firebase Auth verifies the user is legitimate.

Use both together:

```typescript
// Check both App Check AND authentication
if (!isValidAppCheck) {
  throw new functions.https.HttpsError('failed-precondition', 'Invalid app');
}

if (!context.auth) {
  throw new functions.https.HttpsError('unauthenticated', 'Not authenticated');
}
```

### 5. Gradual Rollout

Start with monitoring (don't block):
1. Deploy App Check without enforcement
2. Monitor metrics for 1-2 weeks
3. Fix any issues with legitimate clients
4. Enable enforcement in production

---

## 📚 Additional Resources

- [Firebase App Check Documentation](https://firebase.google.com/docs/app-check)
- [reCAPTCHA v3 Documentation](https://developers.google.com/recaptcha/docs/v3)
- [Play Integrity API](https://developer.android.com/google/play/integrity)
- [App Attest (iOS)](https://developer.apple.com/documentation/devicecheck/dcappattestservice)

---

## 📋 Checklist

### Web App (Admin Dashboard)
- [x] App Check code implemented
- [ ] reCAPTCHA site key registered
- [ ] Site key added to .env.local
- [ ] Debug token added for localhost
- [ ] Tested in development
- [ ] Tested in production

### iOS App
- [ ] App Attest configured in Firebase
- [ ] App Check added to Flutter
- [ ] Capability added in Xcode
- [ ] Debug token added for simulator
- [ ] Tested on real device

### Android App
- [ ] Play Integrity configured in Firebase
- [ ] Play Integrity API enabled
- [ ] App linked to Play Console
- [ ] App Check added to Flutter
- [ ] Debug token added for emulator
- [ ] Tested on real device

### Cloud Functions
- [x] App Check verification implemented
- [x] Emulator bypass added
- [ ] Production enforcement enabled
- [ ] Deployed to Firebase

### Firestore Rules
- [ ] App Check enforcement added
- [ ] Rules tested in development
- [ ] Rules deployed to production

---

## 🎯 Summary

**Status: Partial Implementation Complete**

**What's Done:**
- ✅ Web App: Code implemented
- ✅ Cloud Functions: Verification added
- ✅ Documentation: Complete

**What's Needed:**
- ⏳ Configure reCAPTCHA in Google Cloud
- ⏳ Add reCAPTCHA site key to .env
- ⏳ Implement in Flutter app
- ⏳ Test and deploy

**Estimated Setup Time:**
- Web: 15-30 minutes (just config)
- iOS: 30-45 minutes
- Android: 30-45 minutes
- Total: ~2 hours

**Priority:** Medium (can be deployed without, but strongly recommended for production)
