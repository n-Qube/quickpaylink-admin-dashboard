/**
 * Firebase Configuration for QuickLink Pay Super Admin
 *
 * This file initializes Firebase app and provides access to Firebase services.
 *
 * Setup Instructions:
 * 1. Create a Firebase project at https://console.firebase.google.com
 * 2. Enable Firestore Database
 * 3. Enable Authentication (Email/Password)
 * 4. Copy your Firebase config from Project Settings > General > Your apps
 * 5. Create a .env.local file with the following variables:
 *    VITE_FIREBASE_API_KEY=your-api-key
 *    VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
 *    VITE_FIREBASE_PROJECT_ID=your-project-id
 *    VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
 *    VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
 *    VITE_FIREBASE_APP_ID=your-app-id
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getFunctions, type Functions } from 'firebase/functions';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validate configuration
const validateConfig = () => {
  const requiredKeys = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
  ];

  const missing = requiredKeys.filter((key) => !firebaseConfig[key as keyof typeof firebaseConfig]);

  if (missing.length > 0) {
    console.error('Missing Firebase configuration keys:', missing);
    console.error('Please create a .env.local file with the required environment variables.');
    throw new Error(`Missing Firebase configuration: ${missing.join(', ')}`);
  }
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let functions: Functions;

try {
  validateConfig();

  // Initialize Firebase app (only once)
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase initialized successfully');
  } else {
    app = getApps()[0];
    console.log('✅ Firebase already initialized');
  }

  // Initialize Firebase services
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app);

  // Configure Firestore settings for better performance
  console.log('✅ Firebase services initialized');

  // Initialize App Check (imported dynamically to avoid circular dependency)
  // App Check will be initialized separately in main.tsx
  console.log('⏳ App Check will be initialized separately');

  // Log when Firestore is ready
  console.log('✅ Firestore ready');
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  throw error;
}

// Export Firebase services
export { app, auth, db, storage, functions };

// Export helper functions
export const isFirebaseConfigured = () => {
  try {
    validateConfig();
    return true;
  } catch {
    return false;
  }
};

// Collection names (matches our database schema)
export const COLLECTIONS = {
  // System & Configuration
  SYSTEM_CONFIG: 'systemConfig',
  ADMINS: 'admins',
  ROLES: 'roles',
  COUNTRIES: 'locations/countries',
  CURRENCIES: 'currencies',
  BUSINESS_TYPES: 'businessTypes',
  TAX_RULES: 'taxRules',

  // Subscription & Pricing
  SUBSCRIPTION_PLANS: 'subscriptionPlans',
  PRICING_RULES: 'pricingRules',

  // Merchants & Users
  MERCHANTS: 'merchants',
  TEAM_MEMBERS: 'teamMembers',

  // Merchant Operations
  INVOICES: 'invoices',
  CUSTOMERS: 'customers',
  PRODUCTS: 'products',
  PAYMENTS: 'payments',
  PAYOUTS: 'payouts',
  REPORTS: 'reports',

  // Communication
  NOTIFICATIONS: 'notifications',
  SUPPORT_TICKETS: 'supportTickets',

  // Email System
  EMAIL_TEMPLATES: 'emailTemplates',
  EMAIL_LOGS: 'emailLogs',
  SENDGRID_CONFIG: 'sendgridConfig',

  // WhatsApp System
  WHATSAPP_TEMPLATES: 'whatsappTemplates',
  WHATSAPP_MESSAGES: 'whatsappMessages',
  DIALOG_360_CONFIG: 'dialog360Config',

  // AI System
  AI_PROMPT_TEMPLATES: 'aiPromptTemplates',
  AI_USAGE_LOGS: 'aiUsageLogs',
  GEMINI_CONFIG: 'geminiConfig',

  // Integrations
  API_INTEGRATIONS: 'apiIntegrations',
  WEBHOOKS: 'webhooks',
  PAYSTACK_CONFIG: 'paystackConfig',

  // Monitoring & Logs
  AUDIT_LOGS: 'auditLogs',
  ALERTS: 'alerts',
  COMPLIANCE_REPORTS: 'complianceReports',
  SYSTEM_METRICS: 'systemMetrics',
  MAINTENANCE_WINDOWS: 'maintenanceWindows',

  // OTP & Authentication
  OTPS: 'otps',
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
