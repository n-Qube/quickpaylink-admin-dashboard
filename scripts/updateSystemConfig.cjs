/**
 * Update System Configuration with all new feature flags
 *
 * This script updates the existing platform_config_v1 document with all new features
 * while preserving existing settings.
 * Run with: node scripts/updateSystemConfig.cjs
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

async function updateSystemConfig() {
  console.log('🔄 Updating System Configuration with new feature flags...\n');

  try {
    const configRef = db.collection('systemConfig').doc('platform_config_v1');

    // Get existing config
    const configSnap = await configRef.get();

    if (!configSnap.exists) {
      console.log('❌ System Configuration does not exist! Run initSystemConfig.cjs first.');
      process.exit(1);
    }

    const existingConfig = configSnap.data();
    console.log('📋 Current features:', Object.keys(existingConfig.features || {}).length);

    // Merge with new feature flags
    const updatedFeatures = {
      // Preserve existing values or set defaults
      ...existingConfig.features,

      // CORE BUSINESS FEATURES (enabled by default)
      invoiceCreation: existingConfig.features?.invoiceCreation !== undefined
        ? existingConfig.features.invoiceCreation
        : true,
      customerManagement: existingConfig.features?.customerManagement !== undefined
        ? existingConfig.features.customerManagement
        : true,
      productManagement: existingConfig.features?.productManagement !== undefined
        ? existingConfig.features.productManagement
        : true,
      paymentRecording: existingConfig.features?.paymentRecording !== undefined
        ? existingConfig.features.paymentRecording
        : true,
      basicDashboard: existingConfig.features?.basicDashboard !== undefined
        ? existingConfig.features.basicDashboard
        : true,

      // COMMUNICATION FEATURES
      whatsappBusinessIntegration: existingConfig.features?.whatsappBusinessIntegration !== undefined
        ? existingConfig.features.whatsappBusinessIntegration
        : true,
      whatsappMessaging: existingConfig.features?.whatsappMessaging !== undefined
        ? existingConfig.features.whatsappMessaging
        : true,
      emailNotifications: existingConfig.features?.emailNotifications !== undefined
        ? existingConfig.features.emailNotifications
        : true,
      smsNotifications: existingConfig.features?.smsNotifications !== undefined
        ? existingConfig.features.smsNotifications
        : false,

      // ADVANCED FEATURES
      aiProductRecognition: existingConfig.features?.aiProductRecognition !== undefined
        ? existingConfig.features.aiProductRecognition
        : false,
      advancedReporting: existingConfig.features?.advancedReporting !== undefined
        ? existingConfig.features.advancedReporting
        : true,
      advancedAnalytics: existingConfig.features?.advancedAnalytics !== undefined
        ? existingConfig.features.advancedAnalytics
        : true,
      apiAccess: existingConfig.features?.apiAccess !== undefined
        ? existingConfig.features.apiAccess
        : true,
      webhooks: existingConfig.features?.webhooks !== undefined
        ? existingConfig.features.webhooks
        : false,

      // COLLABORATION FEATURES
      teamMembers: existingConfig.features?.teamMembers !== undefined
        ? existingConfig.features.teamMembers
        : true,
      roleBasedAccess: existingConfig.features?.roleBasedAccess !== undefined
        ? existingConfig.features.roleBasedAccess
        : true,

      // CUSTOMIZATION FEATURES
      customBranding: existingConfig.features?.customBranding !== undefined
        ? existingConfig.features.customBranding
        : false,
      multiCurrency: existingConfig.features?.multiCurrency !== undefined
        ? existingConfig.features.multiCurrency
        : existingConfig.features?.multiCurrencySupport !== undefined
          ? existingConfig.features.multiCurrencySupport
          : true,
      darkMode: existingConfig.features?.darkMode !== undefined
        ? existingConfig.features.darkMode
        : true,
      customDomains: existingConfig.features?.customDomains !== undefined
        ? existingConfig.features.customDomains
        : false,

      // SUPPORT FEATURES
      prioritySupport: existingConfig.features?.prioritySupport !== undefined
        ? existingConfig.features.prioritySupport
        : false,
      dedicatedAccountManager: existingConfig.features?.dedicatedAccountManager !== undefined
        ? existingConfig.features.dedicatedAccountManager
        : false,
    };

    // Update the document
    await configRef.update({
      version: '2.0.0',
      features: updatedFeatures,
      updatedAt: admin.firestore.Timestamp.now(),
      updatedBy: 'system_migration',
    });

    console.log('✅ System Configuration updated successfully!');
    console.log('\nUpdated Configuration:');
    console.log('- Version: 2.0.0');
    console.log('- Total Features:', Object.keys(updatedFeatures).length);
    console.log('- Enabled Features:', Object.keys(updatedFeatures).filter(k => updatedFeatures[k]).length);
    console.log('- Disabled Features:', Object.keys(updatedFeatures).filter(k => !updatedFeatures[k]).length);

    console.log('\n📋 Feature breakdown:');
    console.log('  Core Business: 5 features');
    console.log('  Communication: 4 features');
    console.log('  Advanced: 5 features');
    console.log('  Collaboration: 2 features');
    console.log('  Customization: 4 features');
    console.log('  Support: 2 features');

    console.log('\n✅ Refresh your Admin Dashboard to see the updated features!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating system config:', error);
    process.exit(1);
  }
}

updateSystemConfig();
