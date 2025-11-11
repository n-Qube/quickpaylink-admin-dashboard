import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function updateMerchantCurrency() {
  try {
    console.log('🔄 Updating merchant currency from USD to GHS...\n');
    
    // Get all merchants
    const merchantsRef = db.collection('merchants');
    const snapshot = await merchantsRef.get();
    
    if (snapshot.empty) {
      console.log('No merchants found.');
      process.exit(0);
    }
    
    console.log(`Found ${snapshot.size} merchant(s)\n`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const merchantId = doc.id;
      const currentCurrency = data.financials?.currency;
      
      console.log(`Merchant: ${data.businessName} (${merchantId})`);
      console.log(`  Current currency: ${currentCurrency}`);
      
      if (currentCurrency === 'USD') {
        // Update to GHS
        await merchantsRef.doc(merchantId).update({
          'financials.currency': 'GHS',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`  ✅ Updated to GHS\n`);
        updated++;
      } else if (currentCurrency === 'GHS') {
        console.log(`  ⏭️  Already using GHS, skipped\n`);
        skipped++;
      } else {
        console.log(`  ⚠️  Unknown currency: ${currentCurrency}\n`);
        skipped++;
      }
    }
    
    console.log('━'.repeat(50));
    console.log(`\n✅ Update complete!`);
    console.log(`   Updated: ${updated} merchant(s)`);
    console.log(`   Skipped: ${skipped} merchant(s)`);
    console.log(`   Total: ${snapshot.size} merchant(s)\n`);
    
  } catch (error) {
    console.error('❌ Error updating merchant currency:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

updateMerchantCurrency();
