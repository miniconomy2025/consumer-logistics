"use client"

import { Component, ReactNode } from "react"
import { AlertTriangle } from "lucide-react"

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  resetOnPropsChange?: boolean
  resetKeys?: Array<string | number>
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorId: string
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorId: '' }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorId: `error`
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Log error details for debugging
    console.group(`🚨 Error Boundary Caught Error [${this.state.errorId}]`)
    console.groupEnd()
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    const { resetKeys, resetOnPropsChange } = this.props
    const { hasError } = this.state

    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys?.some((key, idx) => prevProps.resetKeys?.[idx] !== key)) {
        this.resetErrorBoundary()
      }
    }

    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary()
    }
  }

  resetErrorBoundary = (): void => {
    this.setState({ hasError: false, error: null, errorId: '' })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const isApiError = this.state.error?.name === 'ApiError' ||
                        this.state.error?.message.includes('fetch') ||
                        this.state.error?.message.includes('API') ||
                        this.state.error?.message.includes('network')

      return (
        <div className="flex flex-col items-center justify-center p-6 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="h-10 w-10 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2 text-red-800">
            {isApiError ? 'Connection Error' : 'Something went wrong'}
          </h2>
          <p className="text-sm text-red-600 mb-4 text-center max-w-md">
            {isApiError
              ? 'Unable to connect to the server. Please check your connection and try again.'
              : this.state.error?.message || "An unexpected error occurred"
            }
          </p>

          {process.env.NODE_ENV === 'development' && (
            <details className="mb-4 w-full">
              <summary className="text-xs text-red-500 cursor-pointer hover:text-red-700">
                Error Details (Development)
              </summary>
              <div className="mt-2 p-3 bg-red-100 rounded text-xs font-mono text-red-800 overflow-auto max-h-32">
                <div><strong>Error ID:</strong> {this.state.errorId}</div>
                <div><strong>Message:</strong> {this.state.error?.message}</div>
                <div><strong>Stack:</strong></div>
                <pre className="whitespace-pre-wrap text-xs">{this.state.error?.stack}</pre>
              </div>
            </details>
          )}

          <div className="flex gap-2">
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              onClick={this.resetErrorBoundary}
            >
              Try again
            </button>
            <button
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}