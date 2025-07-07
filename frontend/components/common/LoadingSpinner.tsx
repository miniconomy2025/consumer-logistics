// Loading Spinner and Skeleton Components

"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ============================================================================
// LOADING SPINNER
// ============================================================================

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-slate-300 border-t-slate-600',
        sizeClasses[size],
        className
      )}
    />
  );
}

// ============================================================================
// SKELETON COMPONENTS
// ============================================================================

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-slate-200',
        className
      )}
    />
  );
}

// Card skeleton
export function CardSkeleton({ className }: SkeletonProps) {
  return (
    <Card className={cn('border-slate-200 shadow-sm', className)}>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-24 w-full" />
      </CardContent>
    </Card>
  );
}

// KPI card skeleton
export function KPICardSkeleton() {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <Skeleton className="h-4 w-12 mt-2" />
      </CardContent>
    </Card>
  );
}

// Table skeleton
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Chart skeleton
export function ChartSkeleton({ height = 'h-64' }: { height?: string }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className={cn('w-full', height)} />
      </CardContent>
    </Card>
  );
}

// ============================================================================
// LOADING STATES
// ============================================================================

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingState({ 
  message = 'Loading...', 
  size = 'md', 
  className 
}: LoadingStateProps) {
  return (
    <div className={cn('flex items-center justify-center p-8', className)}>
      <div className="text-center space-y-3">
        <LoadingSpinner size={size} className="mx-auto" />
        <p className="text-sm text-slate-600">{message}</p>
      </div>
    </div>
  );
}

// Full page loading
export function FullPageLoading({ message = 'Loading dashboard...' }: { message?: string }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" className="mx-auto" />
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Please wait</h2>
          <p className="text-sm text-slate-600">{message}</p>
        </div>
      </div>
    </div>
  );
}

// Inline loading for buttons
export function ButtonLoading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <LoadingSpinner size="sm" />
      {children}
    </div>
  );
}

// ============================================================================
// DASHBOARD SKELETONS
// ============================================================================

export function DashboardKPISkeleton() {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <KPICardSkeleton key={i} />
      ))}
    </section>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header skeleton */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
        </header>

        {/* KPI Cards skeleton */}
        <DashboardKPISkeleton />

        {/* Main content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ChartSkeleton />
          </div>
          <div className="lg:col-span-1">
            <CardSkeleton />
          </div>
        </div>

        {/* Recent activity skeleton */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// LOADING WRAPPER
// ============================================================================

interface LoadingWrapperProps {
  loading: boolean;
  error?: string | null;
  children: React.ReactNode;
  skeleton?: React.ReactNode;
  onRetry?: () => void;
}

export function LoadingWrapper({ 
  loading, 
  error, 
  children, 
  skeleton,
  onRetry 
}: LoadingWrapperProps) {
  if (loading) {
    return skeleton || <LoadingState />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-center border border-red-200 bg-red-50 rounded-lg">
        <div className="space-y-3">
          <p className="text-sm text-red-600">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
