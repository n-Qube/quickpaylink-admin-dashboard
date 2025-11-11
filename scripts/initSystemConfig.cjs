/**
 * Initialize System Configuration in Firestore
 *
 * This script creates the initial platform_config_v1 document with default settings.
 * Run with: node scripts/initSystemConfig.cjs
 */

const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

// Initialize Firebase Admin (only if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function initSystemConfig() {
  console.log('🔧 Initializing System Configuration...\n');

  try {
    const configRef = db.collection('systemConfig').doc('platform_config_v1');

    // Check if config already exists
    const configSnap = await configRef.get();

    if (configSnap.exists) {
      console.log('⚠️  System Configuration already exists!');
      console.log('Current config:', configSnap.data());
      console.log('\nTo update, delete the existing document first or modify this script.');
      process.exit(0);
    }

    const defaultConfig = {
      configId: 'platform_config_v1',
      version: '2.0.0',
      features: {
        // CORE BUSINESS FEATURES (enabled by default)
        invoiceCreation: true,
        customerManagement: true,
        productManagement: true,
        paymentRecording: true,
        basicDashboard: true,

        // COMMUNICATION FEATURES
        whatsappBusinessIntegration: true,
        whatsappMessaging: true,
        emailNotifications: true,
        smsNotifications: false,

        // ADVANCED FEATURES
        aiProductRecognition: false,
        advancedReporting: true,
        advancedAnalytics: true,
        apiAccess: true,
        webhooks: false,

        // COLLABORATION FEATURES
        teamMembers: true,
        roleBasedAccess: true,

        // CUSTOMIZATION FEATURES
        customBranding: false,
        multiCurrency: true,
        darkMode: true,
        customDomains: false,

        // SUPPORT FEATURES
        prioritySupport: false,
        dedicatedAccountManager: false,
      },
      platformSettings: {
        maintenanceMode: false,
        maintenanceMessage: '',
        allowNewMerchantSignup: true,
        maxMerchantsLimit: 10000,
      },
      defaults: {
        currency: 'GHS',
        country: 'GH',
        language: 'en',
        timezone: 'Africa/Accra',
        taxRate: 0.125,
      },
      rateLimits: {
        otpPerHour: 3,
        apiCallsPerMinute: 100,
        whatsappMessagesPerDay: 1000,
      },
      transactionFees: {
        domestic: {
          percentage: 2.5,
          fixed: 0.30,
          minimum: 0.10,
          maximum: 50.00,
        },
        international: {
          percentage: 3.5,
          fixed: 0.50,
          minimum: 0.20,
          maximum: 100.00,
        },
      },
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      updatedBy: 'system',
    };

    await configRef.set(defaultConfig);

    console.log('✅ System Configuration initialized successfully!');
    console.log('\nConfiguration Details:');
    console.log('- Config ID:', defaultConfig.configId);
    console.log('- Version:', defaultConfig.version);
    console.log('- Default Currency:', defaultConfig.defaults.currency);
    console.log('- Default Country:', defaultConfig.defaults.country);
    console.log('- Enabled Features:', Object.keys(defaultConfig.features).filter(k => defaultConfig.features[k]).length);
    console.log('- Disabled Features:', Object.keys(defaultConfig.features).filter(k => !defaultConfig.features[k]).length);
    console.log('\n✅ You can now access System Configuration in the Admin Dashboard!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing system config:', error);
    process.exit(1);
  }
}

initSystemConfig();
