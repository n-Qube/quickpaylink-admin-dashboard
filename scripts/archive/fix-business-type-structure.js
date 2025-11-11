import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function fixBusinessTypeStructure() {
  console.log('🔄 Adding missing structure to business types...\n');

  try {
    const snapshot = await db.collection('businessTypes').get();

    if (snapshot.empty) {
      console.log('❌ No business types found!');
      return;
    }

    console.log(`Found ${snapshot.size} business types. Adding missing fields...\n`);

    for (const doc of snapshot.docs) {
      const data = doc.data();
      console.log(`  Updating "${data.name}"...`);

      // Add default structure if fields are missing
      const updates = {};

      if (!data.requirements) {
        updates.requirements = {
          requiresInventory: false,
          requiresAppointments: false,
          requiresDelivery: false,
          requiresTableManagement: false,
          allowsMultipleLocations: true,
        };
      }

      if (!data.features) {
        updates.features = {
          enableProductCatalog: true,
          enableServiceBooking: false,
          enableMenuManagement: false,
          enableStaffManagement: false,
          enableCustomerRewards: false,
        };
      }

      if (!data.limits) {
        updates.limits = {
          maxProducts: 1000,
          maxServices: 100,
          maxStaff: 10,
        };
      }

      const updateCount = Object.keys(updates).length;
      if (updateCount > 0) {
        updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        await doc.ref.update(updates);
        console.log(`    ✅ Added ${updateCount} missing field(s)`);
      } else {
        console.log(`    ⏭️  Already has all required fields`);
      }
    }

    console.log('\n✅ Successfully updated all business types!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  process.exit(0);
}

fixBusinessTypeStructure();
