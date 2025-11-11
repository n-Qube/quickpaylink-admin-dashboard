/**
 * Script to create the first super admin account in Firestore
 *
 * Usage:
 * 1. Make sure you've created the user in Firebase Authentication first
 * 2. Update the USER_UID and EMAIL constants below
 * 3. Run: node scripts/create-admin.js
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// CONFIGURATION - Update these values
const USER_UID = 'zCAdf8MV0kXxmty84zUH4rN7kQS2';
const EMAIL = 'niinortey@n-qube.com';
const PHONE_NUMBER = '+233XXXXXXXXX'; // Update with real phone number
const FIRST_NAME = 'Nii';
const LAST_NAME = 'Nortey';

// Initialize Firebase Admin
// You'll need to download your service account key from Firebase Console
// Go to: Project Settings > Service Accounts > Generate New Private Key
const serviceAccountPath = join(__dirname, '../firebase-service-account.json');

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
} catch (error) {
  console.error('❌ Error: Could not find firebase-service-account.json');
  console.error('Please download your service account key from Firebase Console:');
  console.error('Project Settings > Service Accounts > Generate New Private Key');
  console.error(`Save it as: ${serviceAccountPath}`);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function createSuperAdmin() {
  console.log('🚀 Creating Super Admin account...\n');

  const adminData = {
    adminId: USER_UID,
    email: EMAIL,
    phoneNumber: PHONE_NUMBER,
    profile: {
      firstName: FIRST_NAME,
      lastName: LAST_NAME,
      displayName: `${FIRST_NAME} ${LAST_NAME}`,
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
    createdBy: 'system_initialization',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: 'system_initialization',
  };

  try {
    // Create admin document
    await db.collection('admins').doc(USER_UID).set(adminData);
    console.log('✅ Admin document created successfully!');
    console.log(`   User UID: ${USER_UID}`);
    console.log(`   Email: ${EMAIL}`);
    console.log(`   Access Level: super_admin`);
    console.log(`   Permissions: * (all)\n`);

    // Create super admin role
    const roleData = {
      roleId: 'super_admin_role',
      name: 'super_admin',
      displayName: 'Super Administrator',
      description: 'Full platform access with all permissions',
      level: 1,
      permissions: {
        systemConfig: { read: true, write: true, delete: true },
        apiManagement: { read: true, write: true, delete: true },
        pricing: { read: true, write: true, delete: true },
        merchantManagement: {
          read: true,
          write: true,
          delete: true,
          suspend: true,
          terminate: true,
        },
        analytics: { read: true, export: true },
        systemHealth: { read: true, write: true },
        compliance: { read: true, write: true, export: true },
        auditLogs: { read: true },
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true,
    };

    await db.collection('roles').doc('super_admin_role').set(roleData);
    console.log('✅ Super Admin role created successfully!\n');

    console.log('🎉 Setup complete! You can now login at http://localhost:5174/login');
    console.log(`   Email: ${EMAIL}`);
    console.log('   Password: [the password you set in Firebase Authentication]\n');
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

createSuperAdmin();
