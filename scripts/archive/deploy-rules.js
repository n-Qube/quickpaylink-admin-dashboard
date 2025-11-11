import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

console.log('📤 Deploying Firestore rules...');
console.log('⚠️  Note: Rules must be deployed through Firebase Console or CLI.');
console.log('\nTo deploy the updated firestore.rules file:');
console.log('1. Go to Firebase Console > Firestore Database > Rules');
console.log('2. Copy the contents of firestore.rules');
console.log('3. Paste and publish the rules');
console.log('\nOR use Firebase CLI:');
console.log('   firebase deploy --only firestore:rules --project quicklink-pay-admin');

process.exit(0);
