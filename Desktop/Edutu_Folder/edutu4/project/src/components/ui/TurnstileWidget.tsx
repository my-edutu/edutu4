import React, { useRef, useEffect, useState } from 'react';
import { Shield, RefreshCw, AlertCircle } from 'lucide-react';

declare global {
  interface Window {
    turnstile: {
      ready: (callback: () => void) => void;
      render: (element: string | HTMLElement, options: TurnstileOptions) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
      getResponse: (widgetId?: string) => string;
    };
    turnstileLoad?: () => void;
  }
}

interface TurnstileOptions {
  sitekey: string;
  callback?: (token: string) => void;
  'error-callback'?: (error: string) => void;
  'expired-callback'?: () => void;
  'timeout-callback'?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact';
  language?: string;
  appearance?: 'always' | 'execute' | 'interaction-only';
  retry?: 'auto' | 'never';
  'retry-interval'?: number;
  'refresh-expired'?: 'auto' | 'manual' | 'never';
  action?: string;
  cdata?: string;
}

interface TurnstileWidgetProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onError?: (error: string) => void;
  onExpired?: () => void;
  onTimeout?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact';
  className?: string;
  disabled?: boolean;
  action?: string;
  cdata?: string;
  demoMode?: boolean;
}

const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({
  siteKey,
  onVerify,
  onError,
  onExpired,
  onTimeout,
  theme = 'auto',
  size = 'normal',
  className = '',
  disabled = false,
  action,
  cdata,
  demoMode = import.meta.env.VITE_TURNSTILE_DEMO_MODE === 'true'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [widgetId, setWidgetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  // Load Turnstile script
  useEffect(() => {
    const loadTurnstileScript = () => {
      if (window.turnstile || document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')) {
        setIsScriptLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      // Remove async/defer when using turnstile.ready() as per Cloudflare docs
      
      script.onload = () => {
        console.log('Turnstile script loaded successfully');
        setIsScriptLoaded(true);
      };

      script.onerror = () => {
        console.error('Failed to load Cloudflare Turnstile script');
        setHasError(true);
        setIsLoading(false);
      };

      document.head.appendChild(script);
    };

    loadTurnstileScript();
  }, []);

  // Initialize Turnstile widget
  useEffect(() => {
    if (!isScriptLoaded || !containerRef.current || disabled) return;

    // Demo mode: simulate successful verification
    if (demoMode) {
      setIsLoading(false);
      setHasError(false);
      return;
    }

    const initializeWidget = () => {
      if (!window.turnstile) {
        console.error('Turnstile not available');
        setHasError(true);
        setIsLoading(false);
        return;
      }

      try {
        const options: TurnstileOptions = {
          sitekey: siteKey,
          callback: (token: string) => {
            setIsLoading(false);
            setHasError(false);
            onVerify(token);
          },
          'error-callback': (error: string) => {
            console.error('Turnstile error:', error);
            setHasError(true);
            setIsLoading(false);
            if (onError) {
              onError(error);
            }
          },
          'expired-callback': () => {
            setHasError(false);
            if (onExpired) {
              onExpired();
            }
          },
          'timeout-callback': () => {
            setHasError(true);
            setIsLoading(false);
            if (onTimeout) {
              onTimeout();
            }
          },
          theme,
          size,
          appearance: 'always',
          retry: 'auto',
          'retry-interval': 8000,
          'refresh-expired': 'auto'
        };

        if (action) options.action = action;
        if (cdata) options.cdata = cdata;

        const id = window.turnstile.render(containerRef.current, options);
        setWidgetId(id);
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing Turnstile widget:', error);
        setHasError(true);
        setIsLoading(false);
      }
    };

    // Since we're loading the script synchronously (without async/defer),
    // we can directly initialize the widget once the script is loaded
    if (window.turnstile) {
      initializeWidget();
    } else {
      // Fallback: wait a bit for the script to be available
      const checkTurnstile = () => {
        if (window.turnstile) {
          initializeWidget();
        } else {
          setTimeout(checkTurnstile, 100);
        }
      };
      checkTurnstile();
    }

    // Cleanup function
    return () => {
      if (widgetId && window.turnstile?.remove) {
        try {
          window.turnstile.remove(widgetId);
        } catch (error) {
          console.error('Error removing Turnstile widget:', error);
        }
      }
    };
  }, [isScriptLoaded, siteKey, theme, size, disabled, action, cdata, onVerify, onError, onExpired, onTimeout]);

  const handleRefresh = () => {
    if (demoMode) {
      setIsLoading(false);
      setHasError(false);
      return;
    }

    if (widgetId && window.turnstile?.reset) {
      setIsLoading(true);
      setHasError(false);
      try {
        window.turnstile.reset(widgetId);
      } catch (error) {
        console.error('Error resetting Turnstile widget:', error);
        setHasError(true);
        setIsLoading(false);
      }
    }
  };

  // Demo mode verification handler
  const handleDemoVerification = () => {
    if (!demoMode) return;
    
    setIsLoading(true);
    
    // Simulate verification delay
    setTimeout(() => {
      const demoToken = `demo_token_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      setIsLoading(false);
      setHasError(false);
      onVerify(demoToken);
    }, 1500); // 1.5 second delay to simulate real verification
  };

  const getToken = (): string | null => {
    if (widgetId && window.turnstile?.getResponse) {
      try {
        return window.turnstile.getResponse(widgetId);
      } catch (error) {
        console.error('Error getting Turnstile response:', error);
        return null;
      }
    }
    return null;
  };

  // Expose getToken method to parent components
  React.useImperativeHandle(containerRef, () => ({
    getToken,
    refresh: handleRefresh,
    reset: handleRefresh
  }));

  if (disabled) {
    return (
      <div className={`flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 ${className}`}>
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Shield size={16} />
          <span className="text-sm">Security verification disabled</span>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={`flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 ${className}`}>
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle size={16} />
          <span className="text-sm">Security verification failed</span>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium transition-colors"
          type="button"
        >
          <RefreshCw size={12} />
          Retry
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 ${className}`}>
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600"></div>
          <span className="text-sm">Loading security verification...</span>
        </div>
      </div>
    );
  }

  // Demo mode UI
  if (demoMode) {
    return (
      <div className={`turnstile-demo-container ${className}`}>
        <div className="flex flex-col items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Shield size={16} />
            <span className="text-sm font-medium">Demo Security Verification</span>
          </div>
          <button
            onClick={handleDemoVerification}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
            type="button"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Verifying...
              </div>
            ) : (
              'Complete Demo Verification'
            )}
          </button>
          <p className="text-xs text-blue-600 dark:text-blue-400 text-center">
            Demo mode active - Click button to simulate CAPTCHA verification
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`turnstile-container ${className}`}>
      <div ref={containerRef} className="flex justify-center" />
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
        This site is protected by Cloudflare Turnstile for security.
      </p>
    </div>
  );
};

export default TurnstileWidget;
export type { TurnstileWidgetProps };