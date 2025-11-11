import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function checkBusinessTypes() {
  console.log('🔍 Checking businessTypes collection in Firestore...\n');

  try {
    const snapshot = await db.collection('businessTypes').get();

    if (snapshot.empty) {
      console.log('❌ No business types found in Firestore!');
      return;
    }

    console.log(`✅ Found ${snapshot.size} business type(s):\n`);

    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`  ID: ${doc.id}`);
      console.log(`  Name: ${data.name}`);
      console.log(`  Category: ${data.category}`);
      console.log(`  Is Active: ${data.isActive}`);
      console.log('  ---');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  process.exit(0);
}

checkBusinessTypes();
