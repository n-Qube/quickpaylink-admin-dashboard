import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import https from 'https';

const serviceAccount = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'));

const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function deployRules() {
  try {
    console.log('📤 Deploying Firestore rules to quicklink-pay-admin...\n');
    
    // Read the rules file
    const rulesContent = readFileSync('./firestore.rules', 'utf8');
    
    // Get access token from service account
    const accessTokenObj = await app.options.credential.getAccessToken();
    const accessToken = accessTokenObj.access_token;
    
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
        if (res.statusCode === 200 || res.statusCode === 201) {
          const response = JSON.parse(data);
          console.log('✅ Ruleset created successfully!');
          console.log('   Ruleset Name:', response.name);
          
          // Now release the ruleset
          const rulesetId = response.name.split('/').pop();
          releaseRuleset(projectId, rulesetId, accessToken);
        } else {
          console.error('❌ Failed to create ruleset');
          console.error('Status:', res.statusCode);
          console.error('Response:', data);
          process.exit(1);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Error creating ruleset:', error);
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
        console.log('   Super admins can now write to /countries collection');
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
