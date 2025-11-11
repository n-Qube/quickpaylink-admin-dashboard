import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function checkAuthUID() {
  try {
    const email = 'niinortey@n-qube.com';
    console.log('Looking up user by email:', email);
    
    const userRecord = await admin.auth().getUserByEmail(email);
    console.log('\n✅ Found user:');
    console.log('UID:', userRecord.uid);
    console.log('Email:', userRecord.email);
    console.log('Email Verified:', userRecord.emailVerified);
    
    // Check if admin document exists for this UID
    const db = admin.firestore();
    const adminRef = db.collection('admins').doc(userRecord.uid);
    const adminSnap = await adminRef.get();
    
    console.log('\nAdmin document exists:', adminSnap.exists);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}

checkAuthUID();
