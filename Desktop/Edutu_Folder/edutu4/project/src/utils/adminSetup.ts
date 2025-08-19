import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { AdminUser } from '../types/common';

// This utility helps set up initial admin users
// In production, this should be run from a secure environment

export const createAdminUser = async (
  uid: string,
  email: string,
  name: string,
  role: 'admin' | 'moderator' = 'admin'
): Promise<boolean> => {
  try {
    // Check if admin already exists
    const adminRef = doc(db, 'admins', uid);
    const adminSnap = await getDoc(adminRef);
    
    if (adminSnap.exists()) {
      console.log('Admin user already exists:', uid);
      return true;
    }

    // Create admin user document
    const adminData: Omit<AdminUser, 'uid'> = {
      email,
      name,
      role,
      permissions: role === 'admin' 
        ? ['moderation', 'user_management', 'analytics', 'system_settings']
        : ['moderation'],
      createdAt: new Date(),
      isActive: true
    };

    await setDoc(adminRef, {
      ...adminData,
      createdAt: serverTimestamp()
    });

    console.log('Admin user created successfully:', uid);
    return true;
  } catch (error) {
    console.error('Error creating admin user:', error);
    return false;
  }
};

// Helper function to promote an existing user to admin
export const promoteUserToAdmin = async (
  uid: string,
  role: 'admin' | 'moderator' = 'moderator'
): Promise<boolean> => {
  try {
    // Get user data from users collection
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      console.error('User not found:', uid);
      return false;
    }

    const userData = userSnap.data();
    
    // Create admin record
    return await createAdminUser(uid, userData.email, userData.name, role);
  } catch (error) {
    console.error('Error promoting user to admin:', error);
    return false;
  }
};

// Instructions for setting up admin users:
// 1. First, create a regular user account through the app
// 2. Use the browser console to run this code:
// 
// import { promoteUserToAdmin } from './utils/adminSetup';
// promoteUserToAdmin('USER_UID_HERE', 'admin');
//
// Or if you know the user details:
// 
// import { createAdminUser } from './utils/adminSetup';
// createAdminUser('USER_UID_HERE', 'admin@example.com', 'Admin Name', 'admin');

console.log(`
🔧 Admin Setup Instructions:

1. Create a regular user account through the app first
2. Get the user's UID from Firebase Console or browser dev tools
3. In browser console, run:

   import { promoteUserToAdmin } from './utils/adminSetup';
   await promoteUserToAdmin('YOUR_USER_UID_HERE', 'admin');

4. Refresh the app and check Settings for Admin Dashboard access

Note: In production, admin setup should be done through Firebase Admin SDK or secure backend.
`);