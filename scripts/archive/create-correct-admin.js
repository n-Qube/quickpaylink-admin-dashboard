import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function createCorrectAdmin() {
  const CORRECT_UID = 'zCAdf8MV0kXxmty84zUH4rN7kOS2'; // With 'O' not 'Q'
  const EMAIL = 'niinortey@n-qube.com';
  
  console.log('🚀 Creating admin document with correct UID:', CORRECT_UID);
  
  const adminData = {
    adminId: CORRECT_UID,
    email: EMAIL,
    phoneNumber: '+233XXXXXXXXX',
    profile: {
      firstName: 'Nii',
      lastName: 'Nortey',
      displayName: 'Nii Nortey',
      department: 'Platform Operations',
    },
    auth: {
      passwordHash: 'managed_by_firebase_auth',
      lastPasswordChange: admin.firestore.FieldValue.serverTimestamp(),
      twoFactorEnabled: false,
      lastLogin: admin.firestore.FieldValue.serverTimestamp(),
      loginCount: 0,
      failedLoginAttempts: 0,
    },
    roleId: 'super_admin_role',
    permissions: ['*'],
    accessLevel: 'super_admin',
    activeSessions: [],
    stats: {
      totalLogins: 0,
      totalActions: 0,
      lastActionAt: admin.firestore.FieldValue.serverTimestamp(),
      merchantsManaged: 0,
    },
    status: 'active',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: 'system_initialization_corrected',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: 'system_initialization_corrected',
  };
  
  await db.collection('admins').doc(CORRECT_UID).set(adminData);
  console.log('✅ Admin document created successfully!');
  console.log('   User UID:', CORRECT_UID);
  console.log('   Email:', EMAIL);
  console.log('   Access Level: super_admin');
  
  process.exit(0);
}

createCorrectAdmin().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
