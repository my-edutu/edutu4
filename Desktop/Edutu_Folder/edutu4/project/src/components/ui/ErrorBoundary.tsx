import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from './Button';
import Card from './Card';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} retry={this.handleRetry} />;
      }

      return (
        <DefaultErrorFallback 
          error={this.state.error!} 
          retry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error;
  retry: () => void;
  title?: string;
  message?: string;
}

export const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  retry, 
  title = "Something went wrong",
  message = "We encountered an unexpected error. Please try again."
}) => (
  <Card className="max-w-md mx-auto mt-8 text-center">
    <div className="p-6">
      <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-300 mb-4">
        {message}
      </p>
      <details className="mb-4 text-left">
        <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400">
          Technical Details
        </summary>
        <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto">
          {error.message}
        </pre>
      </details>
      <div className="flex gap-2 justify-center">
        <Button onClick={() => window.location.reload()} variant="outline" className="inline-flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh Page
        </Button>
        <Button onClick={retry} className="inline-flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    </div>
  </Card>
);

export const ApiErrorFallback: React.FC<ErrorFallbackProps> = ({ error, retry }) => (
  <DefaultErrorFallback
    error={error}
    retry={retry}
    title="Connection Error"
    message="Unable to connect to our servers. Please check your internet connection and try again."
  />
);

export const LoadingErrorFallback: React.FC<ErrorFallbackProps> = ({ error, retry }) => (
  <DefaultErrorFallback
    error={error}
    retry={retry}
    title="Loading Failed"
    message="We couldn't load the content you requested. Please try again."
  />
);

export default ErrorBoundary;