import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function addSortOrder() {
  console.log('🔄 Adding sortOrder to existing business types...\n');

  try {
    const snapshot = await db.collection('businessTypes').get();
    
    if (snapshot.empty) {
      console.log('❌ No business types found!');
      return;
    }

    console.log(`Found ${snapshot.size} business types. Adding sortOrder...\n`);

    let index = 1;
    for (const doc of snapshot.docs) {
      const data = doc.data();
      console.log(`  Updating "${data.name}" with sortOrder: ${index}`);
      
      await doc.ref.update({
        sortOrder: index,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      index++;
    }

    console.log('\n✅ Successfully added sortOrder to all business types!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  process.exit(0);
}

addSortOrder();
