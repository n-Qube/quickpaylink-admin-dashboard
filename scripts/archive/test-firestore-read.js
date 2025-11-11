import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD8G7axMoq4H2mkf9PZifVTQkrGhUaczXo",
  authDomain: "quicklink-pay-admin.firebaseapp.com",
  projectId: "quicklink-pay-admin",
  storageBucket: "quicklink-pay-admin.firebasestorage.app",
  messagingSenderId: "107865266386",
  appId: "1:107865266386:web:dfe5553c8512c6855cb50b",
  measurementId: "G-8BXFSS4R69"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function test() {
  try {
    // First try to read without auth
    console.log('Testing read without auth...');
    const adminRef = doc(db, 'admins', 'zCAdf8MV0kXxmty84zUH4rN7kQS2');
    try {
      const snap = await getDoc(adminRef);
      console.log('Without auth - Success:', snap.exists());
    } catch (err) {
      console.log('Without auth - Expected error:', err.code);
    }

    // Now sign in and try again
    console.log('\nSigning in...');
    const email = 'niinortey@n-qube.com';
    const password = process.argv[2];
    
    if (!password) {
      console.log('Please provide password as argument');
      process.exit(1);
    }

    const userCred = await signInWithEmailAndPassword(auth, email, password);
    console.log('Signed in as:', userCred.user.uid);

    // Try to read admin doc
    console.log('\nTesting read with auth...');
    const snap = await getDoc(adminRef);
    console.log('With auth - Success:', snap.exists());
    if (snap.exists()) {
      console.log('Admin data:', snap.data());
    }
  } catch (err) {
    console.error('Error:', err.code, err.message);
  }
  process.exit(0);
}

test();
