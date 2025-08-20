import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  loading?: boolean;
  icon?: LucideIcon | React.ComponentType<any> | React.ReactNode;
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  className = '', 
  loading = false,
  icon,
  fullWidth = false,
  disabled,
  ...props 
}) => {
  // Base classes for consistent design - horizontal layout with icon and text side by side
  const baseClasses = `
    inline-flex items-center justify-center font-medium rounded-xl 
    transition-all duration-200 transform
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-opacity-50
    touch-manipulation select-none
    hover:shadow-lg active:scale-[0.98]
    whitespace-nowrap min-w-fit
    gap-2
  `.replace(/\s+/g, ' ').trim();
  
  // Variant styles with consistent design language
  const variantClasses = {
    primary: `
      bg-gradient-to-r from-primary to-blue-600 text-white 
      hover:from-blue-600 hover:to-blue-700 hover:scale-105
      focus:ring-blue-500 shadow-sm
    `,
    secondary: `
      bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200
      border border-gray-300 dark:border-gray-600
      hover:bg-gray-50 dark:hover:bg-gray-700 hover:scale-105
      focus:ring-gray-500 shadow-sm
    `,
    outline: `
      bg-transparent border-2 border-primary text-primary
      hover:bg-primary hover:text-white hover:scale-105
      focus:ring-primary shadow-sm
    `,
    ghost: `
      bg-transparent text-gray-700 dark:text-gray-200
      hover:bg-gray-100 dark:hover:bg-gray-800 hover:scale-105
      focus:ring-gray-500
    `,
    danger: `
      bg-gradient-to-r from-red-500 to-red-600 text-white
      hover:from-red-600 hover:to-red-700 hover:scale-105
      focus:ring-red-500 shadow-sm
    `
  };
  
  // Size classes with consistent spacing and responsive design
  const sizeClasses = {
    xs: 'px-3 py-1.5 text-xs min-h-[32px]',
    sm: 'px-4 py-2 text-sm min-h-[36px]',
    md: 'px-5 py-2.5 text-sm md:text-base min-h-[40px] md:min-h-[44px]',
    lg: 'px-6 py-3 text-base min-h-[44px] md:min-h-[48px]',
    xl: 'px-8 py-4 text-lg min-h-[48px] md:min-h-[56px]'
  };

  const isDisabled = disabled || loading;
  const widthClass = fullWidth ? 'w-full' : '';

  // Clean up variant classes
  const cleanVariantClass = variantClasses[variant].replace(/\s+/g, ' ').trim();

  return (
    <button
      className={`${baseClasses} ${cleanVariantClass} ${sizeClasses[size]} ${widthClass} ${className}`}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      {...props}
    >
      {/* Loading spinner - always on the left */}
      {loading && (
        <svg
          className="animate-spin h-4 w-4 text-current flex-shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      
      {/* Icon on the left - only show if not loading */}
      {icon && !loading && (
        <span className="flex-shrink-0 h-4 w-4 flex items-center justify-center" aria-hidden="true">
          {React.isValidElement(icon) ? icon : 
           typeof icon === 'function' ? React.createElement(icon, { size: 16, className: "h-4 w-4" }) : 
           null}
        </span>
      )}
      
      {/* Button text on the right */}
      <span className={`${loading ? 'opacity-70' : ''} flex-shrink-0`}>
        {children}
      </span>
    </button>
  );
};

export default Button;

// Legacy component for backwards compatibility - will be removed
export const OldButton = Button;