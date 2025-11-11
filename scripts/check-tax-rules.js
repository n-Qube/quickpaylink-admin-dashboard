import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function checkTaxRules() {
  try {
    console.log('📋 Checking Tax Rules collection...\n');

    const taxRulesRef = db.collection('taxRules');
    const taxRulesSnap = await taxRulesRef.get();

    if (taxRulesSnap.empty) {
      console.log('❌ No tax rules found in the database');
    } else {
      console.log(`✅ Found ${taxRulesSnap.size} tax rule(s)\n`);
      taxRulesSnap.forEach((doc) => {
        console.log(`Rule ID: ${doc.id}`);
        console.log(JSON.stringify(doc.data(), null, 2));
        console.log('---');
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}

checkTaxRules();
