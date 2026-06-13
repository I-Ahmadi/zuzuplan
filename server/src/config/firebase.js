import { createRequire } from 'module';

const require = createRequire(import.meta.url);
let admin = null;

try {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (projectId && privateKey && clientEmail) {
    const firebaseAdmin = require('firebase-admin');
    admin = firebaseAdmin.initializeApp({
      credential: firebaseAdmin.credential.cert({
        projectId,
        privateKey,
        clientEmail,
      }),
    });
    console.log('Firebase Admin initialized');
  }
} catch (err) {
  if (process.env.FIREBASE_PROJECT_ID) {
    console.warn('Firebase initialization skipped:', err.message);
  }
}

export const firebaseAdmin = admin;
