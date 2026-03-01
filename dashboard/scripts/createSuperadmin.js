#!/usr/bin/env node

/**
 * Script to create a superadmin user
 * Usage: node scripts/createSuperadmin.js <email> <displayName>
 * 
 * This script should be run server-side with Firebase Admin SDK
 * It creates a user in Firebase Auth and adds them to the superadmins collection
 */

const admin = require('firebase-admin');
const readline = require('readline');

// Initialize Firebase Admin
// You need to download your service account key from Firebase Console
// and set the path in the GOOGLE_APPLICATION_CREDENTIALS environment variable
admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function createSuperadmin() {
  try {
    console.log('=== Clients+ Superadmin Creation Tool ===\n');

    // Get email
    const email = await question('Enter superadmin email: ');
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email address');
    }

    // Get display name
    const displayName = await question('Enter display name: ');
    if (!displayName) {
      throw new Error('Display name is required');
    }

    // Get password
    const password = await question('Enter password (min 6 characters): ');
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    console.log('\nCreating superadmin user...');

    // Check if user already exists
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log('User already exists in Firebase Auth');
    } catch (error) {
      // User doesn't exist, create new one
      userRecord = await auth.createUser({
        email,
        password,
        displayName,
        emailVerified: true,
      });
      console.log('Created new user in Firebase Auth');
    }

    // Add or update superadmin document
    const superadminData = {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: displayName,
      role: 'superadmin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLogin: null,
    };

    await db.collection('superadmins').doc(userRecord.uid).set(superadminData, { merge: true });
    console.log('Added user to superadmins collection');

    // Set custom claims
    await auth.setCustomUserClaims(userRecord.uid, {
      role: 'superadmin',
      isSuperadmin: true,
    });
    console.log('Set superadmin custom claims');

    console.log('\n✅ Superadmin created successfully!');
    console.log(`Email: ${email}`);
    console.log(`UID: ${userRecord.uid}`);
    console.log('\nThe superadmin can now login at the secure URL specified in your .env file');

  } catch (error) {
    console.error('\n❌ Error creating superadmin:', error.message);
  } finally {
    rl.close();
  }
}

// Run the script
createSuperadmin();