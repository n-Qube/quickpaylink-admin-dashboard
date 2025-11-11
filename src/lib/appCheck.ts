/**
 * Firebase App Check Configuration
 *
 * App Check helps protect your API resources from abuse by preventing
 * unauthorized clients from accessing your backend resources.
 *
 * For web apps, App Check uses reCAPTCHA Enterprise or reCAPTCHA v3.
 */

import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { app } from './firebase';

// Note: firebase/app-check is included in the main firebase package
// No additional installation needed

// reCAPTCHA site key from environment variables
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

// Enable debug token in development (allows localhost testing)
const IS_DEVELOPMENT = import.meta.env.DEV;

/**
 * Initialize Firebase App Check
 *
 * This should be called once when the app starts, before any Firebase services are used.
 *
 * In production: Uses reCAPTCHA v3 for invisible verification
 * In development: Can use debug tokens for local testing
 */
export function initializeFirebaseAppCheck() {
  try {
    // Check if App Check is already initialized
    if (typeof window === 'undefined') {
      console.log('⚠️  App Check: Running in SSR environment, skipping initialization');
      return null;
    }

    // Validate reCAPTCHA key
    if (!RECAPTCHA_SITE_KEY) {
      console.warn('⚠️  App Check: reCAPTCHA site key not configured');
      console.warn('   Set VITE_RECAPTCHA_SITE_KEY in your .env file');

      // In development, we can continue without App Check
      // In production, this should be treated as a critical error
      if (!IS_DEVELOPMENT) {
        throw new Error('App Check: reCAPTCHA site key is required in production');
      }

      return null;
    }

    // Initialize App Check with reCAPTCHA v3
    const appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),

      // Set to true to enable automatic token refresh
      isTokenAutoRefreshEnabled: true,
    });

    console.log('✅ App Check initialized successfully');
    console.log(IS_DEVELOPMENT ? '   Mode: Development' : '   Mode: Production');

    return appCheck;

  } catch (error) {
    console.error('❌ App Check initialization error:', error);

    // In development, log the error but don't block the app
    // In production, you might want to block the app or show an error page
    if (IS_DEVELOPMENT) {
      console.warn('   Continuing without App Check in development mode');
      return null;
    }

    throw error;
  }
}

/**
 * Enable App Check debug mode
 *
 * Call this function in your browser console to generate a debug token
 * for local development.
 *
 * Steps:
 * 1. Open browser console
 * 2. Run: enableAppCheckDebugMode()
 * 3. Copy the debug token from the console
 * 4. Add it to Firebase Console: App Check > Apps > Debug tokens
 * 5. Refresh the page
 *
 * @returns The debug token string
 */
export function enableAppCheckDebugMode() {
  if (!IS_DEVELOPMENT) {
    console.error('❌ Debug mode is only available in development');
    return null;
  }

  // Enable debug mode
  // @ts-ignore - self.FIREBASE_APPCHECK_DEBUG_TOKEN is a global variable
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;

  console.log('✅ App Check debug mode enabled');
  console.log('   Reload the page to see your debug token');
  console.log('   Add this token to Firebase Console > App Check > Debug tokens');

  return true;
}

/**
 * Check if App Check is enabled
 */
export function isAppCheckEnabled(): boolean {
  return !!RECAPTCHA_SITE_KEY;
}

/**
 * Get App Check configuration status
 */
export function getAppCheckStatus() {
  return {
    enabled: isAppCheckEnabled(),
    mode: IS_DEVELOPMENT ? 'development' : 'production',
    recaptchaConfigured: !!RECAPTCHA_SITE_KEY,
  };
}

// Export helper for use in other files
export { RECAPTCHA_SITE_KEY, IS_DEVELOPMENT };
