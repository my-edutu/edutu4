import React, { useState } from 'react';
import CookieUtils from '../utils/cookieUtils';

interface CookieSettingsButtonProps {
  onOpenSettings?: () => void;
  className?: string;
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
}

const CookieSettingsButton: React.FC<CookieSettingsButtonProps> = ({
  onOpenSettings,
  className = '',
  position = 'bottom-right'
}) => {
  const [isVisible, setIsVisible] = useState(() => {
    // Only show if user has given consent (otherwise banner will be showing)
    const { hasConsent } = CookieUtils.getConsentStatus();
    return hasConsent;
  });

  const [isHovered, setIsHovered] = useState(false);

  if (!isVisible) return null;

  const positionClasses = {
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
  };

  const handleClick = () => {
    if (onOpenSettings) {
      onOpenSettings();
    } else {
      // Default behavior: show cookie banner again
      localStorage.removeItem('cookie_consent');
      localStorage.removeItem('cookie_consent_state');
      window.location.reload();
    }
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed z-40 btn-touch group
                 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700
                 border border-gray-200 dark:border-gray-600
                 shadow-lg hover:shadow-xl
                 rounded-full p-3
                 transition-all duration-300 ease-out transform hover:scale-110
                 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                 dark:focus:ring-offset-gray-900 no-tap-highlight
                 ${positionClasses[position]} ${className}`}
      aria-label="Cookie settings"
      title="Manage cookie preferences"
    >
      {/* Cookie Icon */}
      <div className="relative">
        <svg 
          className="w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-200" 
          fill="currentColor" 
          viewBox="0 0 24 24"
        >
          {/* Cookie shape */}
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          {/* Cookie crumbs */}
          <circle cx="8.5" cy="8.5" r="0.8" opacity="0.6"/>
          <circle cx="15.5" cy="10.5" r="0.6" opacity="0.8"/>
          <circle cx="10" cy="14" r="0.7" opacity="0.7"/>
          <circle cx="14" cy="16" r="0.5" opacity="0.6"/>
        </svg>
        
        {/* Notification dot for settings changes */}
        <div className={`absolute -top-1 -right-1 w-2 h-2 bg-primary-500 rounded-full transition-all duration-200
                        ${isHovered ? 'scale-110' : 'scale-100'}`}
             aria-hidden="true" />
      </div>

      {/* Tooltip */}
      <div className={`absolute ${position.includes('right') ? 'right-full mr-3' : 'left-full ml-3'}
                      ${position.includes('top') ? 'top-0' : 'bottom-0'}
                      px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-md
                      whitespace-nowrap pointer-events-none transition-all duration-200
                      ${isHovered ? 'opacity-100 visible translate-x-0' : 'opacity-0 invisible translate-x-2'}`}>
        Cookie Settings
        <div className={`absolute top-1/2 -translate-y-1/2 w-1 h-1 bg-gray-900 dark:bg-gray-700 rotate-45
                        ${position.includes('right') ? '-right-0.5' : '-left-0.5'}`} />
      </div>
    </button>
  );
};

export default CookieSettingsButton;