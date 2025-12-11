import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    // Check if all required Firebase credentials are present
    if (!projectId || !privateKey || !clientEmail) {
      throw new Error(
        'Missing Firebase credentials. Please set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL in your .env file'
      );
    }

    // Format the private key properly (handle escaped newlines)
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

    // Validate that the private key is not empty after formatting
    if (!formattedPrivateKey || formattedPrivateKey.trim().length === 0) {
      throw new Error('FIREBASE_PRIVATE_KEY is empty or invalid');
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        privateKey: formattedPrivateKey,
        clientEmail,
      }),
    });
    console.log('✅ Firebase Admin initialized');
  } catch (error) {
    console.warn('⚠️ Firebase Admin initialization failed:', error instanceof Error ? error.message : error);
    console.warn('⚠️ Real-time features will be disabled');
  }
}

export default admin;

