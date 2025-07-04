// Error Boundary Component for React Error Handling

"use client";

import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Something went wrong
            </CardTitle>
            <CardDescription className="text-red-600">
              An error occurred while rendering this component
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-red-700">
              <p className="font-medium">Error: {this.state.error?.message}</p>
              {process.env.NODE_ENV === 'development' && this.state.error?.stack && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-red-600 hover:text-red-800">
                    Show error details
                  </summary>
                  <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto max-h-40">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Hook-based error boundary for functional components
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    console.error('Error captured:', error);
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
}

// Simple error fallback component
export function ErrorFallback({ 
  error, 
  resetError 
}: { 
  error: Error; 
  resetError: () => void; 
}) {
  return (
    <div className="flex items-center justify-center p-8 text-center border border-red-200 bg-red-50 rounded-lg">
      <div className="space-y-4">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
        <div>
          <h3 className="text-lg font-semibold text-red-700">Oops! Something went wrong</h3>
          <p className="text-sm text-red-600 mt-1">{error.message}</p>
        </div>
        <button
          onClick={resetError}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

// Async error boundary for handling async errors
export function AsyncErrorBoundary({ 
  children, 
  onError 
}: { 
  children: ReactNode; 
  onError?: (error: Error) => void; 
}) {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = new Error(event.reason);
      setError(error);
      if (onError) {
        onError(error);
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [onError]);

  if (error) {
    return <ErrorFallback error={error} resetError={resetError} />;
  }

  return <>{children}</>;
}

// Component wrapper for easier error boundary usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}
