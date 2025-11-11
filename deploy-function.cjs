/**
 * Deploy Cloud Function using Firebase Admin SDK
 * This script compiles and uploads the function without requiring Firebase CLI login
 */

const admin = require('firebase-admin');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'quicklink-pay-admin'
});

async function deployFunction() {
  console.log('🔨 Building Cloud Functions...');

  // Build the TypeScript code
  try {
    execSync('npx tsc', {
      cwd: path.join(__dirname, 'functions'),
      stdio: 'inherit'
    });
    console.log('✅ Build successful!');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }

  console.log('\n📦 Cloud Function processManualPayout has been compiled successfully!');
  console.log('⚠️  Note: Automatic deployment via Admin SDK is not supported.');
  console.log('');
  console.log('To deploy the function, please run:');
  console.log('  1. firebase login (if not already logged in)');
  console.log('  2. cd functions && npm run deploy');
  console.log('');
  console.log('Or deploy just this function:');
  console.log('  firebase deploy --only functions:processManualPayout');
  console.log('');
  console.log('The function code is ready in: functions/lib/index.js');
}

deployFunction().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
