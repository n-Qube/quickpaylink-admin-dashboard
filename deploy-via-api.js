/**
 * Deploy Cloud Function using Google Cloud Functions API
 * This bypasses the Firebase CLI and npm build issues
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const serviceAccount = require('./firebase-service-account.json');

async function deployFunction() {
  try {
    console.log('🔑 Authenticating with Google Cloud...');

    // Create JWT client
    const jwtClient = new google.auth.JWT(
      serviceAccount.client_email,
      null,
      serviceAccount.private_key,
      ['https://www.googleapis.com/auth/cloud-platform']
    );

    await jwtClient.authorize();
    console.log('✅ Authentication successful!');

    // Create Cloud Functions API client
    const cloudfunctions = google.cloudfunctions({
      version: 'v1',
      auth: jwtClient
    });

    const projectId = 'quicklink-pay-admin';
    const functionName = 'processManualPayout';
    const region = 'us-central1'; // Adjust if your functions are in a different region

    console.log(`\n📦 Preparing to deploy function: ${functionName}`);
    console.log(`   Project: ${projectId}`);
    console.log(`   Region: ${region}`);

    // Create a zip file of the functions directory
    console.log('\n📚 Creating deployment package...');
    const zipPath = path.join(__dirname, 'functions-deploy.zip');
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', async () => {
      console.log(`✅ Package created (${archive.pointer()} bytes)`);

      try {
        // Upload to Cloud Storage
        console.log('\n☁️  Uploading to Google Cloud Storage...');

        const { Storage } = require('@google-cloud/storage');
        const storage = new Storage({
          projectId: projectId,
          credentials: serviceAccount
        });

        const bucketName = `${projectId}-gcf-sources`;
        const bucket = storage.bucket(bucketName);

        // Upload the zip file
        const blob = bucket.file(`${functionName}-${Date.now()}.zip`);
        await blob.save(fs.readFileSync(zipPath));

        console.log('✅ Upload complete!');

        // Get the upload URL
        const uploadUrl = `gs://${bucketName}/${blob.name}`;
        console.log(`   Source URL: ${uploadUrl}`);

        // Deploy the function
        console.log('\n🚀 Deploying function...');

        const functionPath = `projects/${projectId}/locations/${region}/functions/${functionName}`;

        const functionConfig = {
          name: functionPath,
          entryPoint: functionName,
          runtime: 'nodejs20',
          sourceArchiveUrl: uploadUrl,
          httpsTrigger: {},
          environmentVariables: {
            FIREBASE_CONFIG: JSON.stringify({
              projectId: projectId,
              databaseURL: `https://${projectId}.firebaseio.com`,
              storageBucket: `${projectId}.appspot.com`
            })
          }
        };

        try {
          // Try to update existing function
          const updateResponse = await cloudfunctions.projects.locations.functions.patch({
            name: functionPath,
            updateMask: 'sourceArchiveUrl,runtime,entryPoint',
            requestBody: functionConfig
          });

          console.log('✅ Function updated successfully!');
          console.log(`   Operation: ${updateResponse.data.name}`);

        } catch (updateError) {
          if (updateError.code === 404) {
            // Function doesn't exist, create it
            console.log('   Function does not exist, creating new...');

            const createResponse = await cloudfunctions.projects.locations.functions.create({
              location: `projects/${projectId}/locations/${region}`,
              requestBody: functionConfig
            });

            console.log('✅ Function created successfully!');
            console.log(`   Operation: ${createResponse.data.name}`);
          } else {
            throw updateError;
          }
        }

        // Clean up
        fs.unlinkSync(zipPath);
        console.log('\n🎉 Deployment complete!');

      } catch (error) {
        console.error('\n❌ Deployment failed:', error.message);
        if (error.errors) {
          console.error('   Errors:', JSON.stringify(error.errors, null, 2));
        }
        // Clean up
        if (fs.existsSync(zipPath)) {
          fs.unlinkSync(zipPath);
        }
        process.exit(1);
      }
    });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(output);

    // Add the functions directory contents
    const functionsDir = path.join(__dirname, 'functions');

    // Add package.json and package-lock.json
    archive.file(path.join(functionsDir, 'package.json'), { name: 'package.json' });
    if (fs.existsSync(path.join(functionsDir, 'package-lock.json'))) {
      archive.file(path.join(functionsDir, 'package-lock.json'), { name: 'package-lock.json' });
    }

    // Add the lib directory (compiled JavaScript)
    archive.directory(path.join(functionsDir, 'lib'), 'lib');

    // Add node_modules (this makes the package large but ensures all dependencies are included)
    // archive.directory(path.join(functionsDir, 'node_modules'), 'node_modules');

    await archive.finalize();

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

deployFunction();
