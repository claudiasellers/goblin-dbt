import * as admin from 'firebase-admin';

// Initialize Firebase Admin (for updating Auth profiles)
if (!admin.apps.length) {
  admin.initializeApp();
}

export { admin };
