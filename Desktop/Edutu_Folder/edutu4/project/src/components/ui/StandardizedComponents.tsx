/**
 * Standardized UI Components for Edutu
 * Consistent design system components with responsive design and accessibility
 */

import React, { forwardRef, ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from 'react';
import { Loader2, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn, commonPatterns, responsivePatterns, darkModeUtils, a11yUtils, touchUtils } from '../../utils/responsive';

// ===== BUTTON COMPONENT =====
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}, ref) => {
  const baseClasses = cn(
    commonPatterns.buttonBase,
    'inline-flex items-center justify-center gap-2',
    fullWidth && 'w-full',
    disabled && 'opacity-50 cursor-not-allowed',
    isLoading && 'cursor-wait'
  );

  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-primary/90 active:bg-primary/80',
    secondary: cn(
      'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300',
      'dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 dark:active:bg-gray-500'
    ),
    outline: cn(
      'border-2 border-primary text-primary bg-transparent hover:bg-primary hover:text-white',
      'dark:border-primary dark:text-primary dark:hover:bg-primary dark:hover:text-white'
    ),
    ghost: cn(
      'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200',
      'dark:text-gray-300 dark:hover:bg-gray-800 dark:active:bg-gray-700'
    ),
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800'
  };

  const sizeClasses = {
    sm: responsivePatterns.sizes.button.sm,
    md: responsivePatterns.sizes.button.md,
    lg: responsivePatterns.sizes.button.lg
  };

  return (
    <button
      ref={ref}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : leftIcon ? (
        leftIcon
      ) : null}
      {children}
      {!isLoading && rightIcon && rightIcon}
    </button>
  );
});

Button.displayName = 'Button';

// ===== INPUT COMPONENT =====
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helper,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className,
  id,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={cn('space-y-2', fullWidth && 'w-full')}>
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            'block text-sm font-medium',
            darkModeUtils.text.primary
          )}
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {leftIcon}
          </div>
        )}
        
        <input
          ref={ref}
          id={inputId}
          className={cn(
            commonPatterns.inputBase,
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            'focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-50',
            className
          )}
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {rightIcon}
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </p>
      )}
      
      {helper && !error && (
        <p className={cn('text-sm', darkModeUtils.text.tertiary)}>
          {helper}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

// ===== CARD COMPONENT =====
interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  padding = 'md',
  shadow = 'sm',
  hover = false,
  onClick
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-3 sm:p-4',
    md: responsivePatterns.sizes.card.padding,
    lg: 'p-6 sm:p-8'
  };

  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg'
  };

  return (
    <div
      className={cn(
        'rounded-lg border transition-all duration-200',
        darkModeUtils.bg.primary,
        darkModeUtils.border.primary,
        paddingClasses[padding],
        shadowClasses[shadow],
        hover && 'hover:shadow-md hover:scale-[1.02]',
        onClick && 'cursor-pointer',
        onClick && touchUtils.tapTarget,
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

// ===== ALERT COMPONENT =====
interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  children: ReactNode;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  onClose,
  className
}) => {
  const variants = {
    info: {
      container: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200',
      icon: <Info className="w-5 h-5" />
    },
    success: {
      container: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200',
      icon: <CheckCircle2 className="w-5 h-5" />
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200',
      icon: <AlertTriangle className="w-5 h-5" />
    },
    danger: {
      container: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200',
      icon: <AlertTriangle className="w-5 h-5" />
    }
  };

  const variantConfig = variants[variant];

  return (
    <div
      className={cn(
        'border rounded-lg p-4',
        variantConfig.container,
        className
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {variantConfig.icon}
        </div>
        
        <div className="flex-1">
          {title && (
            <h4 className="font-medium mb-1">
              {title}
            </h4>
          )}
          <div className="text-sm">
            {children}
          </div>
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            aria-label="Close alert"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

// ===== MODAL COMPONENT =====
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  className
}) => {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Modal */}
      <div
        className={cn(
          'relative w-full rounded-lg shadow-lg',
          sizeClasses[size],
          darkModeUtils.bg.primary,
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className={cn(
            'flex items-center justify-between p-6 border-b',
            darkModeUtils.border.primary
          )}>
            <h2 className={cn(
              'text-lg font-semibold',
              darkModeUtils.text.primary
            )}>
              {title}
            </h2>
            <button
              onClick={onClose}
              className={cn(
                'p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
                touchUtils.tapTarget
              )}
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        
        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// ===== SKELETON COMPONENT =====
interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  rounded?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  width = 'w-full',
  height = 'h-4',
  rounded = false
}) => {
  return (
    <div
      className={cn(
        'animate-pulse bg-gray-200 dark:bg-gray-700',
        width,
        height,
        rounded ? 'rounded-full' : 'rounded',
        className
      )}
    />
  );
};

// ===== BADGE COMPONENT =====
interface BadgeProps {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  children: ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className
}) => {
  const variantClasses = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    secondary: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600',
    success: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800',
    danger: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {children}
    </span>
  );
};

// ===== TOOLTIP COMPONENT =====
interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  className
}) => {
  const [isVisible, setIsVisible] = React.useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={cn(
            'absolute z-50 px-2 py-1 text-sm text-white bg-gray-900 rounded shadow-lg whitespace-nowrap',
            'dark:bg-gray-700 dark:text-gray-200',
            positionClasses[position],
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
};

// Export all components
export {
  Button as StandardButton,
  Input as StandardInput,
  Card as StandardCard,
  Alert as StandardAlert,
  Modal as StandardModal,
  Skeleton as StandardSkeleton,
  Badge as StandardBadge,
  Tooltip as StandardTooltip
};