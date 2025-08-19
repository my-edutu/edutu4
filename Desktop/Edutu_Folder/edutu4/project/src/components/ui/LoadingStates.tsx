import React from 'react';
import { Loader2, Wifi, AlertTriangle } from 'lucide-react';
import Card from './Card';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  text,
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`} role="status" aria-live="polite">
      <Loader2 className={`animate-spin ${sizeClasses[size]} text-primary`} aria-hidden="true" />
      {text && <span className="text-sm text-secondary">{text}</span>}
      <span className="sr-only">{text || 'Loading...'}</span>
    </div>
  );
};

interface SkeletonProps {
  className?: string;
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`skeleton bg-gray-200 dark:bg-gray-700 rounded ${className}`}
          role="presentation"
          aria-hidden="true"
        />
      ))}
    </>
  );
};

export const OpportunityCardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden" role="presentation" aria-hidden="true">
    <div className="animate-pulse">
      {/* Image skeleton */}
      <div className="h-32 bg-gray-200 dark:bg-gray-700" />
      
      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        {/* AI Badge skeleton */}
        <div className="flex justify-end">
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        
        {/* Title */}
        <Skeleton className="h-5 w-3/4" />
        
        {/* Provider */}
        <Skeleton className="h-4 w-1/2" />
        
        {/* Category badge */}
        <Skeleton className="h-6 w-20 rounded-full" />
        
        {/* Description */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
        
        {/* Meta info */}
        <div className="flex justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
        </div>
        
        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-9 flex-1 rounded-lg" />
          <Skeleton className="h-9 flex-1 rounded-lg" />
        </div>
      </div>
    </div>
  </div>
);

export const ChatMessageSkeleton: React.FC = () => (
  <div className="flex items-start gap-3 p-4">
    <Skeleton className="h-8 w-8 rounded-full" />
    <div className="flex-1">
      <Skeleton className="h-4 w-1/4 mb-2" />
      <Skeleton className="h-3 w-full mb-1" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  </div>
);

export const RoadmapSkeleton: React.FC = () => (
  <div className="space-y-4">
    <Skeleton className="h-6 w-1/2 mb-4" />
    {Array.from({ length: 3 }).map((_, index) => (
      <Card key={index} className="p-4">
        <div className="animate-pulse">
          <Skeleton className="h-5 w-1/3 mb-3" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
      </Card>
    ))}
  </div>
);

interface LoadingPageProps {
  title?: string;
  message?: string;
  type?: 'spinner' | 'skeleton';
}

export const LoadingPage: React.FC<LoadingPageProps> = ({ 
  title = "Loading...",
  message = "Please wait while we fetch your data",
  type = 'spinner'
}) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
    {type === 'spinner' ? (
      <LoadingSpinner size="lg" />
    ) : (
      <div className="w-full max-w-md">
        <Skeleton className="h-8 w-3/4 mx-auto mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-5/6 mx-auto" />
      </div>
    )}
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-4 mb-2">
      {title}
    </h3>
    <p className="text-gray-600 dark:text-gray-300 text-center">
      {message}
    </p>
  </div>
);

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon,
  title,
  message,
  action
}) => (
  <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
    {icon && (
      <div className="mb-4 text-gray-400 dark:text-gray-500">
        {icon}
      </div>
    )}
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
      {title}
    </h3>
    <p className="text-gray-600 dark:text-gray-300 mb-4 max-w-sm">
      {message}
    </p>
    {action && (
      <button
        onClick={action.onClick}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        {action.label}
      </button>
    )}
  </div>
);

interface ApiStatusProps {
  isOnline: boolean;
  lastSync?: Date;
}

export const ApiStatus: React.FC<ApiStatusProps> = ({ isOnline, lastSync }) => (
  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
    <Wifi className={`h-3 w-3 ${isOnline ? 'text-green-500' : 'text-red-500'}`} />
    <span>
      {isOnline ? 'Connected' : 'Offline'}
      {lastSync && ` • Last sync: ${lastSync.toLocaleTimeString()}`}
    </span>
  </div>
);

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  type?: 'network' | 'auth' | 'server' | 'generic';
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  message,
  onRetry,
  type = 'generic'
}) => {
  const getErrorContent = () => {
    switch (type) {
      case 'network':
        return {
          title: title || 'Connection Error',
          message: message || 'Please check your internet connection and try again.',
          icon: <Wifi className="h-12 w-12" />
        };
      case 'auth':
        return {
          title: title || 'Authentication Required',
          message: message || 'Please sign in to continue.',
          icon: <AlertTriangle className="h-12 w-12" />
        };
      case 'server':
        return {
          title: title || 'Server Error',
          message: message || 'Our servers are experiencing issues. Please try again later.',
          icon: <AlertTriangle className="h-12 w-12" />
        };
      default:
        return {
          title: title || 'Something went wrong',
          message: message || 'An unexpected error occurred.',
          icon: <AlertTriangle className="h-12 w-12" />
        };
    }
  };

  const errorContent = getErrorContent();

  return (
    <EmptyState
      icon={errorContent.icon}
      title={errorContent.title}
      message={errorContent.message}
      action={onRetry ? { label: 'Try Again', onClick: onRetry } : undefined}
    />
  );
};