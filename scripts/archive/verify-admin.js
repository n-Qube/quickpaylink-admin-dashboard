import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function verifyAdmin() {
  try {
    const uid = 'zCAdf8MV0kXxmty84zUH4rN7kQS2';
    console.log('Checking admin document for UID:', uid);
    
    const adminRef = db.collection('admins').doc(uid);
    const adminSnap = await adminRef.get();
    
    if (!adminSnap.exists) {
      console.log('❌ Admin document does NOT exist');
    } else {
      console.log('✅ Admin document exists');
      console.log('Document data:', JSON.stringify(adminSnap.data(), null, 2));
    }
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

verifyAdmin();
