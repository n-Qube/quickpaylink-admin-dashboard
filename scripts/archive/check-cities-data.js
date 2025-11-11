import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function checkCitiesData() {
  console.log('🔍 Checking cities data for Ghana/Greater Accra...\n');

  try {
    // Check regions first
    console.log('📍 Regions in Ghana:');
    const regionsSnap = await db.collection('countries/GH/regions').get();
    regionsSnap.forEach((doc) => {
      const data = doc.data();
      console.log(`  - ID: ${doc.id}, Name: ${data.name}`);
    });

    console.log('\n🏙️  Cities in Ghana:');
    const citiesSnap = await db.collection('countries/GH/cities').get();
    citiesSnap.forEach((doc) => {
      const data = doc.data();
      console.log(`  - ${data.name} (regionId: ${data.regionId})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  process.exit(0);
}

checkCitiesData();
