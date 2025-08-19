import React, { useState, useEffect } from 'react';
import { Mail, Loader2, CheckCircle } from 'lucide-react';
import Button from './ui/Button';
import { useDarkMode } from '../hooks/useDarkMode';
import { getAuth, sendSignInLinkToEmail, signInWithEmailLink, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../config/firebase';
import { authService } from '../services/authService';

interface AuthScreenProps {
  onAuthComplete: (userData: { name: string; age: number; uid: string; onboardingCompleted: boolean }) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthComplete }) => {
  // Simple state for passwordless login
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [error, setError] = useState('');
  
  const { isDarkMode } = useDarkMode();

  // Check if user is already authenticated
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        // User is signed in, get their data from Firestore
        try {
          const userData = await authService.getUserDocument(user.uid);
          if (userData) {
            onAuthComplete({
              name: userData.name,
              age: userData.age,
              uid: userData.uid,
              onboardingCompleted: userData.onboardingCompleted || false
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    });

    return () => unsubscribe();
  }, [onAuthComplete]);

  // Check if user clicked the email link (on page load)
  useEffect(() => {
    const handleEmailLink = async () => {
      try {
        // Check if current URL is a sign-in link
        if (auth.isSignInWithEmailLink && auth.isSignInWithEmailLink(window.location.href)) {
          // Get email from localStorage (saved when sending the link)
          let email = window.localStorage.getItem('emailForSignIn');
          if (!email) {
            // If no email in storage, prompt user for it
            email = window.prompt('Please provide your email for confirmation');
          }

          if (email) {
            try {
              setIsLoading(true);
              // Complete the sign-in process
              await signInWithEmailLink(auth, email, window.location.href);
              
              // Clear email from storage
              window.localStorage.removeItem('emailForSignIn');
              
              // User will be handled by onAuthStateChanged
            } catch (error) {
              console.error('Error signing in with email link:', error);
              setError('Failed to sign in with email link. Please try again.');
            } finally {
              setIsLoading(false);
            }
          }
        }
      } catch (error) {
        console.error('Error checking email link:', error);
      }
    };

    handleEmailLink();
  }, []);

  // Handle sending the magic link
  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Configure the sign-in link
      const actionCodeSettings = {
        // URL you want to redirect back to. The domain (www.example.com) for this
        // URL must be in the authorized domains list in the Firebase Console.
        url: window.location.href,
        // This must be true.
        handleCodeInApp: true,
      };

      // Send the sign-in link to the email
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      
      // Save the email locally so we can re-use it on the callback
      window.localStorage.setItem('emailForSignIn', email);
      
      setLinkSent(true);
    } catch (error: any) {
      console.error('Error sending sign-in link:', error);
      
      // Handle common Firebase errors
      if (error.code === 'auth/invalid-email') {
        setError('Please enter a valid email address');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many requests. Please wait before trying again.');
      } else {
        setError('Failed to send login link. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className={`min-h-screen p-4 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 ${isDarkMode ? 'dark' : ''}`}>
      {/* Centered Login Card */}
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <span className="text-2xl text-white font-bold">E</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome to Edutu
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Sign in with your email to continue your journey
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
          {/* Success State - Link Sent */}
          {linkSent ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Check your email!
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                We've sent a magic login link to <strong>{email}</strong>
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                Click the link in your email to sign in automatically. The link will expire in 1 hour.
              </p>
              
              {/* Send Another Link */}
              <button
                onClick={() => {
                  setLinkSent(false);
                  setEmail('');
                }}
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
              >
                Use a different email address
              </button>
            </div>
          ) : (
            /* Email Form */
            <form onSubmit={handleSendMagicLink} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                    disabled={isLoading}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                             placeholder-gray-500 dark:placeholder-gray-400
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                             transition-all duration-200
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading || !email}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 
                         hover:from-blue-600 hover:to-indigo-700 
                         text-white font-medium rounded-xl
                         transition-all duration-200 transform hover:scale-[1.02] 
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                         shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Sending Magic Link...
                  </div>
                ) : (
                  'Send Login Link'
                )}
              </Button>

              {/* Info Text */}
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                We'll send you a secure login link. No passwords required! 🎉
              </p>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Secure • Passwordless • Simple
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;