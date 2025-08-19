import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup,
  User,
  updateProfile
} from "firebase/auth";
import { 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { 
  sanitizeInput, 
  isValidEmail, 
  isValidAge, 
  isValidUID, 
  authRateLimiter, 
  logSecurityEvent 
} from "../utils/security";
import type { FirebaseTimestamp } from "../types/common";

export interface UserData {
  name: string;
  email: string;
  age: number;
  createdAt: FirebaseTimestamp;
  uid: string;
  onboardingCompleted?: boolean;
  onboardingCompletedAt?: FirebaseTimestamp;
}

export interface AuthError {
  code: string;
  message: string;
}

// Google OAuth provider
const googleProvider = new GoogleAuthProvider();

export const authService = {
  // Sign up with email and password
  async signUp(email: string, password: string, name: string, age: number): Promise<User> {
    // Security validations
    if (!isValidEmail(email)) {
      logSecurityEvent('invalid_email_signup', { email: email.substring(0, 5) + '***' });
      throw new Error('Invalid email format');
    }
    
    if (!isValidAge(age)) {
      logSecurityEvent('invalid_age_signup', { age });
      throw new Error('Age must be between 16 and 30');
    }

    // Rate limiting
    if (!authRateLimiter.isAllowed(email)) {
      const remainingTime = authRateLimiter.getRemainingTime(email);
      logSecurityEvent('rate_limit_exceeded', { email: email.substring(0, 5) + '***', remainingTime });
      throw new Error(`Too many attempts. Try again in ${Math.ceil(remainingTime / 60000)} minutes.`);
    }

    // Sanitize inputs
    const sanitizedName = sanitizeInput(name);
    const sanitizedEmail = email.toLowerCase().trim();

    const userCredential = await createUserWithEmailAndPassword(auth, sanitizedEmail, password);
    const user = userCredential.user;

    // Update the user's display name
    await updateProfile(user, { displayName: sanitizedName });

    // Create user document in Firestore
    await this.createUserDocument(user, { name: sanitizedName, age });

    logSecurityEvent('user_signup_success', { uid: user.uid, email: sanitizedEmail });

    return user;
  },

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<User> {
    // Security validations
    if (!isValidEmail(email)) {
      logSecurityEvent('invalid_email_signin', { email: email.substring(0, 5) + '***' });
      throw new Error('Invalid email format');
    }

    // Rate limiting
    if (!authRateLimiter.isAllowed(email)) {
      const remainingTime = authRateLimiter.getRemainingTime(email);
      logSecurityEvent('rate_limit_exceeded_signin', { email: email.substring(0, 5) + '***', remainingTime });
      throw new Error(`Too many attempts. Try again in ${Math.ceil(remainingTime / 60000)} minutes.`);
    }

    const sanitizedEmail = email.toLowerCase().trim();
    const userCredential = await signInWithEmailAndPassword(auth, sanitizedEmail, password);
    
    logSecurityEvent('user_signin_success', { uid: userCredential.user.uid, email: sanitizedEmail });
    
    return userCredential.user;
  },

  // Sign in with Google
  async signInWithGoogle(): Promise<User> {
    const userCredential = await signInWithPopup(auth, googleProvider);
    const user = userCredential.user;
    const isNewUser = userCredential.additionalUserInfo?.isNewUser;

    // Check if this is a new user and create document if needed
    const userDoc = await this.getUserDocument(user.uid);
    if (!userDoc && isNewUser) {
      // For Google sign-in, we'll need to collect age separately
      // For now, we'll set a default age that can be updated later
      await this.createUserDocument(user, { 
        name: user.displayName || 'User', 
        age: 18 // Default age, should be updated by user
      });
      
      logSecurityEvent('new_user_google_signup', { uid: user.uid, email: user.email });
    } else if (userDoc) {
      logSecurityEvent('existing_user_google_signin', { uid: user.uid, email: user.email });
    }

    return user;
  },

  // Sign out
  async signOut(): Promise<void> {
    await signOut(auth);
  },

  // Create user document in Firestore
  async createUserDocument(user: User, additionalData: { name: string; age: number }): Promise<void> {
    if (!user || !isValidUID(user.uid)) {
      logSecurityEvent('invalid_user_document_creation', { uid: user?.uid });
      throw new Error('Invalid user data');
    }

    if (!user.email || !isValidEmail(user.email)) {
      logSecurityEvent('invalid_email_document_creation', { uid: user.uid });
      throw new Error('Invalid email in user data');
    }

    if (!isValidAge(additionalData.age)) {
      logSecurityEvent('invalid_age_document_creation', { uid: user.uid, age: additionalData.age });
      throw new Error('Invalid age in user data');
    }

    const userRef = doc(db, 'users', user.uid);
    const userData: UserData = {
      uid: user.uid,
      name: sanitizeInput(additionalData.name),
      email: user.email,
      age: additionalData.age,
      createdAt: serverTimestamp(),
      onboardingCompleted: false
    };

    await setDoc(userRef, userData);
  },

  // Get user document from Firestore
  async getUserDocument(uid: string): Promise<UserData | null> {
    if (!uid || !isValidUID(uid)) {
      logSecurityEvent('invalid_uid_get_document', { uid });
      return null;
    }
    
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data() as UserData;
    }
    
    return null;
  },

  // Convert Firebase auth errors to user-friendly messages
  getErrorMessage(error: AuthError): string {
    switch (error.code) {
      case 'auth/user-not-found':
        return 'USER_NOT_FOUND';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/email-already-in-use':
        return 'EMAIL_ALREADY_EXISTS';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters long.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in was cancelled.';
      case 'auth/invalid-credential':
        return 'USER_NOT_FOUND';
      default:
        return 'An error occurred. Please try again.';
    }
  }
};