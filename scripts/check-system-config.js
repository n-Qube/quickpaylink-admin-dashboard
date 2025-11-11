import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function checkSystemConfig() {
  try {
    console.log('📋 Checking SystemConfig document...\n');
    
    const configRef = db.collection('systemConfig').doc('platform_config_v1');
    const configSnap = await configRef.get();
    
    if (!configSnap.exists) {
      console.log('❌ SystemConfig document does NOT exist');
    } else {
      console.log('✅ SystemConfig document exists');
      console.log('\nDocument data:');
      console.log(JSON.stringify(configSnap.data(), null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}

checkSystemConfig();
