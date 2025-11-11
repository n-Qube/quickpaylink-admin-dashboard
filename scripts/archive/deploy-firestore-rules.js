import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import https from 'https';

const serviceAccount = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'quicklink-pay-admin'
});

async function deployRules() {
  try {
    console.log('📤 Deploying Firestore rules to quicklink-pay-admin...\n');
    
    // Read the rules file
    const rulesContent = readFileSync('./firestore.rules', 'utf8');
    
    // Get access token
    const accessToken = await admin.credential.applicationDefault().getAccessToken();
    
    const projectId = 'quicklink-pay-admin';
    const url = `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`;
    
    const payload = JSON.stringify({
      source: {
        files: [
          {
            name: 'firestore.rules',
            content: rulesContent
          }
        ]
      }
    });
    
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.access_token}`,
        'Content-Type': 'application/json',
        'Content-Length': payload.length
      }
    };
    
    const req = https.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          const response = JSON.parse(data);
          console.log('✅ Rules deployed successfully!');
          console.log('   Ruleset Name:', response.name);
          
          // Now release the ruleset
          const rulesetId = response.name.split('/').pop();
          releaseRuleset(projectId, rulesetId, accessToken.access_token);
        } else {
          console.error('❌ Failed to deploy rules');
          console.error('Status:', res.statusCode);
          console.error('Response:', data);
          process.exit(1);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Error deploying rules:', error);
      process.exit(1);
    });
    
    req.write(payload);
    req.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

function releaseRuleset(projectId, rulesetId, accessToken) {
  const url = `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases/cloud.firestore`;
  
  const payload = JSON.stringify({
    name: `projects/${projectId}/releases/cloud.firestore`,
    rulesetName: `projects/${projectId}/rulesets/${rulesetId}`
  });
  
  const options = {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Content-Length': payload.length
    }
  };
  
  const req = https.request(url, options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('✅ Rules activated successfully!');
        console.log('\n🎉 Firestore rules are now live!');
        process.exit(0);
      } else {
        console.error('❌ Failed to activate rules');
        console.error('Status:', res.statusCode);
        console.error('Response:', data);
        process.exit(1);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Error activating rules:', error);
    process.exit(1);
  });
  
  req.write(payload);
  req.end();
}

deployRules();
