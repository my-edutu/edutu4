/**
 * Enhanced Loading States and Error Handling Components
 * Comprehensive loading, error, and empty state components with responsive design
 */

import React, { ReactNode } from 'react';
import { 
  Loader2, 
  Wifi, 
  AlertTriangle, 
  RefreshCw, 
  Search, 
  Inbox,
  WifiOff,
  ServerCrash,
  FileX,
  ChevronRight
} from 'lucide-react';
import { cn, commonPatterns, responsivePatterns, darkModeUtils } from '../../utils/responsive';
import { Button, Card, Alert } from './StandardizedComponents';

// ===== LOADING SPINNER =====
interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  className?: string;
  variant?: 'default' | 'dots' | 'pulse' | 'bounce';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  text,
  className,
  variant = 'default'
}) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const textSizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  const renderSpinner = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  'rounded-full bg-current animate-pulse',
                  sizeClasses[size]
                )}
                style={{
                  animationDelay: `${i * 0.15}s`,
                  animationDuration: '1s'
                }}
              />
            ))}
          </div>
        );
      
      case 'pulse':
        return (
          <div
            className={cn(
              'rounded-full bg-current animate-pulse',
              sizeClasses[size]
            )}
          />
        );
      
      case 'bounce':
        return (
          <div
            className={cn(
              'rounded-full bg-current animate-bounce',
              sizeClasses[size]
            )}
          />
        );
      
      default:
        return (
          <Loader2 className={cn('animate-spin', sizeClasses[size])} />
        );
    }
  };

  return (
    <div className={cn(
      'flex flex-col items-center justify-center gap-3',
      className
    )}>
      <div className="text-primary">
        {renderSpinner()}
      </div>
      {text && (
        <span className={cn(
          'font-medium text-center',
          textSizeClasses[size],
          darkModeUtils.text.secondary
        )}>
          {text}
        </span>
      )}
    </div>
  );
};

// ===== SKELETON COMPONENTS =====
interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className,
  width = 'w-full',
  height = 'h-4',
  rounded = 'md',
  animate = true
}) => {
  const roundedClasses = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full'
  };

  return (
    <div
      className={cn(
        'bg-gray-200 dark:bg-gray-700',
        animate && 'animate-pulse',
        width,
        height,
        roundedClasses[rounded],
        className
      )}
    />
  );
};

// ===== CARD SKELETONS =====
export const OpportunityCardSkeleton: React.FC = () => (
  <Card className="h-full">
    <div className="space-y-4">
      {/* Image skeleton */}
      <Skeleton height="h-32" rounded="lg" />
      
      {/* Title skeleton */}
      <div className="space-y-2">
        <Skeleton height="h-5" width="w-3/4" />
        <Skeleton height="h-4" width="w-1/2" />
      </div>
      
      {/* Description skeleton */}
      <div className="space-y-2">
        <Skeleton height="h-3" />
        <Skeleton height="h-3" />
        <Skeleton height="h-3" width="w-2/3" />
      </div>
      
      {/* Footer skeleton */}
      <div className="flex justify-between items-center">
        <Skeleton height="h-3" width="w-20" />
        <Skeleton height="h-3" width="w-16" />
      </div>
    </div>
  </Card>
);

export const UserCardSkeleton: React.FC = () => (
  <Card className="h-full">
    <div className="flex items-center space-x-4">
      <Skeleton width="w-12" height="h-12" rounded="full" />
      <div className="flex-1 space-y-2">
        <Skeleton height="h-4" width="w-3/4" />
        <Skeleton height="h-3" width="w-1/2" />
      </div>
    </div>
  </Card>
);

export const ChatMessageSkeleton: React.FC = () => (
  <div className="space-y-4">
    {/* User message */}
    <div className="flex justify-end">
      <div className="max-w-xs">
        <Skeleton height="h-10" width="w-32" rounded="lg" />
      </div>
    </div>
    
    {/* AI response */}
    <div className="flex justify-start">
      <div className="max-w-md space-y-2">
        <Skeleton height="h-4" width="w-48" />
        <Skeleton height="h-4" width="w-40" />
        <Skeleton height="h-4" width="w-32" />
      </div>
    </div>
  </div>
);

// ===== ERROR STATES =====
interface ErrorStateProps {
  title?: string;
  description?: string;
  error?: Error | string;
  onRetry?: () => void;
  onBack?: () => void;
  actionLabel?: string;
  variant?: 'network' | 'server' | 'notFound' | 'permission' | 'generic';
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  description,
  error,
  onRetry,
  onBack,
  actionLabel = 'Try Again',
  variant = 'generic',
  className
}) => {
  const getVariantConfig = () => {
    switch (variant) {
      case 'network':
        return {
          icon: <WifiOff className="w-12 h-12 text-gray-400" />,
          defaultTitle: 'Connection Problem',
          defaultDescription: 'Please check your internet connection and try again.',
          actionIcon: <RefreshCw className="w-4 h-4" />
        };
      
      case 'server':
        return {
          icon: <ServerCrash className="w-12 h-12 text-gray-400" />,
          defaultTitle: 'Server Error',
          defaultDescription: 'Something went wrong on our end. Please try again later.',
          actionIcon: <RefreshCw className="w-4 h-4" />
        };
      
      case 'notFound':
        return {
          icon: <FileX className="w-12 h-12 text-gray-400" />,
          defaultTitle: 'Not Found',
          defaultDescription: 'The content you\'re looking for doesn\'t exist or has been moved.',
          actionIcon: <ChevronRight className="w-4 h-4" />
        };
      
      case 'permission':
        return {
          icon: <AlertTriangle className="w-12 h-12 text-yellow-500" />,
          defaultTitle: 'Access Denied',
          defaultDescription: 'You don\'t have permission to access this content.',
          actionIcon: <ChevronRight className="w-4 h-4" />
        };
      
      default:
        return {
          icon: <AlertTriangle className="w-12 h-12 text-gray-400" />,
          defaultTitle: 'Something went wrong',
          defaultDescription: 'An unexpected error occurred. Please try again.',
          actionIcon: <RefreshCw className="w-4 h-4" />
        };
    }
  };

  const config = getVariantConfig();

  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center py-12 px-6',
      className
    )}>
      <div className="mb-6">
        {config.icon}
      </div>
      
      <h3 className={cn(
        'text-lg font-semibold mb-2',
        darkModeUtils.text.primary
      )}>
        {title || config.defaultTitle}
      </h3>
      
      <p className={cn(
        'text-sm mb-6 max-w-md',
        darkModeUtils.text.secondary
      )}>
        {description || config.defaultDescription}
      </p>
      
      {error && typeof error === 'string' && (
        <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200 font-mono">
            {error}
          </p>
        </div>
      )}
      
      <div className="flex gap-3">
        {onRetry && (
          <Button
            onClick={onRetry}
            leftIcon={config.actionIcon}
            variant="primary"
          >
            {actionLabel}
          </Button>
        )}
        
        {onBack && (
          <Button
            onClick={onBack}
            variant="outline"
          >
            Go Back
          </Button>
        )}
      </div>
    </div>
  );
};

// ===== EMPTY STATES =====
interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  illustration?: ReactNode;
  variant?: 'search' | 'inbox' | 'data' | 'generic';
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  illustration,
  variant = 'generic',
  className
}) => {
  const getVariantConfig = () => {
    switch (variant) {
      case 'search':
        return {
          icon: <Search className="w-12 h-12 text-gray-300" />,
          defaultTitle: 'No results found',
          defaultDescription: 'Try adjusting your search terms or filters.'
        };
      
      case 'inbox':
        return {
          icon: <Inbox className="w-12 h-12 text-gray-300" />,
          defaultTitle: 'No messages yet',
          defaultDescription: 'When you receive messages, they\'ll appear here.'
        };
      
      case 'data':
        return {
          icon: <FileX className="w-12 h-12 text-gray-300" />,
          defaultTitle: 'No data available',
          defaultDescription: 'There\'s no data to display at the moment.'
        };
      
      default:
        return {
          icon: <Inbox className="w-12 h-12 text-gray-300" />,
          defaultTitle: 'Nothing here yet',
          defaultDescription: 'Content will appear here when available.'
        };
    }
  };

  const config = getVariantConfig();

  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center py-12 px-6',
      className
    )}>
      <div className="mb-6">
        {illustration || config.icon}
      </div>
      
      <h3 className={cn(
        'text-lg font-semibold mb-2',
        darkModeUtils.text.primary
      )}>
        {title || config.defaultTitle}
      </h3>
      
      <p className={cn(
        'text-sm mb-6 max-w-md',
        darkModeUtils.text.secondary
      )}>
        {description || config.defaultDescription}
      </p>
      
      {action && (
        <Button
          onClick={action.onClick}
          leftIcon={action.icon}
          variant="primary"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};

// ===== LOADING OVERLAY =====
interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  variant?: 'transparent' | 'blur' | 'solid';
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message = 'Loading...',
  variant = 'blur',
  className
}) => {
  if (!isVisible) return null;

  const variantClasses = {
    transparent: 'bg-white/70 dark:bg-gray-900/70',
    blur: 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm',
    solid: 'bg-white dark:bg-gray-900'
  };

  return (
    <div className={cn(
      'fixed inset-0 z-50 flex items-center justify-center',
      variantClasses[variant],
      className
    )}>
      <Card className="p-8 shadow-lg max-w-sm mx-4">
        <LoadingSpinner size="lg" text={message} />
      </Card>
    </div>
  );
};

// ===== PROGRESS BAR =====
interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  label,
  showPercentage = true,
  size = 'md',
  variant = 'default',
  className
}) => {
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const variantClasses = {
    default: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500'
  };

  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className={cn('text-sm font-medium', darkModeUtils.text.primary)}>
              {label}
            </span>
          )}
          {showPercentage && (
            <span className={cn('text-sm', darkModeUtils.text.secondary)}>
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
      )}
      
      <div className={cn(
        'w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden',
        sizeClasses[size]
      )}>
        <div
          className={cn(
            'h-full transition-all duration-300 ease-out rounded-full',
            variantClasses[variant]
          )}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
};

// Export all components
export {
  OpportunityCardSkeleton,
  UserCardSkeleton,
  ChatMessageSkeleton,
  ErrorState,
  EmptyState,
  LoadingOverlay,
  ProgressBar
};