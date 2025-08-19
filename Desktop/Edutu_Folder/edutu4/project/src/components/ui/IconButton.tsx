import React from 'react';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  loading?: boolean;
  tooltip?: string;
}

const IconButton: React.FC<IconButtonProps> = ({ 
  variant = 'ghost', 
  size = 'md', 
  children, 
  className = '', 
  loading = false,
  disabled,
  tooltip,
  ...props 
}) => {
  // Base classes for icon-only buttons
  const baseClasses = `
    inline-flex items-center justify-center font-medium rounded-xl
    transition-all duration-200 transform
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-opacity-50
    touch-manipulation select-none
    hover:shadow-md active:scale-95
    aspect-square
  `.replace(/\s+/g, ' ').trim();
  
  // Variant styles optimized for icon buttons
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
    ghost: `
      bg-transparent text-gray-600 dark:text-gray-400
      hover:bg-gray-100 dark:hover:bg-gray-800 hover:scale-105
      focus:ring-gray-500
    `,
    danger: `
      bg-transparent text-red-600 dark:text-red-400
      hover:bg-red-50 dark:hover:bg-red-900/20 hover:scale-105
      focus:ring-red-500
    `
  };
  
  // Size classes for square icon buttons
  const sizeClasses = {
    xs: 'w-8 h-8 text-xs',
    sm: 'w-9 h-9 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg'
  };

  const isDisabled = disabled || loading;
  const cleanVariantClass = variantClasses[variant].replace(/\s+/g, ' ').trim();

  return (
    <button
      className={`${baseClasses} ${cleanVariantClass} ${sizeClasses[size]} ${className}`}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      title={tooltip}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin h-4/6 w-4/6 text-current"
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
      ) : (
        <span className="flex items-center justify-center" aria-hidden="true">
          {children}
        </span>
      )}
    </button>
  );
};

export default IconButton;