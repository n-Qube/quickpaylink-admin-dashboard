import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'));
const rulesContent = readFileSync('./firestore.rules', 'utf8');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'quicklink-pay-admin'
});

async function deployRules() {
  try {
    console.log('🚀 Deploying Firestore Security Rules...');
    console.log('Project ID:', serviceAccount.project_id);
    
    const projectId = serviceAccount.project_id;
    
    // Get access token
    const { GoogleAuth } = await import('google-auth-library');
    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/firebase', 'https://www.googleapis.com/auth/cloud-platform']
    });
    
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    
    if (!accessToken.token) {
      throw new Error('Failed to get access token');
    }
    
    console.log('✅ Got access token');
    
    // Create ruleset
    const createRulesetUrl = `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`;
    
    const rulesetPayload = {
      source: {
        files: [
          {
            name: 'firestore.rules',
            content: rulesContent
          }
        ]
      }
    };
    
    console.log('📤 Creating ruleset...');
    
    const createResponse = await fetch(createRulesetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(rulesetPayload)
    });
    
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Failed to create ruleset: ${createResponse.status} - ${errorText}`);
    }
    
    const ruleset = await createResponse.json();
    const rulesetName = ruleset.name;
    
    console.log('✅ Ruleset created:', rulesetName);
    
    // Release the ruleset (update existing release)
    const releaseUrl = `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases/cloud.firestore`;
    
    const releasePayload = {
      release: {
        name: `projects/${projectId}/releases/cloud.firestore`,
        rulesetName: rulesetName
      }
    };
    
    console.log('🚀 Releasing ruleset...');
    
    const releaseResponse = await fetch(releaseUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(releasePayload)
    });
    
    if (!releaseResponse.ok) {
      const errorText = await releaseResponse.text();
      throw new Error(`Failed to release ruleset: ${releaseResponse.status} - ${errorText}`);
    }
    
    const release = await releaseResponse.json();
    
    console.log('✅ Rules deployed successfully!');
    console.log('Release:', release.name);
    console.log('\n🎉 Firestore Security Rules are now active!');
    console.log('\nRules include access for:');
    console.log('  • emailTemplates (super admin only)');
    console.log('  • whatsappTemplates (super admin only)');
    console.log('\nNext steps:');
    console.log('1. Refresh your Templates page: http://localhost:5173/templates');
    console.log('2. The permission error should be gone');
    console.log('3. You should see "No templates yet" instead');
    console.log('4. Try creating your first template!');
    
  } catch (error) {
    console.error('❌ Error deploying rules:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

deployRules();
