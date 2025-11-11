import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function seedTestData() {
  console.log('🌱 Starting test data seeding...\n');

  try {
    // 1. Business Types
    console.log('📦 Seeding Business Types...');
    const businessTypes = [
      {
        name: 'E-commerce',
        description: 'Online retail and shopping platforms',
        category: 'retail',
        isActive: true,
        requiresKYC: true,
        riskLevel: 'medium',
        sortOrder: 1,
      },
      {
        name: 'Restaurant',
        description: 'Food service and dining establishments',
        category: 'food_beverage',
        isActive: true,
        requiresKYC: false,
        riskLevel: 'low',
        sortOrder: 2,
      },
      {
        name: 'Professional Services',
        description: 'Consulting, legal, accounting services',
        category: 'professional',
        isActive: true,
        requiresKYC: true,
        riskLevel: 'low',
        sortOrder: 3,
      },
      {
        name: 'SaaS/Software',
        description: 'Software as a Service platforms',
        category: 'technology',
        isActive: true,
        requiresKYC: true,
        riskLevel: 'medium',
        sortOrder: 4,
      },
      {
        name: 'Healthcare',
        description: 'Medical and health services',
        category: 'health',
        isActive: true,
        requiresKYC: true,
        riskLevel: 'high',
        sortOrder: 5,
      },
    ];

    for (const type of businessTypes) {
      await db.collection('businessTypes').add({
        ...type,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    console.log(`✅ Created ${businessTypes.length} business types\n`);

    // 2. Currencies
    console.log('💱 Seeding Currencies...');
    const currencies = [
      { code: 'USD', name: 'US Dollar', symbol: '$', isActive: true, exchangeRate: 1.0 },
      { code: 'EUR', name: 'Euro', symbol: '€', isActive: true, exchangeRate: 0.92 },
      { code: 'GBP', name: 'British Pound', symbol: '£', isActive: true, exchangeRate: 0.79 },
      { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵', isActive: true, exchangeRate: 12.50 },
      { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', isActive: true, exchangeRate: 1250.0 },
      { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', isActive: true, exchangeRate: 130.0 },
    ];

    for (const currency of currencies) {
      await db.collection('currencies').doc(currency.code).set({
        ...currency,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    console.log(`✅ Created ${currencies.length} currencies\n`);

    // 3. Countries with Regions and Cities
    console.log('🌍 Seeding Countries, Regions, and Cities...');

    // Ghana
    console.log('  → Ghana...');
    await db.collection('countries').doc('GH').set({
      name: 'Ghana',
      code: 'GH',
      dialCode: '+233',
      currency: 'GHS',
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const ghanaRegions = [
      { id: 'greater-accra', name: 'Greater Accra', code: 'GA' },
      { id: 'ashanti', name: 'Ashanti', code: 'AH' },
      { id: 'western', name: 'Western', code: 'WP' },
    ];

    for (const region of ghanaRegions) {
      await db.collection('countries/GH/regions').doc(region.id).set({
        name: region.name,
        code: region.code,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    const ghanaCities = [
      { name: 'Accra', regionId: 'greater-accra' },
      { name: 'Tema', regionId: 'greater-accra' },
      { name: 'Kumasi', regionId: 'ashanti' },
      { name: 'Obuasi', regionId: 'ashanti' },
      { name: 'Takoradi', regionId: 'western' },
      { name: 'Sekondi', regionId: 'western' },
    ];

    for (const city of ghanaCities) {
      await db.collection('countries/GH/cities').add({
        ...city,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Nigeria
    console.log('  → Nigeria...');
    await db.collection('countries').doc('NG').set({
      name: 'Nigeria',
      code: 'NG',
      dialCode: '+234',
      currency: 'NGN',
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const nigeriaRegions = [
      { id: 'lagos', name: 'Lagos', code: 'LA' },
      { id: 'abuja', name: 'Federal Capital Territory', code: 'FC' },
    ];

    for (const region of nigeriaRegions) {
      await db.collection('countries/NG/regions').doc(region.id).set({
        name: region.name,
        code: region.code,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    const nigeriaCities = [
      { name: 'Lagos', regionId: 'lagos' },
      { name: 'Ikeja', regionId: 'lagos' },
      { name: 'Abuja', regionId: 'abuja' },
    ];

    for (const city of nigeriaCities) {
      await db.collection('countries/NG/cities').add({
        ...city,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Kenya
    console.log('  → Kenya...');
    await db.collection('countries').doc('KE').set({
      name: 'Kenya',
      code: 'KE',
      dialCode: '+254',
      currency: 'KES',
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const kenyaRegions = [
      { id: 'nairobi', name: 'Nairobi', code: 'NRB' },
      { id: 'mombasa', name: 'Mombasa', code: 'MBA' },
    ];

    for (const region of kenyaRegions) {
      await db.collection('countries/KE/regions').doc(region.id).set({
        name: region.name,
        code: region.code,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    const kenyaCities = [
      { name: 'Nairobi', regionId: 'nairobi' },
      { name: 'Mombasa', regionId: 'mombasa' },
    ];

    for (const city of kenyaCities) {
      await db.collection('countries/KE/cities').add({
        ...city,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    console.log('✅ Created 3 countries with regions and cities\n');

    // 4. Tax Rules
    console.log('💰 Seeding Tax Rules...');
    const taxRules = [
      {
        name: 'Ghana VAT',
        description: 'Standard VAT for Ghana',
        taxType: 'VAT',
        rate: 12.5,
        countryCode: 'GH',
        scope: 'COUNTRY',
        isActive: true,
        isCompound: false,
        priority: 1,
      },
      {
        name: 'Nigeria VAT',
        description: 'Standard VAT for Nigeria',
        taxType: 'VAT',
        rate: 7.5,
        countryCode: 'NG',
        scope: 'COUNTRY',
        isActive: true,
        isCompound: false,
        priority: 1,
      },
      {
        name: 'Kenya VAT',
        description: 'Standard VAT for Kenya',
        taxType: 'VAT',
        rate: 16.0,
        countryCode: 'KE',
        scope: 'COUNTRY',
        isActive: true,
        isCompound: false,
        priority: 1,
      },
    ];

    for (const tax of taxRules) {
      await db.collection('taxRules').add({
        ...tax,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    console.log(`✅ Created ${taxRules.length} tax rules\n`);

    // 5. System Config
    console.log('⚙️  Seeding System Configuration...');
    await db.collection('systemConfig').doc('general').set({
      platform: {
        name: 'QuickLink Pay',
        version: '1.0.0',
        environment: 'development',
      },
      defaults: {
        currency: 'GHS',
        country: 'GH',
        language: 'en',
        timezone: 'Africa/Accra',
        taxRate: 0.125,
      },
      features: {
        multiCurrency: true,
        taxManagement: true,
        kycVerification: true,
        webhooks: true,
      },
      limits: {
        maxMerchantsPerAdmin: 100,
        maxTransactionAmount: 1000000,
        minTransactionAmount: 1,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('✅ Created system configuration\n');

    console.log('🎉 Test data seeding completed successfully!\n');
    console.log('Summary:');
    console.log('  - 5 Business Types');
    console.log('  - 6 Currencies');
    console.log('  - 3 Countries');
    console.log('  - 7 Regions');
    console.log('  - 11 Cities');
    console.log('  - 3 Tax Rules');
    console.log('  - 1 System Config');
    console.log('\n✨ Your admin dashboard is now ready for testing!');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }

  process.exit(0);
}

seedTestData();
