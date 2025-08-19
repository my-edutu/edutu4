import React, { useState } from 'react';
import TurnstileWidget from '../components/ui/TurnstileWidget';
import { useTurnstile } from '../services/turnstileService';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

/**
 * Example component demonstrating Turnstile Demo Mode integration
 * This shows how to integrate the Turnstile widget with demo mode support
 */
const TurnstileDemoExample: React.FC = () => {
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [formData, setFormData] = useState({
    email: 'demo@example.com',
    name: 'Demo User',
    age: 25
  });

  const { 
    isEnabled, 
    isDemoMode, 
    siteKey, 
    verifyToken, 
    preValidateSignup 
  } = useTurnstile();

  // Handle successful CAPTCHA completion
  const handleTurnstileVerify = (token: string) => {
    console.log('✅ Turnstile verification completed:', token.substring(0, 20) + '...');
    setVerificationToken(token);
    setVerificationResult(null);
  };

  // Handle CAPTCHA errors
  const handleTurnstileError = (error: string) => {
    console.error('❌ Turnstile error:', error);
    setVerificationToken(null);
    setVerificationResult({ success: false, message: error });
  };

  // Test token verification
  const testTokenVerification = async () => {
    if (!verificationToken) return;

    setIsVerifying(true);
    try {
      const result = await verifyToken(verificationToken, formData.email);
      setVerificationResult(result);
      console.log('🔍 Token verification result:', result);
    } catch (error) {
      console.error('❌ Verification error:', error);
      setVerificationResult({ 
        success: false, 
        message: 'Verification failed: ' + (error as Error).message 
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Test signup pre-validation
  const testSignupValidation = async () => {
    if (!verificationToken) return;

    setIsVerifying(true);
    try {
      const result = await preValidateSignup({
        turnstileToken: verificationToken,
        email: formData.email,
        name: formData.name,
        age: formData.age
      });
      setVerificationResult(result);
      console.log('🔍 Signup validation result:', result);
    } catch (error) {
      console.error('❌ Signup validation error:', error);
      setVerificationResult({ 
        success: false, 
        message: 'Validation failed: ' + (error as Error).message 
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          🔒 Turnstile Demo Integration
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Testing Cloudflare Turnstile integration with demo mode support
        </p>
      </div>

      {/* Status Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Info size={16} />
            <span className="text-sm font-medium">Status</span>
          </div>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            {isDemoMode ? 'Demo Mode Active' : isEnabled ? 'Production Mode' : 'Disabled'}
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle size={16} />
            <span className="text-sm font-medium">Site Key</span>
          </div>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-mono">
            {siteKey.substring(0, 20)}...
          </p>
        </div>

        <div className={`p-4 rounded-lg border ${
          verificationToken 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
            : 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800'
        }`}>
          <div className={`flex items-center gap-2 ${
            verificationToken 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-gray-600 dark:text-gray-400'
          }`}>
            <CheckCircle size={16} />
            <span className="text-sm font-medium">Token</span>
          </div>
          <p className={`text-xs mt-1 ${
            verificationToken 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-gray-600 dark:text-gray-400'
          }`}>
            {verificationToken ? 'Received' : 'Pending'}
          </p>
        </div>
      </div>

      {/* Demo Form Data */}
      <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
          Demo Form Data
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Age
            </label>
            <input
              type="number"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            />
          </div>
        </div>
      </div>

      {/* Turnstile Widget */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Security Verification
        </h3>
        <TurnstileWidget
          siteKey={siteKey}
          onVerify={handleTurnstileVerify}
          onError={handleTurnstileError}
          demoMode={isDemoMode}
          className="mb-4"
        />
        
        {verificationToken && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-700 dark:text-green-300">
              ✅ Token received: {verificationToken.substring(0, 30)}...
            </p>
          </div>
        )}
      </div>

      {/* Testing Buttons */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Test Integration
        </h3>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={testTokenVerification}
            disabled={!verificationToken || isVerifying}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isVerifying ? 'Testing...' : 'Test Token Verification'}
          </button>
          <button
            onClick={testSignupValidation}
            disabled={!verificationToken || isVerifying}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isVerifying ? 'Testing...' : 'Test Signup Validation'}
          </button>
        </div>
      </div>

      {/* Results */}
      {verificationResult && (
        <div className={`p-4 rounded-lg border ${
          verificationResult.success
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <div className={`flex items-center gap-2 mb-2 ${
            verificationResult.success
              ? 'text-green-700 dark:text-green-300'
              : 'text-red-700 dark:text-red-300'
          }`}>
            {verificationResult.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span className="font-medium">
              {verificationResult.success ? 'Verification Successful' : 'Verification Failed'}
            </span>
          </div>
          <p className={`text-sm ${
            verificationResult.success
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}>
            {verificationResult.message}
          </p>
          {verificationResult.score && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Confidence Score: {(verificationResult.score * 100).toFixed(1)}%
            </p>
          )}
          <details className="mt-2">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
              View Full Response
            </summary>
            <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded mt-2 overflow-x-auto">
              {JSON.stringify(verificationResult, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {/* Integration Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-3">
          🚀 Integration Instructions
        </h3>
        <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
          <p>
            <strong>1. Import the components:</strong>
          </p>
          <code className="block bg-blue-100 dark:bg-blue-900 p-2 rounded text-xs">
            {`import TurnstileWidget from './ui/TurnstileWidget';
import { useTurnstile } from '../services/turnstileService';`}
          </code>
          
          <p className="pt-2">
            <strong>2. Use in your form:</strong>
          </p>
          <code className="block bg-blue-100 dark:bg-blue-900 p-2 rounded text-xs">
            {`const { siteKey, isDemoMode } = useTurnstile();

<TurnstileWidget
  siteKey={siteKey}
  onVerify={handleTurnstileVerify}
  onError={handleTurnstileError}
  demoMode={isDemoMode}
/>`}
          </code>
        </div>
      </div>
    </div>
  );
};

export default TurnstileDemoExample;