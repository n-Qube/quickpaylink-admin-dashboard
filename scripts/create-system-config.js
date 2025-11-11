import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function createSystemConfig() {
  try {
    console.log('🚀 Creating SystemConfig document...\n');
    
    const systemConfig = {
      configId: 'platform_config_v1',
      version: '1.0.0',
      features: {
        whatsappCoexistence: true,
        aiProductRecognition: false,
        multiCurrencySupport: true,
        apiAccess: true,
        darkMode: true,
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
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'system_initialization',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: 'system_initialization',
    };
    
    const configRef = db.collection('systemConfig').doc('platform_config_v1');
    await configRef.set(systemConfig);
    
    console.log('✅ SystemConfig document created successfully!');
    console.log('\nDocument data:');
    console.log(JSON.stringify(systemConfig, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
}

createSystemConfig();
