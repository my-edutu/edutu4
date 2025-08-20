import React, { useState, useEffect } from 'react';
import { Mail, Loader2, CheckCircle, KeyRound, ChevronLeft } from 'lucide-react';
import Button from './ui/Button';
import { useDarkMode } from '../hooks/useDarkMode';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../config/firebase';
import { authService } from '../services/authService';

interface AuthScreenProps {
  onAuthComplete: (userData: { name: string; age: number; uid: string; onboardingCompleted: boolean }) => void;
}

type AuthStep = 'email' | 'otp' | 'profile';

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthComplete }) => {
  // State for OTP flow
  const [currentStep, setCurrentStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sentOtp, setSentOtp] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [userUid, setUserUid] = useState('');
  
  // Profile setup state
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  
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

  // Generate a random 6-digit OTP
  const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Handle sending OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Admin testing bypass for localhost
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const isAdminEmail = email.includes('admin@') || email.includes('test@');
      
      if (isLocalhost && isAdminEmail) {
        console.log('🔧 Admin testing mode: Using OTP 123456');
        
        // Set a fixed OTP for admin testing
        setSentOtp('123456');
        
        // Simulate sending OTP
        setTimeout(() => {
          setCurrentStep('otp');
          setIsLoading(false);
          console.log('🔧 Admin testing: Use OTP 123456 to complete sign in');
        }, 1000);
        
        return;
      }

      // In production, you would integrate with an email service like:
      // - SendGrid, Mailgun, AWS SES, etc.
      // - Or use Firebase Functions to send emails
      
      // For now, generate a random OTP and log it (simulate sending email)
      const generatedOtp = generateOtp();
      setSentOtp(generatedOtp);
      
      // Simulate email sending delay
      setTimeout(() => {
        setCurrentStep('otp');
        setIsLoading(false);
        console.log(`🔧 Development mode: OTP sent to ${email}: ${generatedOtp}`);
      }, 1500);
      
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      setError('Failed to send OTP. Please try again.');
      setIsLoading(false);
    }
  };

  // Handle OTP verification
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Verify OTP
      if (otp !== sentOtp) {
        setError('Invalid OTP. Please check your email and try again.');
        setIsLoading(false);
        return;
      }

      // OTP is correct, now handle user authentication and profile creation
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const isAdminEmail = email.includes('admin@') || email.includes('test@');

      if (isLocalhost && isAdminEmail) {
        // For admin testing, create a mock user but also create/check Firestore profile
        const mockUid = `mock-${email.replace('@', '-').replace('.', '-')}-${Date.now()}`;
        
        // Try to simulate a real Firebase user for Firestore operations
        const mockUser = {
          uid: mockUid,
          email: email,
          displayName: email.includes('admin@') ? 'Admin User' : email.split('@')[0]
        } as any;

        try {
          // Check if user already exists in Firestore
          let userData = await authService.getUserDocument(mockUid);
          
          if (!userData) {
            // New user - check if we're in admin mode or need profile setup
            console.log('🔧 New user detected');
            setIsNewUser(true);
            setUserUid(mockUid);
            
            if (isAdminEmail) {
              // For admin/test emails, create profile immediately
              console.log('🔧 Creating admin user profile in Firestore...');
              await authService.createUserDocument(mockUser, {
                name: email.includes('admin@') ? 'Admin User' : email.split('@')[0],
                age: 25
              });
              
              // Fetch the created user data
              userData = await authService.getUserDocument(mockUid);
            } else {
              // For regular users, go to profile setup step
              setCurrentStep('profile');
              setIsLoading(false);
              return;
            }
          } else {
            console.log('🔧 Existing user found in Firestore');
          }

          if (userData) {
            setTimeout(() => {
              setIsLoading(false);
              onAuthComplete({
                name: userData.name,
                age: userData.age,
                uid: userData.uid,
                onboardingCompleted: userData.onboardingCompleted || false
              });
            }, 1000);
          } else {
            throw new Error('Failed to create or retrieve user profile');
          }
        } catch (firestoreError) {
          console.error('Firestore error:', firestoreError);
          // Fallback to mock data if Firestore fails in development
          const mockUserData = {
            name: email.includes('admin@') ? 'Admin User' : email.split('@')[0],
            age: 25,
            uid: mockUid,
            onboardingCompleted: false
          };
          
          setTimeout(() => {
            setIsLoading(false);
            onAuthComplete(mockUserData);
          }, 1000);
        }
      } else {
        // Production flow - would integrate with real Firebase Auth + OTP service
        // For now, simulate the process but with real Firestore operations
        const simulatedUid = `user-${email.replace('@', '-').replace('.', '-')}-${Date.now()}`;
        
        const simulatedUser = {
          uid: simulatedUid,
          email: email,
          displayName: email.split('@')[0]
        } as any;

        try {
          // Check if user exists
          let userData = await authService.getUserDocument(simulatedUid);
          
          if (!userData) {
            // New user - go to profile setup
            setIsNewUser(true);
            setUserUid(simulatedUid);
            setCurrentStep('profile');
            setIsLoading(false);
            return;
          }

          if (userData) {
            setTimeout(() => {
              setIsLoading(false);
              onAuthComplete({
                name: userData.name,
                age: userData.age,
                uid: userData.uid,
                onboardingCompleted: userData.onboardingCompleted || false
              });
            }, 1000);
          } else {
            throw new Error('Failed to create user profile');
          }
        } catch (firestoreError) {
          console.error('Error with user profile:', firestoreError);
          setError('Failed to create user profile. Please try again.');
          setIsLoading(false);
        }
      }
      
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      setError('Failed to verify OTP. Please try again.');
      setIsLoading(false);
    }
  };

  // Handle profile creation for new users
  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    
    const ageNum = parseInt(age);
    if (!age || ageNum < 16 || ageNum > 30) {
      setError('Please enter a valid age between 16 and 30');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Create the user profile in Firestore
      const mockUser = {
        uid: userUid,
        email: email,
        displayName: name.trim()
      } as any;

      await authService.createUserDocument(mockUser, {
        name: name.trim(),
        age: ageNum
      });

      // Fetch the created user data
      const userData = await authService.getUserDocument(userUid);

      if (userData) {
        setTimeout(() => {
          setIsLoading(false);
          onAuthComplete({
            name: userData.name,
            age: userData.age,
            uid: userData.uid,
            onboardingCompleted: userData.onboardingCompleted || false
          });
        }, 1000);
      } else {
        throw new Error('Failed to retrieve user profile after creation');
      }
      
    } catch (error: any) {
      console.error('Error creating profile:', error);
      setError('Failed to create profile. Please try again.');
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
            {currentStep === 'email' 
              ? 'Enter your email to get started' 
              : currentStep === 'otp' 
              ? 'Enter the OTP sent to your email'
              : 'Complete your profile to continue'}
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-6">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Step 1: Email Input */}
          {currentStep === 'email' && (
            <form onSubmit={handleSendOtp} className="space-y-6">
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
                variant="primary"
                fullWidth
                loading={isLoading}
                disabled={isLoading || !email}
                icon={isLoading ? undefined : Mail}
              >
                {isLoading ? 'Sending OTP...' : 'Send OTP'}
              </Button>

              {/* Info Text */}
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                We'll send you a 6-digit verification code 📧
              </p>
            </form>
          )}

          {/* Step 2: OTP Input */}
          {currentStep === 'otp' && (
            <div className="space-y-6">
              {/* OTP Sent Confirmation */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  OTP Sent!
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  We've sent a 6-digit code to <strong>{email}</strong>
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Please check your email and enter the code below
                </p>
              </div>

              {/* OTP Form */}
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                {/* OTP Input */}
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Verification Code
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      id="otp"
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      required
                      disabled={isLoading}
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl 
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                               placeholder-gray-500 dark:placeholder-gray-400
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                               transition-all duration-200 text-center text-lg font-mono
                               disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Verify Button */}
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  loading={isLoading}
                  disabled={isLoading || otp.length !== 6}
                  icon={isLoading ? undefined : KeyRound}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 
                           hover:from-green-600 hover:to-emerald-700"
                >
                  {isLoading ? 'Verifying...' : 'Verify & Sign In'}
                </Button>
              </form>

              {/* Back to Email / Resend */}
              <div className="flex justify-between items-center text-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCurrentStep('email');
                    setOtp('');
                    setError('');
                  }}
                  icon={ChevronLeft}
                >
                  Change Email
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSendOtp({ preventDefault: () => {} } as any)}
                  disabled={isLoading}
                >
                  Resend OTP
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Profile Setup for New Users */}
          {currentStep === 'profile' && (
            <div className="space-y-6">
              {/* Welcome New User */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Welcome to Edutu!
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Let's set up your profile to get started
                </p>
              </div>

              {/* Profile Form */}
              <form onSubmit={handleCreateProfile} className="space-y-6">
                {/* Name Input */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                    disabled={isLoading}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                             placeholder-gray-500 dark:placeholder-gray-400
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                             transition-all duration-200
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Age Input */}
                <div>
                  <label htmlFor="age" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Age
                  </label>
                  <input
                    id="age"
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="Enter your age (16-30)"
                    min="16"
                    max="30"
                    required
                    disabled={isLoading}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                             placeholder-gray-500 dark:placeholder-gray-400
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                             transition-all duration-200
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Create Profile Button */}
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  loading={isLoading}
                  disabled={isLoading || !name.trim() || !age}
                  icon={isLoading ? undefined : CheckCircle}
                >
                  {isLoading ? 'Creating Profile...' : 'Complete Registration'}
                </Button>

                {/* Info Text */}
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  This information helps us personalize your experience 🎯
                </p>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {currentStep === 'email' 
              ? 'Secure • OTP-based • Simple' 
              : currentStep === 'otp' 
              ? 'Check your email for the verification code'
              : 'One more step to get started!'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;